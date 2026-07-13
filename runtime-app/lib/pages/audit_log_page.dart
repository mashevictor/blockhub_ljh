import 'package:flutter/material.dart';

import '../config/app_branding.dart';

/// 操作审计日志（Flutter 专属页，非 ReportPage fallback）
class AuditLogPage extends StatelessWidget {
  const AuditLogPage({super.key, required this.branding});

  final AppBranding branding;

  static const _samples = [
    (action: '登录成功', actor: 'admin@demo.com', time: '2026-07-13 09:12', detail: 'Web 控制台'),
    (action: '发布应用', actor: 'ops@demo.com', time: '2026-07-12 18:40', detail: 'public_id=demo001'),
    (action: '修改角色', actor: 'admin@demo.com', time: '2026-07-12 11:05', detail: 'role=editor'),
    (action: '导出报表', actor: 'analyst@demo.com', time: '2026-07-11 16:22', detail: 'chart_dashboard'),
  ];

  @override
  Widget build(BuildContext context) {
    final color = Color(branding.primaryColorValue);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('操作审计日志', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        Text(
          '最近操作记录（管理员可见，演示数据）',
          style: TextStyle(color: Colors.grey.shade600),
        ),
        const SizedBox(height: 16),
        ..._samples.map(
          (row) => Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: color.withValues(alpha: 0.12),
                child: Icon(Icons.history, color: color, size: 20),
              ),
              title: Text(row.action),
              subtitle: Text('${row.actor} · ${row.detail}'),
              trailing: Text(
                row.time,
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
