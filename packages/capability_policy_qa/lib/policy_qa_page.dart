import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class PolicyQaPage extends StatefulWidget {
  const PolicyQaPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<PolicyQaPage> createState() => _PolicyQaPageState();
}

class _PolicyQaPageState extends State<PolicyQaPage> {
  List<dynamic> _items = [];
  Map<String, dynamic>? _latest;
  bool _loading = true;
  bool _busy = false;
  int _resetKey = 0;
  String _msg = '';
  final Map<String, String> _values = {};

  String get _base => '${widget.branding.apiBaseUrl}/policy-qa';
  String get _appId => widget.branding.appPublicId.trim();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final dio = getRuntimeAuthedDio();
      final q = _appId.isNotEmpty ? '?app_id=${Uri.encodeQueryComponent(_appId)}' : '';
      final resp = await dio.get<Map<String, dynamic>>('$_base/records$q');
      _items = resp.data?['items'] as List<dynamic>? ?? [];
    } catch (_) {
      _items = [];
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _ask() async {
    final query = (_values['query'] ?? '').trim();
    if (query.isEmpty) return;
    setState(() {
      _busy = true;
      _msg = '';
      _latest = null;
    });
    try {
      final dio = getRuntimeAuthedDio();
      final resp = await dio.post<Map<String, dynamic>>('$_base/answer', data: {
        'query': query,
        'app_public_id': _appId,
      });
      _latest = resp.data?['record'] as Map<String, dynamic>?;
      _values.clear();
      _resetKey++;
      await _load();
    } catch (e) {
      _msg = '$e';
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        GtgtStepComposer(
          title: '制度问答',
          flowHint: '问一句 → 自动答复 → 可再问',
          accent: color,
          steps: const [
            GtgtStep(
              key: 'query',
              label: '你想查哪条制度 / 福利？',
              placeholder: '例如：年假怎么申请？',
            ),
          ],
          values: _values,
          onChanged: (k, v) => setState(() => _values[k] = v),
          onComplete: _ask,
          busy: _busy,
          resetKey: _resetKey,
          submitLabel: '帮我查',
        ),
        if (_msg.isNotEmpty) Text(_msg, style: const TextStyle(color: Colors.red)),
        if (_latest != null) ...[
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${_latest!['title']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                  if ('${_latest!['dept'] ?? ''}'.isNotEmpty) Text('建议咨询 · ${_latest!['dept']}'),
                  const SizedBox(height: 8),
                  Text('${_latest!['answer'] ?? ''}'),
                  if ('${_latest!['note'] ?? ''}'.isNotEmpty)
                    Text('${_latest!['note']}', style: TextStyle(color: Colors.grey.shade700, fontSize: 12)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: color),
                        onPressed: () => setState(() => _latest = null),
                        child: const Text('有用'),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton(
                        onPressed: () => setState(() {
                          _latest = null;
                          _resetKey++;
                        }),
                        child: const Text('再问'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
        const SizedBox(height: 12),
        Text('历史问答', style: Theme.of(context).textTheme.titleSmall),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else if (_items.isEmpty)
          const Text('还没有问答记录')
        else
          ..._items.map((raw) {
            final t = Map<String, dynamic>.from(raw as Map);
            return Card(
              child: ListTile(
                title: Text('${t['title']}'),
                subtitle: Text('${t['answer'] ?? t['note'] ?? ''}'),
              ),
            );
          }),
      ],
    );
  }
}
