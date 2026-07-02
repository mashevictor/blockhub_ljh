"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  Grid3X3,
  Sparkles,
  MessageSquare,
  BookOpen,
  CheckCircle,
  BarChart3,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "总览", icon: LayoutDashboard },
  { href: "/agents", label: "Agent 中心", icon: Bot },
  { href: "/scenarios", label: "场景目录", icon: Grid3X3 },
  { href: "/create", label: "智能创建", icon: Sparkles },
  { href: "/chat", label: "智能问答", icon: MessageSquare },
  { href: "/knowledge", label: "知识库", icon: BookOpen },
  { href: "/approvals", label: "审批流程", icon: CheckCircle },
  { href: "/reports", label: "数据报表", icon: BarChart3 },
  { href: "/notifications", label: "消息通知", icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[260px] overflow-y-auto bg-gradient-to-b from-[#0f172a] to-[#1e1b4b]">
      <div className="border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">TrackChat</h2>
            <p className="text-[10px] text-white/50">PaaS 智能办公平台</p>
          </div>
        </div>
      </div>

      <nav className="px-3 py-4">
        <div className="mb-2 px-3 text-[9px] font-medium uppercase tracking-wider text-white/30">
          导航
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-all",
                isActive
                  ? "bg-white/10 font-medium text-white border-l-2 border-indigo-400"
                  : "text-white/70 hover:bg-white/5 hover:text-white border-l-2 border-transparent"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 px-5 py-3">
        <p className="text-[10px] text-white/30">7 Agent &middot; 36 Capability</p>
        <p className="text-[10px] text-white/30">114 Scenarios &middot; v1.0</p>
      </div>
    </aside>
  );
}
