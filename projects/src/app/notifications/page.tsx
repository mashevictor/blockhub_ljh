"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  content: string;
  type: string;
  channel: string;
  is_read: boolean;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Info; color: string }> = {
  info: { label: "信息", icon: Info, color: "text-blue-600 bg-blue-50" },
  warning: { label: "警告", icon: AlertTriangle, color: "text-amber-600 bg-amber-50" },
  success: { label: "成功", icon: CheckCircle, color: "text-green-600 bg-green-50" },
  approval: { label: "审批", icon: CheckCircle, color: "text-indigo-600 bg-indigo-50" },
};

const CHANNEL_LABELS: Record<string, string> = {
  inapp: "站内信",
  email: "邮件",
  im: "IM",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchNotifications = () => {
    const url = filter === "unread" ? "/api/notifications?is_read=false" : "/api/notifications";
    fetch(url)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setNotifications(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchNotifications(); }, [filter]);

  const markAsRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_read: true }),
    });
    fetchNotifications();
  };

  const markAllRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    await Promise.all(unread.map((n) => markAsRead(n.id)));
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">消息通知</h1>
          <p className="text-sm text-muted-foreground">
            L1 通知 Agent：多渠道消息推送
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={markAllRead}>
          <CheckCheck className="mr-1 h-4 w-4" /> 全部已读
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
          全部
        </Button>
        <Button variant={filter === "unread" ? "default" : "outline"} size="sm" onClick={() => setFilter("unread")}>
          未读
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="h-5 w-60 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <Bell className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <p className="text-sm font-medium">暂无通知</p>
            <p className="mt-1 text-xs text-muted-foreground">
              审批提醒、公告推送、待办通知等将显示在这里
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const typeCfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
            const TypeIcon = typeCfg.icon;
            return (
              <Card
                key={n.id}
                className={`border-0 shadow-sm transition-all ${
                  !n.is_read ? "border-l-2 border-l-indigo-500" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${typeCfg.color} flex-shrink-0`}>
                      <TypeIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm ${!n.is_read ? "font-medium" : ""}`}>{n.title}</p>
                        {!n.is_read && (
                          <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        )}
                      </div>
                      {n.content && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{n.content}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px]">
                          {CHANNEL_LABELS[n.channel] || n.channel}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(n.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {!n.is_read && (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => markAsRead(n.id)}>
                        标记已读
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
