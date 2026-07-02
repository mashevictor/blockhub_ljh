"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Scenario {
  id: string;
  scenario_key: string;
  name: string;
  description: string;
  category: string;
  type: string;
  pack: string | null;
  primary_agent: string;
  required_caps: string[] | null;
  is_standard: boolean;
}

const PACK_LABELS: Record<string, { label: string; color: string }> = {
  mfg: { label: "制造业", color: "#254b9c" },
  sales: { label: "销售", color: "#dc2626" },
  med: { label: "医疗", color: "#059669" },
  game: { label: "游戏", color: "#7c3aed" },
};

const AGENT_COLORS: Record<string, string> = {
  chat_qa: "#4338ca",
  kb: "#059669",
  approval: "#dc2626",
  report: "#0ea5e9",
  notify: "#f59e0b",
  integration: "#0f766e",
  creation: "#6366f1",
};

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "office" | "industry">("all");
  const [packFilter, setPackFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/scenarios")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setScenarios(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = scenarios.filter((s) => {
    if (filter !== "all" && s.type !== filter) return false;
    if (packFilter !== "all" && s.pack !== packFilter) return false;
    return true;
  });

  // Group by category
  const grouped = filtered.reduce<Record<string, Scenario[]>>((acc, s) => {
    const key = s.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const officeCount = scenarios.filter((s) => s.type === "office").length;
  const industryCount = scenarios.filter((s) => s.type === "industry").length;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold">场景目录</h1>
        <p className="text-sm text-muted-foreground">
          L3 Catalog：{officeCount} 办公场景 + {industryCount} 行业场景 = {scenarios.length} 总计
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {(["all", "office", "industry"] as const).map((t) => (
            <Button
              key={t}
              variant={filter === t ? "default" : "ghost"}
              size="sm"
              className="text-xs"
              onClick={() => setFilter(t)}
            >
              {t === "all" ? "全部" : t === "office" ? `办公 ${officeCount}` : `行业 ${industryCount}`}
            </Button>
          ))}
        </div>
        {filter !== "office" && (
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            <Button
              variant={packFilter === "all" ? "default" : "ghost"}
              size="sm"
              className="text-xs"
              onClick={() => setPackFilter("all")}
            >
              全行业
            </Button>
            {Object.entries(PACK_LABELS).map(([key, { label }]) => (
              <Button
                key={key}
                variant={packFilter === key ? "default" : "ghost"}
                size="sm"
                className="text-xs"
                onClick={() => setPackFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="h-5 w-40 rounded bg-muted mb-3" />
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="h-8 rounded bg-muted" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, items]) => (
            <Card key={category} className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    {category}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {items.length} 项
                    </span>
                  </CardTitle>
                  {items[0]?.pack && (
                    <Badge
                      style={{
                        backgroundColor: PACK_LABELS[items[0].pack]?.color + "15",
                        color: PACK_LABELS[items[0].pack]?.color,
                      }}
                    >
                      {PACK_LABELS[items[0].pack]?.label}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-100 p-2 transition-colors hover:bg-slate-50"
                    >
                      <div
                        className="h-2 w-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: AGENT_COLORS[s.primary_agent] || "#94a3b8" }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{s.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {s.primary_agent}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] flex-shrink-0",
                          s.is_standard ? "border-green-200 text-green-700" : "border-amber-200 text-amber-700"
                        )}
                      >
                        {s.is_standard ? "标准" : "定制"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
