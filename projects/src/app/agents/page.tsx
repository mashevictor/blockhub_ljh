"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  MessageSquare,
  BookOpen,
  CheckCircle,
  BarChart3,
  Bell,
  Plug,
  Mic,
  X,
  Zap,
  ArrowRight,
  Settings,
  Play,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

interface Agent {
  id: string;
  agent_key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  pipeline: string;
  status: string;
  config: { caps: string[] } | null;
}

const ICON_MAP: Record<string, typeof Sparkles> = {
  Sparkles, MessageSquare, BookOpen, CheckCircle, BarChart3, Bell, Plug, Mic,
};

// Agent 详细信息
const AGENT_DETAILS: Record<string, {
  capabilities: string[];
  officeScenes: string;
  industryScenes: string;
  feModule: string;
  beModule: string;
  docLink: string;
}> = {
  creation: {
    capabilities: ["creation", "form_widget", "list_widget", "rbac_page"],
    officeScenes: "元 Agent，编排全部 65 办公 + 49 行业场景",
    industryScenes: "全量：选行业→预填→研判→生成 Schema",
    feModule: "FE-B 创建向导 · FE-RW Runtime",
    beModule: "BE-E Registry·Schema·Feasibility·Publish",
    docLink: "04-Agent-智能创建应用-落地方案.html",
  },
  chat_qa: {
    capabilities: ["chat_qa", "chat_voice", "multi_agent", "chat_summary"],
    officeScenes: "制度政策问答·员工手册·福利咨询·法务咨询·新人 onboarding",
    industryScenes: "产品话术问答·SOP工艺问答·诊疗指南·玩家FAQ",
    feModule: "FE-CHAT · ChatWidget Runtime",
    beModule: "BE-CHAT · RAG Pipeline",
    docLink: "05-Agent-智能问答-落地方案.html",
  },
  kb: {
    capabilities: ["kb_document", "kb_search"],
    officeScenes: "制度文档库·SOP·培训资料·项目文档·会议纪要",
    industryScenes: "SOP/工艺·案例方案库·版本规则库·诊疗指南库",
    feModule: "FE-KB · 上传/切片/检索",
    beModule: "BE-KB · 向量化索引",
    docLink: "06-Agent-知识库-落地方案.html",
  },
  approval: {
    capabilities: ["approval_flow", "approval_inbox", "approval_countersign", "approval_conditional"],
    officeScenes: "请假·加班·出差·报销·入职离职·用印·借款·合同",
    industryScenes: "质检审批·物料领用·报价折扣·合同审批·耗材申购",
    feModule: "FE-APPR · FormWidget·Timeline",
    beModule: "BE-APPR · 工作流状态机",
    docLink: "07-Agent-审批流程-落地方案.html",
  },
  report: {
    capabilities: ["chart_dashboard", "chart_basic", "chart_funnel", "data_nl_query"],
    officeScenes: "部门看板·考勤·审批效率·费用汇总·NL查数",
    industryScenes: "生产日报/OEE·销售漏斗·业绩排行·科室运营",
    feModule: "FE-CHART · Dashboard·NLQuery",
    beModule: "BE-CHART · 聚合·NL2SQL",
    docLink: "08-Agent-数据报表-落地方案.html",
  },
  notify: {
    capabilities: ["notify_inapp", "notify_email", "notify_im", "announce_board"],
    officeScenes: "审批提醒·公告·待办@·邮件短信·企微钉钉",
    industryScenes: "保养计划提醒·商机到期·活动上线通知",
    feModule: "FE-NOTIFY · Inbox·Banner",
    beModule: "BE-NOTIFY · 多渠道 Adapter",
    docLink: "09-Agent-消息通知-落地方案.html",
  },
  integration: {
    capabilities: ["integration", "erp_connector", "oa_connector", "auth_sso"],
    officeScenes: "SAP/用友·OA·CRM·HR·SSO·双向同步",
    industryScenes: "MES/ERP·Salesforce/纷享·HIS/LIS·游戏后台",
    feModule: "FE-INT · 连接器向导",
    beModule: "BE-INT · ETL 6 阶段",
    docLink: "10-外部数据源对接-Agent落地方案.html",
  },
  shanghai_voice: {
    capabilities: ["shanghai_voice", "shanghai_voice_stream"],
    officeScenes: "上海话客服·方言培训·本地政务咨询·语音导览",
    industryScenes: "文旅导览·社区服务·方言客服·本地生活问答",
    feModule: "FE-VOICE · VoiceAgentPanel · ShanghaiVoicePage",
    beModule: "BE-VOICE · TeleASR/TTS WebSocket Gateway",
    docLink: "shanghai-voice-agent/telecom-stars-solution.html",
  },
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setAgents(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getAgentDetail = (key: string) => AGENT_DETAILS[key] || AGENT_DETAILS.creation;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Agent 中心</h1>
        <p className="text-sm text-muted-foreground">
          7 PaaS Agent 运行时，每个 Agent 是一组 Capability 的 Pipeline + 场景模板集合
        </p>
      </div>

      {/* Summary Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                <Zap className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">36</p>
                <p className="text-xs text-muted-foreground">Capability 原子能力</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">65</p>
                <p className="text-xs text-muted-foreground">办公场景覆盖</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">49</p>
                <p className="text-xs text-muted-foreground">行业场景覆盖</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Card key={i} className="animate-pulse border-0 shadow-sm">
              <CardHeader className="pb-2">
                <div className="h-6 w-32 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-4 w-full rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => {
            const IconComp = ICON_MAP[agent.icon] || Sparkles;
            const detail = getAgentDetail(agent.agent_key);
            return (
              <Card
                key={agent.id}
                className="group cursor-pointer overflow-hidden border-0 shadow-sm transition-all hover:shadow-md"
                onClick={() => setSelectedAgent(agent)}
              >
                <div className="h-1" style={{ backgroundColor: agent.color }} />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
                        style={{ backgroundColor: agent.color + "15" }}
                      >
                        <IconComp className="h-5 w-5" style={{ color: agent.color }} />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{agent.name}</CardTitle>
                        <Badge variant="secondary" className="mt-0.5 text-[10px]">
                          {agent.status}
                        </Badge>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-xs text-muted-foreground">{agent.description}</p>
                  <div className="mb-3 rounded-lg bg-slate-50 p-2">
                    <p className="text-[10px] font-medium text-muted-foreground mb-1">Pipeline</p>
                    <p className="text-[11px] text-slate-700">{agent.pipeline}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {detail.capabilities.slice(0, 3).map((cap) => (
                      <Badge key={cap} variant="outline" className="text-[9px]">
                        {cap}
                      </Badge>
                    ))}
                    {detail.capabilities.length > 3 && (
                      <Badge variant="outline" className="text-[9px]">
                        +{detail.capabilities.length - 3}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Agent Detail Sheet */}
      <Sheet open={!!selectedAgent} onOpenChange={() => setSelectedAgent(null)}>
        <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
          {selectedAgent && (() => {
            const IconComp = ICON_MAP[selectedAgent.icon] || Sparkles;
            const detail = getAgentDetail(selectedAgent.agent_key);
            const pipelineSteps = selectedAgent.pipeline.split("→");
            return (
              <>
                <SheetHeader>
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: selectedAgent.color + "15" }}
                    >
                      <IconComp className="h-7 w-7" style={{ color: selectedAgent.color }} />
                    </div>
                    <div>
                      <SheetTitle className="text-xl">{selectedAgent.name}</SheetTitle>
                      <Badge variant="secondary" className="mt-1">
                        {selectedAgent.status}
                      </Badge>
                    </div>
                  </div>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* Description */}
                  <div>
                    <h3 className="text-sm font-medium mb-2">描述</h3>
                    <p className="text-sm text-muted-foreground">{selectedAgent.description}</p>
                  </div>

                  <Separator />

                  {/* Pipeline Visualization */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">Pipeline 流程</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      {pipelineSteps.map((step, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                            style={{ backgroundColor: selectedAgent.color }}
                          >
                            {step}
                          </div>
                          {i < pipelineSteps.length - 1 && (
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Capabilities */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">承载 Capability</h3>
                    <div className="flex flex-wrap gap-2">
                      {detail.capabilities.map((cap) => (
                        <Badge key={cap} variant="secondary" className="text-xs">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Scene Coverage */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">场景覆盖</h3>
                    <div className="space-y-3">
                      <div className="rounded-lg bg-blue-50 p-3">
                        <p className="text-xs font-medium text-blue-700 mb-1">办公场景</p>
                        <p className="text-sm text-blue-900">{detail.officeScenes}</p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 p-3">
                        <p className="text-xs font-medium text-emerald-700 mb-1">行业场景</p>
                        <p className="text-sm text-emerald-900">{detail.industryScenes}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Technical Details */}
                  <div>
                    <h3 className="text-sm font-medium mb-3">技术实现</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">前端：</span>
                        <span>{detail.feModule}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">后端：</span>
                        <span>{detail.beModule}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4">
                    <Button className="flex-1" style={{ backgroundColor: selectedAgent.color }}>
                      <Play className="mr-2 h-4 w-4" />
                      启动调试
                    </Button>
                    <Button variant="outline">
                      <Settings className="mr-2 h-4 w-4" />
                      配置
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
