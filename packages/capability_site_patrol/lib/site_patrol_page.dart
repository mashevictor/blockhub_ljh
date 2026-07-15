import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

const _points = ['大门', '电梯厅', '消防通道', '配电间', '楼顶', '地下室'];

class SitePatrolPage extends StatefulWidget {
  const SitePatrolPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<SitePatrolPage> createState() => _SitePatrolPageState();
}

class _SitePatrolPageState extends State<SitePatrolPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  String? _msg;
  final _siteCtrl = TextEditingController();
  String _checkpoint = _points.first;

  String get _base => '${widget.branding.apiBaseUrl}/site-patrol';
  String get _appId => widget.branding.appPublicId.trim();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _siteCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final dio = getRuntimeAuthedDio();
      final q = _appId.isNotEmpty ? '?app_id=${Uri.encodeQueryComponent(_appId)}' : '';
      final resp = await dio.get<Map<String, dynamic>>('$_base/records$q');
      _items = resp.data?['items'] as List<dynamic>? ?? [];
    } catch (e) {
      _items = [];
      _msg = '$e';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _punch(String result) async {
    final site = _siteCtrl.text.trim();
    if (site.isEmpty) {
      setState(() => _msg = '请先填写巡逻站点');
      return;
    }
    setState(() {
      _busy = true;
      _msg = null;
    });
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'site_name': site,
        'checkpoint': _checkpoint,
        'result': result,
        'note': result == 'issue' ? '发现隐患，待跟进' : '',
        'app_public_id': _appId,
      });
      setState(() => _msg = result == 'ok' ? '已打卡：合格' : '已记录隐患');
      await _load();
    } catch (e) {
      setState(() => _msg = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _close(String id) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records/$id/close');
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    final open = _items
        .map((e) => Map<String, dynamic>.from(e as Map))
        .where((t) => '${t['status']}' == 'open')
        .toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('巡检打卡', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        TextField(
          controller: _siteCtrl,
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            hintText: '站点名称，如：A区物业',
          ),
        ),
        const SizedBox(height: 8),
        Text('打卡点', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
        const SizedBox(height: 6),
        Wrap(
          spacing: 8,
          runSpacing: 6,
          children: _points.map((p) {
            final selected = _checkpoint == p;
            return ChoiceChip(
              label: Text(p, style: const TextStyle(fontSize: 12)),
              selected: selected,
              selectedColor: color.withOpacity(0.2),
              onSelected: (_) => setState(() => _checkpoint = p),
            );
          }).toList(),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: color),
              onPressed: _busy ? null : () => _punch('ok'),
              child: const Text('合格打卡'),
            ),
            const SizedBox(width: 8),
            OutlinedButton(
              onPressed: _busy ? null : () => _punch('issue'),
              child: const Text('发现隐患'),
            ),
          ],
        ),
        if (_msg != null) ...[
          const SizedBox(height: 8),
          Text(_msg!, style: TextStyle(color: color, fontSize: 13)),
        ],
        const SizedBox(height: 16),
        Text('待结案${open.isEmpty ? '' : ' · ${open.length}'}', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else if (open.isEmpty)
          Text('暂无待结案记录', style: TextStyle(color: Colors.grey.shade600))
        else
          ...open.map((t) {
            final id = '${t['id']}';
            final result = '${t['result']}';
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${t['site_name']} · ${t['checkpoint']}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                        Chip(
                          label: Text(result == 'ok' ? '合格' : '隐患', style: const TextStyle(fontSize: 11)),
                          visualDensity: VisualDensity.compact,
                        ),
                      ],
                    ),
                    if ('${t['note'] ?? ''}'.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text('${t['note']}', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                      ),
                    const SizedBox(height: 8),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: color),
                      onPressed: () => _close(id),
                      child: const Text('结案'),
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }
}
