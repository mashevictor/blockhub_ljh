import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

const _track = ['open', 'confirmed', 'done'];
const _label = {'open': '待办', 'confirmed': '已确认', 'done': '完成'};

class WeddingPlanPage extends StatefulWidget {
  const WeddingPlanPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<WeddingPlanPage> createState() => _WeddingPlanPageState();
}

class _WeddingPlanPageState extends State<WeddingPlanPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  String? _msg;
  final _titleCtrl = TextEditingController();
  final _vendorCtrl = TextEditingController();
  final _budgetCtrl = TextEditingController();

  String get _base => '${widget.branding.apiBaseUrl}/wedding-plan';
  String get _appId => widget.branding.appPublicId.trim();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _vendorCtrl.dispose();
    _budgetCtrl.dispose();
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

  Future<void> _submit() async {
    if (_titleCtrl.text.trim().isEmpty) {
      setState(() => _msg = '请填写必填项');
      return;
    }
    setState(() {
      _busy = true;
      _msg = null;
    });
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'category': 'guest',
        'title': _titleCtrl.text.trim(),
        'vendor': _vendorCtrl.text.trim(),
        'budget': _budgetCtrl.text.trim(),
        'note': '',
        'app_public_id': _appId,
      });
      _titleCtrl.clear();
      _vendorCtrl.clear();
      _budgetCtrl.clear();
      setState(() => _msg = '已创建');
      await _load();
    } catch (e) {
      setState(() => _msg = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _advance(String id, String action) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records/$id/$action');
    await _load();
  }

  Widget _progressBar(Color color, int idx) {
    return Row(
      children: [
        for (var i = 0; i < _track.length; i++)
          Expanded(
            child: Container(
              height: 6,
              margin: EdgeInsets.only(right: i < _track.length - 1 ? 4 : 0),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(3),
                color: i <= idx ? color : Colors.black12,
              ),
            ),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    final active = _items
        .map((e) => Map<String, dynamic>.from(e as Map))
        .where((t) => '${t['status']}' != 'done')
        .toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('婚礼筹备清单', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        TextField(
          controller: _titleCtrl,
          decoration: const InputDecoration(border: OutlineInputBorder(), hintText: '事项'),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _vendorCtrl,
          decoration: const InputDecoration(border: OutlineInputBorder(), hintText: '供应商'),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _budgetCtrl,
          decoration: const InputDecoration(border: OutlineInputBorder(), hintText: '预算'),
        ),
        const SizedBox(height: 12),
        ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: color),
          onPressed: _busy ? null : _submit,
          child: const Text('添加'),
        ),
        if (_msg != null) ...[
          const SizedBox(height: 8),
          Text(_msg!, style: TextStyle(color: color, fontSize: 13)),
        ],
        const SizedBox(height: 16),
        Text('进度', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else if (active.isEmpty)
          Text('暂无待办事项', style: TextStyle(color: Colors.grey.shade600))
        else
          ...active.map((t) {
            final id = '${t['id']}';
            final status = '${t['status']}';
            final idx = _track.indexOf(status);
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(child: Text('${t['title']}', style: const TextStyle(fontWeight: FontWeight.bold))),
                        Chip(
                          label: Text(_label[status] ?? status, style: const TextStyle(fontSize: 11)),
                          visualDensity: VisualDensity.compact,
                        ),
                      ],
                    ),
                    if ('${t['vendor'] ?? ''}'.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text('${t['vendor']}', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                      ),
                    const SizedBox(height: 8),
                    _progressBar(color, idx < 0 ? 0 : idx),
                    const SizedBox(height: 8),
                    if (status == 'open')
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: color),
                        onPressed: () => _advance(id, 'confirmed'),
                        child: const Text('确认'),
                      ),
                    if (status == 'confirmed')
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: color),
                        onPressed: () => _advance(id, 'done'),
                        child: const Text('完成'),
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
