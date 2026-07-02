"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  Grid3X3,
  MessageSquare,
  CheckCircle,
  Bell,
  BookOpen,
  BarChart3,
  Sparkles,
  ArrowRight,
  Activity,
  TrendingUp,
  Clock,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DashboardData {
  agents: number;
  capabilities: number;
  office_scenarios: number;
  industry_scenarios: number;
  applications: number;
  conversations: number;
  approvals: number;
  pending_approvals: number;
  unread_notifications: number;
  knowledge_bases: number;
}

const AGENT_CARDS = [
  { key: "creation", name: "智能创建", icon: Sparkles, color: "#6366f1", desc: "元 Agent，编排场景创建与发布", pipeline: "需求→研判→澄清→Schema→编排→发布" },
  { key: "chat_qa", name: "智能问答", icon: MessageSquare, color: "#4338ca", desc: "RAG 驱动的多轮对话", pipeline: "接收→检索→Prompt→LLM→SSE→会话" },
  { key: "kb", name: "知识库", icon: BookOpen, color: "#059669", desc: "文档切片与语义检索", pipeline: "上传→解析→切片→向量→索引→检索" },
  { key: "approval", name: "审批流程", icon: CheckCircle, color: "#dc2626", desc: "多级审批与工作流", pipeline: "提交→工作流→路由→状态→通知→归档" },
  { key: "report", name: "数据报表", icon: BarChart3, color: "#0ea5e9", desc: "图表看板与 NL 查数", pipeline: "选指标→聚合→图表→NL查数→导出" },
  { key: "notify", name: "消息通知", icon: Bell, color: "#f59e0b", desc: "多渠道消息推送", pipeline: "触发器→规则→模板→发送→确认" },
  { key: "integration", name: "外部数据", icon: Grid3X3, color: "#0f766e", desc: "ERP/OA/CRM 对接", pipeline: "Discover→Extract→Map→Load→Sync→Serve" },
];

// 模拟活动流数据
const RECENT_ACTIVITIES = [
  { id: 1, type: "approval", title: "请假申请待审批", desc: "张三提交了请假申请", time: "5 分钟前", icon: CheckCircle, color: "text-amber-600 bg-amber-50" },
  { id: 2, type: "chat", title: "智能问答对话", desc: "新用户开始了首次对话", time: "12 分钟前", icon: MessageSquare, color: "text-blue-600 bg-blue-50" },
  { id: 3, type: "kb", title: "知识库更新", desc: "「产品手册」新增 3 篇文档", time: "1 小时前", icon: BookOpen, color: "text-green-600 bg-green-50" },
  { id: 4, type: "create", title: "应用创建", desc: "「销售管理助手」创建成功", time: "2 小时前", icon: Sparkles, color: "text-indigo-600 bg-indigo-50" },
  { id: 5, type: "notify", title: "通知发送", desc: "审批提醒已推送至 12 人", time: "3 小时前", icon: Bell, color: "text-orange-600 bg-orange-50" },
];

// 模拟趋势数据
const TREND_DATA = [
  { day: "周一", queries: 120, approvals: 45 },
  { day: "周二", queries: 156, approvals: 52 },
  { day: "周三", queries: 189, approvals: 61 },
  { day: "周四", queries: 234, approvals: 78 },
  { day: "周五", queries: 278, approvals: 89 },
  { day: "周六", queries: 145, approvals: 34 },
  { day: "周日", queries: 98, approvals: 22 },
];

