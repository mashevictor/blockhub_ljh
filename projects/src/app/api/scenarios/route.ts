import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET(request: NextRequest) {
  const client = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const pack = searchParams.get("pack");
  const category = searchParams.get("category");

  try {
    let query = client.from("scenarios").select("*").order("sort_order");
    if (type) query = query.eq("type", type);
    if (pack) query = query.eq("pack", pack);
    if (category) query = query.eq("category", category);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
