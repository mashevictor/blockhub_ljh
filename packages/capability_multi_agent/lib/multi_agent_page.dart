import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:capability_chat_qa/capability_chat_qa.dart';
import 'package:flutter/material.dart';

const String multiAgentCapabilityKey = 'multi_agent';

class MultiAgentPage extends StatelessWidget {
  const MultiAgentPage({super.key, required this.branding});

  final AppBranding branding;

  static const _agents = ['默认助手', '审批助手', '数据助手'];

  @override
  Widget build(BuildContext context) {
    final color = Color(branding.primaryColorValue);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
          child: Wrap(
            spacing: 8,
            children: _agents
                .map(
                  (name) => Chip(
                    label: Text(name),
                    backgroundColor: color.withValues(alpha: 0.12),
                    side: BorderSide(color: color.withValues(alpha: 0.35)),
                  ),
                )
                .toList(),
          ),
        ),
        Expanded(child: ChatPage(branding: branding)),
      ],
    );
  }
}