const MAX_QUERIES = Math.max(...TREND_DATA.map((d) => d.queries));

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const stats = [
    { label: "PaaS Agent", value: data?.agents ?? 7, icon: Bot, color: "text-indigo-600 bg-indigo-50" },
    { label: "Capability", value: data?.capabilities ?? 36, icon: Grid3X3, color: "text-purple-600 bg-purple-50" },
    { label: "办公场景", value: data?.office_scenarios ?? 65, icon: MessageSquare, color: "text-blue-600 bg-blue-50" },
    { label: "行业场景", value: data?.industry_scenarios ?? 49, icon: Grid3X3, color: "text-emerald-600 bg-emerald-50" },
    { label: "已建应用", value: data?.applications ?? 0, icon: Sparkles, color: "text-amber-600 bg-amber-50" },
    { label: "对话数", value: data?.conversations ?? 0, icon: MessageSquare, color: "text-cyan-600 bg-cyan-50" },
    { label: "待审批", value: data?.pending_approvals ?? 0, icon: CheckCircle, color: "text-red-600 bg-red-50" },
    { label: "未读通知", value: data?.unread_notifications ?? 0, icon: Bell, color: "text-orange-600 bg-orange-50" },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Hero */}
      <div className="mb-8 rounded-2xl bg-gradient-to-br from-[#0f172a] via-indigo-900 to-indigo-600 p-8 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">TrackChat PaaS</h1>
            <p className="mt-2 text-sm text-white/80">
              7 PaaS Agent 承载 36 Capability，驱动 65 办公场景 + 49 行业场景
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/create">
                <Button className="bg-white text-indigo-700 hover:bg-white/90">
                  <Sparkles className="mr-2 h-4 w-4" />
                  智能创建应用
                </Button>
              </Link>
              <Link href="/chat">
                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  开始对话
                </Button>
              </Link>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
              <Activity className="h-4 w-4 text-green-400" />
              <span className="text-sm">系统运行正常</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
        {stats.map((s) => (
          <Card key={s.label} className="border-0 shadow-sm transition-all hover:shadow-md">
            <CardContent className="p-4 text-center">
              <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold">{loading ? "-" : s.value}</div>
              <div className="text-[11px] text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Agent Cards */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">7 PaaS Agent</h2>
            <Link href="/agents" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
              查看全部 <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {AGENT_CARDS.map((agent) => (
              <Card key={agent.key} className="group border-0 shadow-sm transition-all hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                      style={{ backgroundColor: agent.color + "15" }}
                    >
                      <agent.icon className="h-5 w-5" style={{ color: agent.color }} />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{agent.name}</CardTitle>
                      <Badge variant="secondary" className="mt-0.5 text-[10px]">
                        Active
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{agent.desc}</p>
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
                    <Zap className="h-3 w-3" />
                    <span className="truncate">{agent.pipeline}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right: Activity Feed */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">最近活动</h2>
            <Badge variant="outline" className="text-[10px]">
              <Activity className="mr-1 h-3 w-3" /> 实时
            </Badge>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="divide-y">
                {RECENT_ACTIVITIES.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-4 transition-colors hover:bg-slate-50">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${activity.color}`}>
                      <activity.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.desc}</p>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock className="h-3 w-3" />
                        {activity.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Trend Chart & Architecture */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Trend Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">本周趋势</CardTitle>
                <CardDescription>问答与审批使用量</CardDescription>
              </div>
              <Badge variant="secondary" className="text-[10px] text-green-600">
                <TrendingUp className="mr-1 h-3 w-3" /> +23%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-40">
              {TREND_DATA.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full gap-0.5">
                    <div
                      className="flex-1 rounded-t bg-indigo-500 transition-all hover:bg-indigo-600"
                      style={{ height: `${(d.queries / MAX_QUERIES) * 120}px` }}
                      title={`问答: ${d.queries}`}
                    />
                    <div
                      className="flex-1 rounded-t bg-emerald-500 transition-all hover:bg-emerald-600"
                      style={{ height: `${(d.approvals / MAX_QUERIES) * 120}px` }}
                      title={`审批: ${d.approvals}`}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{d.day}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded bg-indigo-500" />
                <span className="text-muted-foreground">智能问答</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded bg-emerald-500" />
                <span className="text-muted-foreground">审批流程</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Architecture */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">五层架构模型</CardTitle>
            <CardDescription>自底向上的 PaaS 架构</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { level: "L5", name: "Runtime", desc: "员工端 Web/App、ChatWidget", color: "bg-indigo-500", user: true },
                { level: "L4", name: "创建", desc: "7步向导、可行性报告、Page Schema", color: "bg-indigo-400", user: true },
                { level: "L3", name: "Catalog", desc: "65 办公 + 49 行业场景清单", color: "bg-indigo-300", user: true },
                { level: "L2", name: "Capability", desc: "36 原子能力注册与映射", color: "bg-slate-400", user: false },
                { level: "L1", name: "Agent", desc: "7 套 Pipeline 服务", color: "bg-slate-500", user: false },
              ].map((l) => (
                <div key={l.level} className={`${l.color} rounded-lg p-3 text-white`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{l.level}</span>
                      <span className="text-sm font-medium">{l.name}</span>
                    </div>
                    {l.user && (
                      <Badge className="bg-white/20 text-[10px] text-white border-0">
                        用户可见
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-white/70">{l.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-6 border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">快速入口</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/scenarios" className="group">
              <div className="flex items-center gap-3 rounded-lg border p-3 transition-all hover:border-indigo-200 hover:bg-indigo-50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <Grid3X3 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">场景目录</p>
                  <p className="text-[11px] text-muted-foreground">114 个场景</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
            <Link href="/knowledge" className="group">
              <div className="flex items-center gap-3 rounded-lg border p-3 transition-all hover:border-indigo-200 hover:bg-indigo-50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                  <BookOpen className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">知识库</p>
                  <p className="text-[11px] text-muted-foreground">文档管理</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
            <Link href="/approvals" className="group">
              <div className="flex items-center gap-3 rounded-lg border p-3 transition-all hover:border-indigo-200 hover:bg-indigo-50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                  <CheckCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">审批流程</p>
                  <p className="text-[11px] text-muted-foreground">待办处理</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
            <Link href="/reports" className="group">
              <div className="flex items-center gap-3 rounded-lg border p-3 transition-all hover:border-indigo-200 hover:bg-indigo-50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50">
                  <BarChart3 className="h-5 w-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">数据报表</p>
                  <p className="text-[11px] text-muted-foreground">图表看板</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
