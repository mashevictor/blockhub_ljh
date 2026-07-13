import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class KbPage extends StatefulWidget {
  const KbPage({super.key, required this.branding});

  final AppBranding branding;

  @override
  State<KbPage> createState() => _KbPageState();
}

class _KbPageState extends State<KbPage> {
  List<Map<String, dynamic>> _docs = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final dio = getRuntimeAuthedDio();
      final resp = await dio.get<Map<String, dynamic>>(
        '${widget.branding.apiBaseUrl}/kb/documents',
      );
      final items = resp.data?['items'] as List<dynamic>? ?? [];
      _docs = items.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      _error = null;
    } catch (e) {
      _error = '加载知识库失败: $e';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    if (_loading) return const Center(child: CircularProgressIndicator());
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('知识库', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          Text('制度、手册与 SOP 文档', style: TextStyle(color: Colors.grey.shade600)),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: Colors.red)),
          ],
          const SizedBox(height: 16),
          if (_docs.isEmpty)
            const Card(
              child: ListTile(
                leading: Icon(Icons.folder_open),
                title: Text('暂无文档'),
                subtitle: Text('可在 Web 端上传 PDF / Markdown'),
              ),
            )
          else
            ..._docs.map(
              (doc) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: Icon(Icons.description, color: color),
                  title: Text(doc['title']?.toString() ?? doc['filename']?.toString() ?? '文档'),
                  subtitle: Text(doc['status']?.toString() ?? ''),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
