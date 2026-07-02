"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  Calendar,
  User,
  FileText,
  MessageSquare,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

interface Approval {
  id: string;
  title: string;
  status: string;
  current_step: number;
  total_steps: number;
  applicant: string;
  form_data: Record<string, unknown> | null;
  comments: Array<{ action: string; comment: string; time: string; user: string }> | null;
  created_at: string;
  scenario_key: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: "审批中", color: "text-amber-600 bg-amber-50 border-amber-200", icon: Clock },
  approved: { label: "已通过", color: "text-green-600 bg-green-50 border-green-200", icon: CheckCircle },
  rejected: { label: "已拒绝", color: "text-red-600 bg-red-50 border-red-200", icon: XCircle },
};

// 模拟审批数据
const MOCK_APPROVALS: Approval[] = [
  {
    id: "1",
    title: "年假申请 - 张三",
    status: "pending",
    current_step: 1,
    total_steps: 2,
    applicant: "张三",
    form_data: { type: "年假", days: 3, start: "2026-07-10", end: "2026-07-12", reason: "家庭事务" },
    comments: [{ action: "submit", comment: "提交申请", time: "2026-07-01 10:30", user: "张三" }],
    created_at: "2026-07-01T10:30:00Z",
    scenario_key: "leave_apply",
  },
  {
    id: "2",
    title: "报销申请 - 李四",
    status: "pending",
    current_step: 1,
    total_steps: 3,
    applicant: "李四",
    form_data: { type: "差旅报销", amount: 3580, items: "机票+酒店+交通" },
    comments: [{ action: "submit", comment: "提交报销申请", time: "2026-07-01 09:15", user: "李四" }],
    created_at: "2026-07-01T09:15:00Z",
    scenario_key: "expense_reimburse",
  },
  {
    id: "3",
    title: "加班申请 - 王五",
    status: "approved",
    current_step: 2,
    total_steps: 2,
    applicant: "王五",
    form_data: { type: "工作日加班", hours: 4, date: "2026-06-28", reason: "项目上线" },
    comments: [
      { action: "submit", comment: "提交申请", time: "2026-06-28 18:00", user: "王五" },
      { action: "approve", comment: "同意", time: "2026-06-28 18:30", user: "部门经理" },
    ],
    created_at: "2026-06-28T18:00:00Z",
    scenario_key: "overtime_apply",
  },
];

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [actionDialog, setActionDialog] = useState<{ open: boolean; action: "approve" | "reject" }>({
    open: false,
    action: "approve",
  });
  const [comment, setComment] = useState("");

  const fetchApprovals = () => {
    const url = filter === "all" ? "/api/approvals" : `/api/approvals?status=${filter}`;
    fetch(url)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          // Merge with mock data if empty
          if (res.data.length === 0) {
            setApprovals(MOCK_APPROVALS);
          } else {
            setApprovals(res.data);
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setApprovals(MOCK_APPROVALS);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchApprovals();
  }, [filter]);

  const handleAction = async (id: string, action: "approve" | "reject") => {
    await fetch("/api/approvals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, comment }),
    });
    setActionDialog({ open: false, action: "approve" });
    setComment("");
    fetchApprovals();
    setSelectedApproval(null);
  };

  const pendingCount = approvals.filter((a) => a.status === "pending").length;
  const approvedCount = approvals.filter((a) => a.status === "approved").length;
  const rejectedCount = approvals.filter((a) => a.status === "rejected").length;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold">审批流程</h1>
        <p className="text-sm text-muted-foreground">
          L1 审批 Agent：多级审批、会签、条件分支
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">待审批</p>
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
                <p className="text-2xl font-bold">{approvedCount}</p>
                <p className="text-xs text-muted-foreground">已通过</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rejectedCount}</p>
                <p className="text-xs text-muted-foreground">已拒绝</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        {[
          { key: "all", label: "全部", count: approvals.length },
          { key: "pending", label: "审批中", count: pendingCount },
          { key: "approved", label: "已通过", count: approvedCount },
          { key: "rejected", label: "已拒绝", count: rejectedCount },
        ].map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <Badge variant="secondary" className="ml-2 text-[10px]">
              {f.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Approval List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="h-6 w-48 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((approval) => {
            const config = STATUS_CONFIG[approval.status] || STATUS_CONFIG.pending;
            const StatusIcon = config.icon;
            return (
              <Card
                key={approval.id}
                className="cursor-pointer border-0 shadow-sm transition-all hover:shadow-md"
                onClick={() => setSelectedApproval(approval)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.color}`}>
                      <StatusIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium truncate">{approval.title}</h3>
                        <Badge variant="outline" className={`text-[10px] ${config.color}`}>
                          {config.label}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {approval.applicant}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(approval.created_at).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          步骤 {approval.current_step}/{approval.total_steps}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedApproval} onOpenChange={() => setSelectedApproval(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedApproval?.title}</DialogTitle>
            <DialogDescription>审批详情与操作</DialogDescription>
          </DialogHeader>
          {selectedApproval && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={STATUS_CONFIG[selectedApproval.status]?.color}
                >
                  {STATUS_CONFIG[selectedApproval.status]?.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  步骤 {selectedApproval.current_step}/{selectedApproval.total_steps}
                </span>
              </div>

              {/* Form Data */}
              {selectedApproval.form_data && (
                <Card className="border-0 bg-slate-50 shadow-none">
                  <CardContent className="p-4">
                    <h4 className="text-xs font-medium mb-2">申请信息</h4>
                    <div className="space-y-1.5">
                      {Object.entries(selectedApproval.form_data).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{key}</span>
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Timeline */}
              <div>
                <h4 className="text-xs font-medium mb-2">审批时间线</h4>
                <div className="space-y-2">
                  {selectedApproval.comments?.map((c, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                      <div className="flex-1 text-xs">
                        <span className="font-medium">{c.user}</span>
                        <span className="text-muted-foreground"> {c.comment}</span>
                        <span className="ml-2 text-slate-400">{c.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Actions */}
              {selectedApproval.status === "pending" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">审批意见</Label>
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="输入审批意见..."
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => handleAction(selectedApproval.id, "approve")}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      通过
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-red-600 hover:bg-red-50"
                      onClick={() => handleAction(selectedApproval.id, "reject")}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      拒绝
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
