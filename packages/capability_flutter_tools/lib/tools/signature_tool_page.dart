import 'dart:convert';

import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'package:signature/signature.dart';

class SignatureToolPage extends StatefulWidget {
  const SignatureToolPage({super.key, required this.branding});

  final AppBranding branding;

  @override
  State<SignatureToolPage> createState() => _SignatureToolPageState();
}

class _SignatureToolPageState extends State<SignatureToolPage> {
  final _controller = SignatureController(penStrokeWidth: 3, penColor: Colors.black);
  String? _savedHint;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _export() async {
    if (_controller.isEmpty) return;
    final bytes = await _controller.toPngBytes();
    if (bytes == null) return;
    if (!mounted) return;
    setState(() => _savedHint = 'PNG ${bytes.length} bytes · base64 前 48 字符: ${base64Encode(bytes).substring(0, 48)}...');
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    return Column(
      children: [
        Expanded(
          child: Container(
            margin: const EdgeInsets.all(12),
            decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade400), borderRadius: BorderRadius.circular(8)),
            child: Signature(controller: _controller, backgroundColor: Colors.white),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              OutlinedButton(onPressed: _controller.clear, child: const Text('清除')),
              const SizedBox(width: 8),
              FilledButton(onPressed: _export, style: FilledButton.styleFrom(backgroundColor: color), child: const Text('导出 PNG')),
            ],
          ),
        ),
        if (_savedHint != null)
          Padding(padding: const EdgeInsets.all(12), child: Text(_savedHint!, style: const TextStyle(fontSize: 12))),
      ],
    );
  }
}
