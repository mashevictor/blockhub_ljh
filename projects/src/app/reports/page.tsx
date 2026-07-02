"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  CheckCircle,
  Clock,
  Send,
  Bot,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Download,
  Sparkles,
} from "lucide-react";

const KPI_CARDS = [
  { label: "审批效率", value: "92%", change: "+5%", up: true, icon: CheckCircle, color: "text-green-600 bg-green-50" },
  { label: "平均处理时长", value: "2.3h", change: "-18%", up: false, icon: Clock, color: "text-blue-600 bg-blue-50" },
  { label: "活跃用户", value: "1,247", change: "+12%", up: true, icon: Users, color: "text-purple-600 bg-purple-50" },
  { label: "文档处理量", value: "8,562", change: "+23%", up: true, icon: FileText, color: "text-amber-600 bg-amber-50" },
];

const MONTHLY_DATA = [
  { month: "1月", approvals: 120, queries: 450, docs: 80 },
  { month: "2月", approvals: 150, queries: 520, docs: 95 },
  { month: "3月", approvals: 180, queries: 610, docs: 110 },
  { month: "4月", approvals: 165, queries: 580, docs: 125 },
  { month: "5月", approvals: 210, queries: 720, docs: 140 },
  { month: "6月", approvals: 245, queries: 850, docs: 165 },
];

const MAX_APPROVALS = Math.max(...MONTHLY_DATA.map((d) => d.approvals));
const MAX_QUERIES = Math.max(...MONTHLY_DATA.map((d) => d.queries));

const AGENT_USAGE = [
  { name: "智能问答", count: 2850, color: "#4338ca", percent: 35 },
  { name: "审批流程", count: 1240, color: "#dc2626", percent: 15 },
  { name: "知识库", count: 1680, color: "#059669", percent: 20 },
  { name: "数据报表", count: 980, color: "#0ea5e9", percent: 12 },
  { name: "消息通知", count: 760, color: "#f59e0b", percent: 9 },
  { name: "智能创建", count: 520, color: "#6366f1", percent: 6 },
  { name: "外部数据", count: 240, color: "#0f766e", percent: 3 },
];

// 模拟 NL 查询结果
const NL_EXAMPLES = [
  { query: "上个月审批通过率是多少？", result: "6月份审批通过率为 92%，共处理 245 件审批" },
  { query: "哪个 Agent 使用最多？", result: "智能问答 Agent 使用最多，本月调用 2,850 次，占比 35%" },
  { query: "本周新增了多少文档？", result: "本周新增文档 42 份，已完成索引 38 份" },
];

export default function ReportsPage() {
  const [nlQuery, setNlQuery] = useState("");
  const [nlResult, setNlResult] = useState<string | null>(null);
  const [nlLoading, setNlLoading] = useState(false);

  const handleNlQuery = () => {
    if (!nlQuery.trim()) return;
    setNlLoading(true);
    // 模拟 NL 查询
    setTimeout(() => {
      const example = NL_EXAMPLES.find((e) => nlQuery.includes(e.query.slice(0, 5)));
      setNlResult(example?.result || `根据数据分析：${nlQuery} - 当前系统运行正常，各项指标均在预期范围内。`);
      setNlLoading(false);
    }, 1000);
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">数据报表</h1>
          <p className="text-sm text-muted-foreground">
            L1 报表 Agent：图表看板、自然语言查数、定时推送
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" /> 导出报表
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_CARDS.map((kpi) => (
          <Card key={kpi.label} className="border-0 shadow-sm transition-all hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${kpi.color}`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
                <Badge
                  variant="secondary"
                  className={`text-[10px] ${kpi.up ? "text-green-600" : "text-blue-600"}`}
                >
                  {kpi.up ? <ArrowUp className="mr-1 h-3 w-3" /> : <ArrowDown className="mr-1 h-3 w-3" />}
                  {kpi.change}
                </Badge>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* NL Query */}
      <Card className="mb-6 border-0 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-medium">自然语言查数</span>
            <Badge variant="secondary" className="text-[10px] ml-auto">
              NL2SQL
            </Badge>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MessageSquare className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={nlQuery}
                onChange={(e) => setNlQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNlQuery()}
                placeholder="输入问题，如：上个月审批通过率是多少？"
                className="pl-10"
              />
            </div>
            <Button onClick={handleNlQuery} disabled={nlLoading}>
              {nlLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          {nlResult && (
            <div className="mt-3 rounded-lg bg-white p-3">
              <div className="flex items-start gap-2">
                <Bot className="h-4 w-4 text-indigo-600 mt-0.5" />
                <p className="text-sm">{nlResult}</p>
              </div>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {NL_EXAMPLES.map((ex) => (
              <Button
                key={ex.query}
                variant="outline"
                size="sm"
                className="text-[11px]"
                onClick={() => {
                  setNlQuery(ex.query);
                  setNlResult(ex.result);
                }}
              >
                {ex.query}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Approvals Trend */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">审批趋势</CardTitle>
                <CardDescription>近 6 个月审批数量</CardDescription>
              </div>
              <Badge variant="secondary" className="text-[10px] text-green-600">
                <TrendingUp className="mr-1 h-3 w-3" /> +18%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-48">
              {MONTHLY_DATA.map((d) => (
                <div key={d.month} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{d.approvals}</span>
                  <div
                    className="w-full rounded-t-lg bg-indigo-500 transition-all hover:bg-indigo-600"
                    style={{ height: `${(d.approvals / MAX_APPROVALS) * 160}px` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{d.month}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Queries Trend */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">问答趋势</CardTitle>
                <CardDescription>近 6 个月问答调用量</CardDescription>
              </div>
              <Badge variant="secondary" className="text-[10px] text-green-600">
                <TrendingUp className="mr-1 h-3 w-3" /> +23%
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-48">
              {MONTHLY_DATA.map((d) => (
                <div key={d.month} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{d.queries}</span>
                  <div
                    className="w-full rounded-t-lg bg-emerald-500 transition-all hover:bg-emerald-600"
                    style={{ height: `${(d.queries / MAX_QUERIES) * 160}px` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{d.month}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Usage */}
      <Card className="mt-6 border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Agent 使用分布</CardTitle>
          <CardDescription>各 Agent 本月调用量统计</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {AGENT_USAGE.map((agent) => (
              <div key={agent.name} className="flex items-center gap-3">
                <div className="w-20 text-xs font-medium">{agent.name}</div>
                <div className="flex-1">
                  <div className="h-6 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${agent.percent}%`,
                        backgroundColor: agent.color,
                      }}
                    />
                  </div>
                </div>
                <div className="w-16 text-right">
                  <span className="text-xs font-medium">{agent.count.toLocaleString()}</span>
                  <span className="ml-1 text-[10px] text-muted-foreground">({agent.percent}%)</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-lg font-bold">8,270</p>
                <p className="text-xs text-muted-foreground">本月总调用</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-bold">99.8%</p>
                <p className="text-xs text-muted-foreground">系统可用率</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-lg font-bold">45ms</p>
                <p className="text-xs text-muted-foreground">平均响应时间</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
