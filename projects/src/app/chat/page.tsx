"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Send,
  Bot,
  User,
  Plus,
  MessageSquare,
  Trash2,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

// 预设问题
const SUGGESTED_QUESTIONS = [
  "TrackChat 支持哪些办公场景？",
  "如何创建一个新的审批流程？",
  "知识库支持哪些文档格式？",
  "如何对接企业微信？",
  "数据报表支持自然语言查询吗？",
];

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamContent, scrollToBottom]);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setConversations(res.data);
      })
      .catch(() => {});
  }, []);

  const loadMessages = async (convId: string) => {
    const res = await fetch(`/api/chat?conversation_id=${convId}`);
    const data = await res.json();
    if (data.success) {
      setMessages(data.data);
      setCurrentConvId(convId);
    }
  };

  const newConversation = () => {
    setCurrentConvId(null);
    setMessages([]);
    setStreamContent("");
    inputRef.current?.focus();
  };

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/chat?conversation_id=${convId}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (currentConvId === convId) {
      newConversation();
    }
  };

  const copyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const sendMessage = async (messageText?: string) => {
    const userMsg = messageText || input.trim();
    if (!userMsg || streaming) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setStreaming(true);
    setStreamContent("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          conversation_id: currentConvId,
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let fullContent = "";
      let convId = currentConvId;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              fullContent += data.content;
              setStreamContent(fullContent);
            }
            if (data.conversation_id) {
              convId = data.conversation_id;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

      // Add assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: fullContent }]);
      
      // Update conversation list
      if (convId && !conversations.find((c) => c.id === convId)) {
        setConversations((prev) => [
          { id: convId, title: userMsg.slice(0, 30), created_at: new Date().toISOString() },
          ...prev,
        ]);
      }
      setCurrentConvId(convId);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "抱歉，出现了错误，请稍后重试。" },
      ]);
    } finally {
      setStreaming(false);
      setStreamContent("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar - Conversation List */}
      <div className="hidden w-64 border-r bg-slate-50/50 md:flex md:flex-col">
        <div className="p-4">
          <Button onClick={newConversation} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            新对话
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-1 px-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => loadMessages(conv.id)}
                className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-slate-100 ${
                  currentConvId === conv.id ? "bg-slate-100" : ""
                }`}
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{conv.title}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => deleteConversation(conv.id, e)}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
              <Bot className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-medium">智能问答</h2>
              <p className="text-xs text-muted-foreground">RAG 驱动的多轮对话</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            <Sparkles className="mr-1 h-3 w-3" />
            doubao-seed-2-0-mini
          </Badge>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-3xl px-4 py-6">
            {messages.length === 0 && !streaming ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600">
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <h3 className="mb-2 text-lg font-medium">TrackChat 智能问答</h3>
                <p className="mb-6 text-center text-sm text-muted-foreground">
                  基于 RAG 的多轮对话，支持制度问答、操作指导、知识库检索
                </p>
                <div className="grid w-full max-w-md gap-2">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <Button
                      key={q}
                      variant="outline"
                      className="justify-start text-left text-sm"
                      onClick={() => sendMessage(q)}
                    >
                      <MessageSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        msg.role === "user"
                          ? "bg-indigo-100"
                          : "bg-gradient-to-br from-indigo-500 to-purple-600"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <User className="h-4 w-4 text-indigo-600" />
                      ) : (
                        <Bot className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <div className={`group relative max-w-[80%] ${msg.role === "user" ? "text-right" : ""}`}>
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm ${
                          msg.role === "user"
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-100 text-slate-900"
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                      {msg.role === "assistant" && (
                        <div className="mt-1 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyMessage(msg.content, idx.toString())}
                          >
                            {copied === idx.toString() ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {/* Streaming message */}
                {streaming && streamContent && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="max-w-[80%]">
                      <div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-900">
                        <div className="whitespace-pre-wrap">
                          {streamContent}
                          <span className="inline-block w-1.5 h-4 bg-indigo-600 animate-pulse ml-0.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* Loading indicator */}
                {streaming && !streamContent && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="rounded-2xl bg-slate-100 px-4 py-3">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "0ms" }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "150ms" }} />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t bg-white px-4 py-4">
          <div className="mx-auto max-w-3xl">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入问题，按 Enter 发送..."
                className="flex-1"
                disabled={streaming}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || streaming}
                className="px-4"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              基于 RAG 检索增强生成，回答可能不完全准确，仅供参考
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
