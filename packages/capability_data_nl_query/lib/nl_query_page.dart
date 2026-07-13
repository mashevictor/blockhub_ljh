import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

/// 自然语言查询专属页（阶段 5 模块化示例）
class NLQueryPage extends StatelessWidget {
  const NLQueryPage({super.key, required this.branding});

  final AppBranding branding;

  static const _samples = [
    '本月销售额 Top5 门店',
    '待审批请假单数量',
    '知识库中关于报销政策的文档',
  ];

  @override
  Widget build(BuildContext context) {
    final color = Color(branding.primaryColorValue);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('自然语言查询', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        Text('用口语描述需求，系统自动解析为查询（演示）', style: TextStyle(color: Colors.grey.shade600)),
        const SizedBox(height: 16),
        ..._samples.map(
          (q) => Card(
            margin: const EdgeInsets.only(bottom: 10),
            child: ListTile(
              leading: Icon(Icons.search, color: color),
              title: Text(q),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
          ),
        ),
        const SizedBox(height: 12),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: color),
          onPressed: () {},
          child: const Text('新建查询'),
        ),
      ],
    );
  }
}
