import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET() {
  const client = getSupabaseClient();
  try {
    const { data, error } = await client
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false });
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
      .from("applications")
      .insert({
        name: body.name,
        description: body.description || "",
        industry: body.industry || null,
        status: "draft",
        selected_scenarios: body.selected_scenarios || [],
        created_by: body.created_by || "admin",
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
