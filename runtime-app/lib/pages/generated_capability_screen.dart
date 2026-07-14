import 'package:flutter/material.dart';

/// AI codegen 占位壳：展示未知能力的标题 / 摘要 / 建议操作（第一期不编译完整 capability 包）。
class GeneratedCapabilityScreen extends StatelessWidget {
  const GeneratedCapabilityScreen({
    super.key,
    required this.capabilityKey,
    this.title,
    this.summary,
    this.actions = const [],
  });

  final String capabilityKey;
  final String? title;
  final String? summary;
  final List<String> actions;

  @override
  Widget build(BuildContext context) {
    final heading = (title != null && title!.trim().isNotEmpty)
        ? title!.trim()
        : capabilityKey;
    final body = (summary != null && summary!.trim().isNotEmpty)
        ? summary!.trim()
        : '该能力由 DeepSeek 异步生成占位页。正式包将在后续迭代接入。';
    final chips = actions.isNotEmpty ? actions : ['刷新预览', '反馈需求'];

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text(heading, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 8),
            Text(
              'capability: $capabilityKey',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).hintColor,
                  ),
            ),
            const SizedBox(height: 16),
            Text(body, style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 24),
            ...chips.map(
              (label) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: OutlinedButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('「$label」已记录（占位）')),
                    );
                  },
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text(label),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
