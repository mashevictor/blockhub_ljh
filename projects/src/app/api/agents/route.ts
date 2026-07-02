import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET() {
  const client = getSupabaseClient();
  try {
    const { data, error } = await client
      .from("agents")
      .select("*")
      .order("created_at", { ascending: true });
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
      .from("agents")
      .insert({ ...body, status: body.status || "active" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
