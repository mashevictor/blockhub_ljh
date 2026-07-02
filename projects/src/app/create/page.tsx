"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Building2,
  Factory,
  TrendingUp,
  Heart,
  Gamepad2,
  FileJson,
  Rocket,
  Loader2,
} from "lucide-react";

interface Scenario {
  id: string;
  scenario_key: string;
  name: string;
  category: string;
  type: string;
  pack: string | null;
  primary_agent: string;
}

const STEPS = ["选择行业", "选择场景", "研判确认", "创建完成"];

const INDUSTRIES = [
  { key: "general", name: "通用办公", desc: "65 项标准办公场景", icon: Building2, color: "#4338ca" },
  { key: "mfg", name: "传统制造业", desc: "12 项制造业专属场景", icon: Factory, color: "#254b9c" },
  { key: "sales", name: "销售行业", desc: "12 项销售专属场景", icon: TrendingUp, color: "#dc2626" },
  { key: "med", name: "医疗行业", desc: "12 项医疗专属场景", icon: Heart, color: "#059669" },
  { key: "game", name: "游戏行业", desc: "13 项游戏专属场景", icon: Gamepad2, color: "#7c3aed" },
];

const AGENT_COLORS: Record<string, string> = {
  chat_qa: "#4338ca",
  kb: "#059669",
  approval: "#dc2626",
  report: "#0ea5e9",
  notify: "#f59e0b",
  integration: "#0f766e",
  creation: "#6366f1",
};

