import 'package:flutter/material.dart';

import '../config/app_branding.dart';

/// 数据脱敏展示（Flutter 专属页）
class SecurityMaskPage extends StatefulWidget {
  const SecurityMaskPage({super.key, required this.branding});

  final AppBranding branding;

  @override
  State<SecurityMaskPage> createState() => _SecurityMaskPageState();
}

class _SecurityMaskPageState extends State<SecurityMaskPage> {
  _MaskMode _mode = _MaskMode.phone;
  bool _revealed = false;

  static const _samples = {
    _MaskMode.phone: '13812345678',
    _MaskMode.idCard: '310101199001011234',
    _MaskMode.email: 'zhangsan@company.com',
    _MaskMode.salary: '28500.00',
  };

  String _mask(_MaskMode mode, String raw) {
    switch (mode) {
      case _MaskMode.phone:
        return raw.replaceAllMapped(
          RegExp(r'(\d{3})\d{4}(\d{4})'),
          (m) => '${m[1]}****${m[2]}',
        );
      case _MaskMode.idCard:
        return raw.replaceAllMapped(
          RegExp(r'(\d{6})\d{8}(\d{4})'),
          (m) => '${m[1]}********${m[2]}',
        );
      case _MaskMode.email:
        final parts = raw.split('@');
        if (parts.length != 2) return raw;
        return '${parts[0].substring(0, 2)}***@${parts[1]}';
      case _MaskMode.salary:
        return '¥ ****';
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    final raw = _samples[_mode]!;
    final display = _revealed ? raw : _mask(_mode, raw);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('数据脱敏展示', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        Text(
          '按字段策略脱敏，授权后可查看原文',
          style: TextStyle(color: Colors.grey.shade600),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _MaskMode.values.map((mode) {
            final selected = _mode == mode;
            return ChoiceChip(
              label: Text(mode.label),
              selected: selected,
              selectedColor: color.withValues(alpha: 0.15),
              onSelected: (_) => setState(() {
                _mode = mode;
                _revealed = false;
              }),
            );
          }).toList(),
        ),
        const SizedBox(height: 24),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_mode.label, style: TextStyle(color: Colors.grey.shade600)),
                const SizedBox(height: 8),
                Text(
                  display,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontFamily: 'monospace',
                      ),
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: () => setState(() => _revealed = !_revealed),
                  icon: Icon(_revealed ? Icons.visibility_off : Icons.visibility),
                  label: Text(_revealed ? '隐藏原文' : '授权查看'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

enum _MaskMode {
  phone('手机号'),
  idCard('身份证'),
  email('邮箱'),
  salary('薪资');

  const _MaskMode(this.label);
  final String label;
}
