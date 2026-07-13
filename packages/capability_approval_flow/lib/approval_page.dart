import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class ApprovalPage extends StatefulWidget {
  const ApprovalPage({super.key, required this.branding});

  final AppBranding branding;

  @override
  State<ApprovalPage> createState() => _ApprovalPageState();
}

class _ApprovalPageState extends State<ApprovalPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  String? _error;
  final _titleCtrl = TextEditingController();
  final _summaryCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _summaryCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final dio = getRuntimeAuthedDio();
      final resp = await dio.get<Map<String, dynamic>>('${widget.branding.apiBaseUrl}/approvals');
      _items = resp.data?['items'] as List<dynamic>? ?? [];
    } catch (e) {
      _error = '加载失败: $e';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submit() async {
    final title = _titleCtrl.text.trim();
    if (title.isEmpty) return;
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post(
        '${widget.branding.apiBaseUrl}/approvals',
        data: {'title': title, 'type': 'general', 'department': '', 'summary': _summaryCtrl.text.trim()},
      );
      _titleCtrl.clear();
      _summaryCtrl.clear();
      await _load();
    } catch (e) {
      setState(() => _error = '提交失败: $e');
    }
  }

  Future<void> _action(String id, String action) async {
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post(
        '${widget.branding.apiBaseUrl}/approvals/$id/action',
        data: {'action': action, 'comment': ''},
      );
      await _load();
    } catch (e) {
      setState(() => _error = '操作失败: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (_error != null)
          Container(
            color: Colors.red.shade50,
            padding: const EdgeInsets.all(8),
            child: Text(_error!, style: const TextStyle(color: Colors.red)),
          ),
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Expanded(child: TextField(controller: _titleCtrl, decoration: const InputDecoration(hintText: '审批标题', border: OutlineInputBorder()))),
              const SizedBox(width: 8),
              Expanded(child: TextField(controller: _summaryCtrl, decoration: const InputDecoration(hintText: '摘要', border: OutlineInputBorder()))),
              const SizedBox(width: 8),
              FilledButton(onPressed: _submit, child: const Text('提交')),
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : ListView.builder(
                  itemCount: _items.length,
                  itemBuilder: (context, i) {
                    final a = _items[i] as Map<String, dynamic>;
                    final status = a['status'] as String? ?? '';
                    final canAct = status == 'pending';
                    return Card(
                      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      child: ListTile(
                        title: Text(a['title']?.toString() ?? ''),
                        subtitle: Text('${a['applicant'] ?? ''} · $status'),
                        trailing: canAct
                            ? Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    color: Colors.green,
                                    icon: const Icon(Icons.check),
                                    onPressed: () => _action(a['id'].toString(), 'approve'),
                                  ),
                                  IconButton(
                                    color: Colors.red,
                                    icon: const Icon(Icons.close),
                                    onPressed: () => _action(a['id'].toString(), 'reject'),
                                  ),
                                ],
                              )
                            : null,
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}