export default function CreatePage() {
  const [step, setStep] = useState(0);
  const [appName, setAppName] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("general");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [createdApp, setCreatedApp] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/scenarios")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setScenarios(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const relevantScenarios = scenarios.filter((s) => {
    if (selectedIndustry === "general") return s.type === "office";
    return s.type === "industry" && s.pack === selectedIndustry;
  });

  // Group by category
  const groupedScenarios = relevantScenarios.reduce<Record<string, Scenario[]>>((acc, s) => {
    const key = s.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const toggleScenario = (key: string) => {
    setSelectedScenarios((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedScenarios(new Set(relevantScenarios.map((s) => s.scenario_key)));
  };

  const clearAll = () => {
    setSelectedScenarios(new Set());
  };

  const selectByAgent = (agent: string) => {
    const agentScenarios = relevantScenarios
      .filter((s) => s.primary_agent === agent)
      .map((s) => s.scenario_key);
    setSelectedScenarios((prev) => {
      const next = new Set(prev);
      agentScenarios.forEach((k) => next.add(k));
      return next;
    });
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: appName || "未命名应用",
          industry: selectedIndustry,
          selected_scenarios: Array.from(selectedScenarios),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreatedApp(data.data);
        setCreated(true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && selectedScenarios.size === 0) return;
    setStep(Math.min(step + 1, 3));
  };
  const prevStep = () => setStep(Math.max(step - 1, 0));

  const resetWizard = () => {
    setStep(0);
    setAppName("");
    setSelectedIndustry("general");
    setSelectedScenarios(new Set());
    setCreated(false);
    setCreatedApp(null);
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold">智能创建向导</h1>
          <p className="text-sm text-muted-foreground">
            L4 创建层：三维度选择 → 研判确认 → 生成 Schema → 发布应用
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                    i <= step
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={`ml-2 text-xs font-medium ${
                    i <= step ? "text-indigo-600" : "text-slate-400"
                  }`}
                >
                  {s}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={`mx-4 h-px w-12 ${i < step ? "bg-indigo-600" : "bg-slate-200"}`} />
                )}
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-1" />
        </div>

        {/* Step 0: Select Industry */}
        {step === 0 && (
          <div>
            <h2 className="mb-4 text-lg font-semibold">选择行业方案包</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              选择行业后，系统将预填推荐场景，您可以在此基础上增减
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {INDUSTRIES.map((ind) => (
                <Card
                  key={ind.key}
                  className={`cursor-pointer border-2 transition-all ${
                    selectedIndustry === ind.key
                      ? "border-indigo-500 bg-indigo-50/50"
                      : "border-transparent hover:border-slate-200"
                  }`}
                  onClick={() => {
                    setSelectedIndustry(ind.key);
                    setSelectedScenarios(new Set());
                  }}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl"
                        style={{ backgroundColor: ind.color + "15" }}
                      >
                        <ind.icon className="h-6 w-6" style={{ color: ind.color }} />
                      </div>
                      <div>
                        <h3 className="font-medium">{ind.name}</h3>
                        <p className="text-xs text-muted-foreground">{ind.desc}</p>
                      </div>
                    </div>
                    {selectedIndustry === ind.key && (
                      <Badge className="bg-indigo-100 text-indigo-700">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        已选择
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Industry Pack Preview */}
            <Card className="mt-6 border-0 bg-slate-50 shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileJson className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-medium">行业方案包预览</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {selectedIndustry === "general"
                    ? "通用办公包含 8 大类 65 项标准办公场景"
                    : `${INDUSTRIES.find((i) => i.key === selectedIndustry)?.name}包含 ${relevantScenarios.length} 项专属场景`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(groupedScenarios).slice(0, 5).map(([cat, items]) => (
                    <Badge key={cat} variant="secondary" className="text-[10px]">
                      {cat} ({items.length})
                    </Badge>
                  ))}
                  {Object.keys(groupedScenarios).length > 5 && (
                    <Badge variant="secondary" className="text-[10px]">
                      +{Object.keys(groupedScenarios).length - 5} 类
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 1: Select Scenarios */}
        {step === 1 && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">选择场景</h2>
                <p className="text-sm text-muted-foreground">
                  已选 {selectedScenarios.size} / {relevantScenarios.length} 个场景
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  全选
                </Button>
                <Button variant="outline" size="sm" onClick={clearAll}>
                  清空
                </Button>
              </div>
            </div>

            {/* Quick select by Agent */}
            <Card className="mb-4 border-0 bg-indigo-50/50 shadow-none">
              <CardContent className="p-3">
                <p className="text-xs font-medium mb-2">按 Agent 快速选择：</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(
                    relevantScenarios.reduce<Record<string, number>>((acc, s) => {
                      acc[s.primary_agent] = (acc[s.primary_agent] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([agent, count]) => (
                    <Button
                      key={agent}
                      variant="outline"
                      size="sm"
                      className="text-[11px]"
                      onClick={() => selectByAgent(agent)}
                      style={{ borderColor: AGENT_COLORS[agent] + "40" }}
                    >
                      <span
                        className="mr-1.5 h-2 w-2 rounded-full"
                        style={{ backgroundColor: AGENT_COLORS[agent] }}
                      />
                      {agent} ({count})
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedScenarios).map(([category, items]) => (
                  <Card key={category} className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{category}</CardTitle>
                      <CardDescription className="text-xs">
                        {items.length} 个场景 · 主责 Agent: {items[0]?.primary_agent}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((scenario) => (
                          <label
                            key={scenario.id}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 transition-all ${
                              selectedScenarios.has(scenario.scenario_key)
                                ? "border-indigo-300 bg-indigo-50"
                                : "hover:border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <Checkbox
                              checked={selectedScenarios.has(scenario.scenario_key)}
                              onCheckedChange={() => toggleScenario(scenario.scenario_key)}
                            />
                            <span className="text-xs">{scenario.name}</span>
                          </label>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Review & Confirm */}
        {step === 2 && (
          <div>
            <h2 className="mb-4 text-lg font-semibold">研判确认</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              确认应用信息，系统将自动生成 Page Schema 并发布
            </p>

            <div className="space-y-4">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm">应用信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">应用名称</Label>
                    <Input
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      placeholder="输入应用名称"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">行业方案包</Label>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge>
                        {INDUSTRIES.find((i) => i.key === selectedIndustry)?.name}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm">已选场景 ({selectedScenarios.size})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {relevantScenarios
                      .filter((s) => selectedScenarios.has(s.scenario_key))
                      .map((s) => (
                        <Badge key={s.id} variant="secondary" className="text-[11px]">
                          <span
                            className="mr-1 h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: AGENT_COLORS[s.primary_agent] || "#666" }}
                          />
                          {s.name}
                        </Badge>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-none">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-indigo-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">智能研判结果</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        基于您选择的 {selectedScenarios.size} 个场景，系统将自动生成：
                      </p>
                      <ul className="mt-2 space-y-1 text-xs text-slate-600">
                        <li>• Page Schema JSON 配置</li>
                        <li>• FormWidget / ListWidget 组件映射</li>
                        <li>• Workflow 流程定义</li>
                        <li>• RBAC 权限配置</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step 3: Created */}
        {step === 3 && created && (
          <div className="py-8 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            <h2 className="mb-2 text-2xl font-bold">应用创建成功！</h2>
            <p className="mb-6 text-muted-foreground">
              「{createdApp?.name || appName || "未命名应用"}」已成功发布
            </p>
            <Card className="mx-auto max-w-md border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">应用 ID</span>
                    <code className="text-xs">{createdApp?.id?.slice(0, 8)}...</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">行业</span>
                    <span>{INDUSTRIES.find((i) => i.key === selectedIndustry)?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">场景数</span>
                    <span>{selectedScenarios.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">状态</span>
                    <Badge className="bg-green-100 text-green-700">已发布</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={resetWizard} variant="outline">
                创建新应用
              </Button>
              <Button>
                <Rocket className="mr-2 h-4 w-4" />
                进入应用
              </Button>
            </div>
          </div>
        )}

        {/* Navigation */}
        {step < 3 && (
          <div className="mt-8 flex justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={step === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              上一步
            </Button>
            {step < 2 ? (
              <Button
                onClick={nextStep}
                disabled={step === 1 && selectedScenarios.size === 0}
              >
                下一步
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleCreate}
                disabled={creating}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    生成并发布
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
