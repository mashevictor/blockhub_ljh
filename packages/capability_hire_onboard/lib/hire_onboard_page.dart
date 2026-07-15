import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

const _columns = [
  ('open', '候选人', null),
  ('interview', '面试', 'interview'),
  ('offered', 'Offer', 'offered'),
  ('joined', '已入职', 'joined'),
];

class HireOnboardPage extends StatefulWidget {
  const HireOnboardPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<HireOnboardPage> createState() => _HireOnboardPageState();
}

class _HireOnboardPageState extends State<HireOnboardPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  String? _msg;
  final _candidateCtrl = TextEditingController();
  final _stageCtrl = TextEditingController();

  String get _base => '${widget.branding.apiBaseUrl}/hire-onboard';
  String get _appId => widget.branding.appPublicId.trim();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _candidateCtrl.dispose();
    _stageCtrl.dispose();
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
    final candidate = _candidateCtrl.text.trim();
    if (candidate.isEmpty) return;
    setState(() {
      _busy = true;
      _msg = null;
    });
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'category': 'job',
        'candidate': candidate,
        'stage': _stageCtrl.text.trim().isEmpty ? '初筛' : _stageCtrl.text.trim(),
        'owner': widget.branding.appName,
        'note': '',
        'app_public_id': _appId,
      });
      _candidateCtrl.clear();
      _stageCtrl.clear();
      setState(() => _msg = '已加入招聘板');
      await _load();
    } catch (e) {
      setState(() => _msg = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _move(String id, String action) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records/$id/$action');
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                SizedBox(
                  width: 160,
                  child: TextField(
                    controller: _candidateCtrl,
                    decoration: const InputDecoration(labelText: '候选人 / 岗位', isDense: true),
                    onSubmitted: (_) => _submit(),
                  ),
                ),
                SizedBox(
                  width: 100,
                  child: TextField(
                    controller: _stageCtrl,
                    decoration: const InputDecoration(labelText: '阶段', isDense: true),
                  ),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: color),
                  onPressed: _busy || _candidateCtrl.text.trim().isEmpty ? null : _submit,
                  child: const Text('录入'),
                ),
              ],
            ),
          ),
        ),
        if (_msg != null) ...[
          const SizedBox(height: 8),
          Text(_msg!, style: TextStyle(color: color, fontSize: 13)),
        ],
        const SizedBox(height: 12),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else
          SizedBox(
            height: 420,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: _columns.map((col) {
                final (key, label, action) = col;
                final colItems = _items
                    .map((e) => Map<String, dynamic>.from(e as Map))
                    .where((t) => '${t['status']}' == key)
                    .toList();
                return SizedBox(
                  width: 180,
                  child: Card(
                    margin: const EdgeInsets.only(right: 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          color: key == 'open' ? color : Colors.black12,
                          child: Text(
                            '$label · ${colItems.length}',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: key == 'open' ? Colors.white : null,
                            ),
                          ),
                        ),
                        Expanded(
                          child: ListView(
                            padding: const EdgeInsets.all(8),
                            children: [
                              ...colItems.map((t) {
                                final id = '${t['id']}';
                                final stage = '${t['stage'] ?? ''}';
                                final owner = '${t['owner'] ?? ''}';
                                return Card(
                                  child: Padding(
                                    padding: const EdgeInsets.all(8),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('${t['candidate']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                        Text(
                                          '${stage.isEmpty ? '—' : stage}${owner.isEmpty ? '' : ' · $owner'}',
                                          style: const TextStyle(fontSize: 12),
                                        ),
                                        Wrap(
                                          children: _columns
                                              .where((c) => c.$3 != null && c.$1 != key)
                                              .map(
                                                (c) => TextButton(
                                                  onPressed: () => _move(id, c.$3!),
                                                  child: Text('→${c.$2}', style: const TextStyle(fontSize: 11)),
                                                ),
                                              )
                                              .toList(),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              }),
                              if (colItems.isEmpty)
                                const Padding(
                                  padding: EdgeInsets.all(8),
                                  child: Text('空', style: TextStyle(color: Colors.grey)),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
      ],
    );
  }
}
