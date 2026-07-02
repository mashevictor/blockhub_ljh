import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function GET() {
  const client = getSupabaseClient();
  try {
    // Count agents
    const { count: agentCount } = await client.from("agents").select("*", { count: "exact", head: true });

    // Count scenarios
    const { count: officeCount } = await client
      .from("scenarios")
      .select("*", { count: "exact", head: true })
      .eq("type", "office");
    const { count: industryCount } = await client
      .from("scenarios")
      .select("*", { count: "exact", head: true })
      .eq("type", "industry");

    // Count capabilities
    const { count: capCount } = await client.from("capabilities").select("*", { count: "exact", head: true });

    // Count applications
    const { count: appCount } = await client.from("applications").select("*", { count: "exact", head: true });

    // Count conversations
    const { count: convCount } = await client.from("conversations").select("*", { count: "exact", head: true });

    // Count approvals
    const { count: approvalCount } = await client.from("approvals").select("*", { count: "exact", head: true });
    const { count: pendingApprovals } = await client
      .from("approvals")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    // Count notifications
    const { count: unreadNotifs } = await client
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false);

    // Count knowledge bases
    const { count: kbCount } = await client.from("knowledge_bases").select("*", { count: "exact", head: true });

    return NextResponse.json({
      success: true,
      data: {
        agents: agentCount || 0,
        capabilities: capCount || 0,
        office_scenarios: officeCount || 0,
        industry_scenarios: industryCount || 0,
        applications: appCount || 0,
        conversations: convCount || 0,
        approvals: approvalCount || 0,
        pending_approvals: pendingApprovals || 0,
        unread_notifications: unreadNotifs || 0,
        knowledge_bases: kbCount || 0,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
