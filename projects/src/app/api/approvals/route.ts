import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET(request: NextRequest) {
  const client = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  try {
    let query = client.from("approvals").select("*").order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);

    const { data, error } = await query.limit(100);
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const client = getSupabaseClient();
  try {
    const body = await request.json();
    const { data, error } = await client
      .from("approvals")
      .insert({
        title: body.title,
        app_id: body.app_id || null,
        scenario_key: body.scenario_key || null,
        form_data: body.form_data || {},
        status: "pending",
        current_step: 1,
        total_steps: body.total_steps || 1,
        applicant: body.applicant || "admin",
        approvers: body.approvers || [],
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const client = getSupabaseClient();
  try {
    const body = await request.json();
    const { id, action, comment } = body;

    if (!id || !action) {
      return NextResponse.json({ error: "id and action are required" }, { status: 400 });
    }

    // Get current approval
    const { data: current, error: fetchError } = await client
      .from("approvals")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (fetchError) throw new Error(fetchError.message);
    if (!current) return NextResponse.json({ error: "Approval not found" }, { status: 404 });

    let newStatus = current.status;
    let newStep = current.current_step;
    const comments = (current.comments as Array<{ action: string; comment: string; time: string; user: string }>) || [];
    comments.push({ action, comment: comment || "", time: new Date().toISOString(), user: "admin" });

    if (action === "approve") {
      if (current.current_step >= current.total_steps) {
        newStatus = "approved";
      } else {
        newStep = current.current_step + 1;
      }
    } else if (action === "reject") {
      newStatus = "rejected";
    }

    const { data, error } = await client
      .from("approvals")
      .update({ status: newStatus, current_step: newStep, comments, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
