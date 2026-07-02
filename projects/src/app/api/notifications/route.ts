import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET(request: NextRequest) {
  const client = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const isRead = searchParams.get("is_read");

  try {
    let query = client.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
    if (isRead !== null) query = query.eq("is_read", isRead === "true");

    const { data, error } = await query;
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
      .from("notifications")
      .insert({
        title: body.title,
        content: body.content || "",
        type: body.type || "info",
        channel: body.channel || "inapp",
        recipient: body.recipient || "admin",
        app_id: body.app_id || null,
        is_read: false,
        metadata: body.metadata || null,
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
    const { id, is_read } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { data, error } = await client
      .from("notifications")
      .update({ is_read: is_read ?? true })
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
