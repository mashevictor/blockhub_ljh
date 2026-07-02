import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "TrackChat PaaS - 智能办公平台",
  description: "7 PaaS Agent 承载 36 Capability，驱动 65 办公场景 + 49 行业场景",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased bg-slate-50">
        <Sidebar />
        <main className="ml-[260px] min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
