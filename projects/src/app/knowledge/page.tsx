"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Plus,
  FileText,
  Search,
  Upload,
  FolderOpen,
  Clock,
  CheckCircle2,
  Loader2,
  Database,
  Layers,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  doc_count: number;
  status: string;
  created_at: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  status: string;
  chunks: number;
  created_at: string;
}

// 模拟文档数据
const MOCK_DOCS: Document[] = [
  { id: "1", name: "员工手册 2026.pdf", type: "pdf", size: 2048000, status: "completed", chunks: 45, created_at: "2026-06-28" },
  { id: "2", name: "产品使用指南.docx", type: "docx", size: 1024000, status: "completed", chunks: 28, created_at: "2026-06-27" },
  { id: "3", name: "公司制度汇编.pdf", type: "pdf", size: 5120000, status: "processing", chunks: 0, created_at: "2026-07-01" },
];

export default function KnowledgePage() {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedKB, setSelectedKB] = useState<KnowledgeBase | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchKBs = () => {
    fetch("/api/knowledge")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setKbs(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchKBs();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const res = await fetch("/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, description: newDesc }),
    });
    const data = await res.json();
    if (data.success) {
      setDialogOpen(false);
      setNewName("");
      setNewDesc("");
      fetchKBs();
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">知识库</h1>
          <p className="text-sm text-muted-foreground">
            L2 知识库 Agent：文档上传、切片、向量化、语义检索
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> 新建知识库
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建知识库</DialogTitle>
              <DialogDescription>创建一个新的知识库用于存储和检索文档</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label className="text-xs">名称</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="输入知识库名称"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">描述</Label>
                <Textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="输入知识库描述"
                  className="mt-1"
                />
              </div>
              <Button onClick={handleCreate} className="w-full">
                创建
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pipeline Visualization */}
      <Card className="mb-6 border-0 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-none">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium">知识库处理流程</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {["上传文档", "解析内容", "智能切片", "向量化", "建立索引", "语义检索"].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white">
                  {step}
                </div>
                {i < 5 && <span className="text-emerald-400">→</span>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <FolderOpen className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kbs.length}</p>
                <p className="text-xs text-muted-foreground">知识库</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{MOCK_DOCS.length}</p>
                <p className="text-xs text-muted-foreground">文档</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                <Layers className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{MOCK_DOCS.reduce((a, d) => a + d.chunks, 0)}</p>
                <p className="text-xs text-muted-foreground">切片</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <CheckCircle2 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{MOCK_DOCS.filter((d) => d.status === "completed").length}</p>
                <p className="text-xs text-muted-foreground">已索引</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">知识库列表</TabsTrigger>
          <TabsTrigger value="docs">文档管理</TabsTrigger>
          <TabsTrigger value="search">语义检索</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="animate-pulse border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="h-6 w-32 rounded bg-muted" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : kbs.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
                  <BookOpen className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="mb-2 text-lg font-medium">暂无知识库</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  创建知识库开始管理您的文档
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> 创建知识库
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {kbs.map((kb) => (
                <Card
                  key={kb.id}
                  className="cursor-pointer border-0 shadow-sm transition-all hover:shadow-md"
                  onClick={() => setSelectedKB(kb)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                        <BookOpen className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium truncate">{kb.name}</h3>
                        <p className="text-xs text-muted-foreground">{kb.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {kb.doc_count} 文档
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {kb.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="docs">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">文档管理</CardTitle>
                  <CardDescription>管理知识库中的文档</CardDescription>
                </div>
                <Button size="sm">
                  <Upload className="mr-2 h-4 w-4" /> 上传文档
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {MOCK_DOCS.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                      <FileText className="h-5 w-5 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatSize(doc.size)}</span>
                        <span>{doc.chunks} 切片</span>
                        <span>{doc.created_at}</span>
                      </div>
                    </div>
                    {doc.status === "processing" ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                        <Badge variant="secondary" className="text-[10px] text-amber-600">
                          处理中
                        </Badge>
                      </div>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] text-green-600">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> 已索引
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">语义检索</CardTitle>
              <CardDescription>使用自然语言搜索知识库内容</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="输入问题或关键词进行语义搜索..."
                  className="pl-10"
                />
              </div>
              {searchQuery && (
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm text-muted-foreground">
                    搜索 &quot;{searchQuery}&quot; 的结果将显示在这里...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
