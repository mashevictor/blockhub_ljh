import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function POST(request: NextRequest) {
  const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
  const config = new Config();
  const client = new LLMClient(config, customHeaders);
  const supabase = getSupabaseClient();

  try {
    const body = await request.json();
    const { message, conversation_id, system_prompt } = body;

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    // Get or create conversation
    let convId = conversation_id;
    if (!convId) {
      const { data: conv, error: convError } = await supabase
        .from("conversations")
        .insert({ title: message.slice(0, 50), status: "active" })
        .select()
        .single();
      if (convError) throw new Error(convError.message);
      convId = conv.id;
    }

    // Save user message
    await supabase.from("messages").insert({
      conversation_id: convId,
      role: "user",
      content: message,
    });

    // Get conversation history
    const { data: history } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(20);

    const messages = [
      {
        role: "system" as const,
        content: system_prompt || "你是 TrackChat PaaS 系统的智能助手。你可以帮助用户解答关于企业管理、办公协同、审批流程、数据分析等方面的问题。请用专业、简洁的中文回答。",
      },
      ...(history || []).map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // Stream response
    const stream = client.stream(messages, { temperature: 0.7 });

    const encoder = new TextEncoder();
    let fullContent = "";

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              fullContent += text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: text, conversation_id: convId })}\n\n`)
              );
            }
          }
          // Save assistant message
          await supabase.from("messages").insert({
            conversation_id: convId,
            role: "assistant",
            content: fullContent,
          });
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true, conversation_id: convId })}\n\n`)
          );
          controller.close();
        } catch (streamErr) {
          const errMsg = streamErr instanceof Error ? streamErr.message : "Stream error";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const supabase = getSupabaseClient();
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversation_id");

  try {
    if (conversationId) {
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return NextResponse.json({ success: true, data: messages || [] });
    }

    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return NextResponse.json({ success: true, data: conversations || [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
