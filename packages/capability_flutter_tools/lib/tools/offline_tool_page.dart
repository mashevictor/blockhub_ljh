import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class OfflineToolPage extends StatefulWidget {
  const OfflineToolPage({super.key, required this.branding});

  final AppBranding branding;

  @override
  State<OfflineToolPage> createState() => _OfflineToolPageState();
}

class _OfflineToolPageState extends State<OfflineToolPage> {
  final _keyCtrl = TextEditingController(text: 'draft_note');
  final _valCtrl = TextEditingController();
  String? _stored;
  String? _error;

  @override
  void dispose() {
    _keyCtrl.dispose();
    _valCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_keyCtrl.text.trim(), _valCtrl.text);
      if (!mounted) return;
      setState(() {
        _stored = _valCtrl.text;
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  Future<void> _load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final v = prefs.getString(_keyCtrl.text.trim());
      if (!mounted) return;
      setState(() {
        _stored = v;
        _valCtrl.text = v ?? '';
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('离线缓存', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),
        TextField(controller: _keyCtrl, decoration: const InputDecoration(labelText: '键', border: OutlineInputBorder())),
        const SizedBox(height: 8),
        TextField(controller: _valCtrl, decoration: const InputDecoration(labelText: '值', border: OutlineInputBorder()), maxLines: 3),
        const SizedBox(height: 12),
        Row(
          children: [
            FilledButton(onPressed: _save, style: FilledButton.styleFrom(backgroundColor: color), child: const Text('保存')),
            const SizedBox(width: 8),
            OutlinedButton(onPressed: _load, child: const Text('读取')),
          ],
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(_error!, style: const TextStyle(color: Colors.red)),
        ],
        if (_stored != null) ...[
          const SizedBox(height: 12),
          Text('本地: $_stored'),
        ],
      ],
    );
  }
}
