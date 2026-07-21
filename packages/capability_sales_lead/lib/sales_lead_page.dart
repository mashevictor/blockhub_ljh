import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

typedef _Role = String;
typedef _Method = String;

const _roles = <(_Role, String)>[
  ('sales_rep', '一线销售'),
  ('sales_manager', '销售主管'),
  ('sales_marketing', '市场'),
];

class SalesLeadPage extends StatefulWidget {
  const SalesLeadPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<SalesLeadPage> createState() => _SalesLeadPageState();
}

class _SalesLeadPageState extends State<SalesLeadPage> {
  _Role _role = 'sales_rep';
  _Method _method = 'capture';
  List<dynamic> _items = [];
  List<dynamic> _channels = [];
  bool _loading = true;
  bool _busy = false;
  int _resetKey = 0;
  String? _msg;
  final Map<String, String> _values = {};

  String get _base => '${widget.branding.apiBaseUrl}/sales-lead';
  String get _appId => widget.branding.appPublicId.trim();

  List<(_Method, String)> get _methodTabs {
    if (_role == 'sales_marketing') {
      return const [('capture', '录入'), ('referral', '转介绍'), ('pipeline', '跟进成交')];
    }
    if (_role == 'sales_manager') {
      return const [
        ('assign', '分配'),
        ('clean', '清洗'),
        ('score', '评分'),
        ('capture', '录入'),
        ('pipeline', '跟进成交'),
      ];
    }
    return const [('capture', '录入'), ('referral', '转介绍'), ('pool', '待领取'), ('pipeline', '跟进成交')];
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final dio = getRuntimeAuthedDio();
      final params = <String, String>{'role': _role};
      if (_appId.isNotEmpty) params['app_id'] = _appId;
      if (_method == 'pool') params['pool_status'] = 'pool';
      final q = '?${params.entries.map((e) => '${e.key}=${Uri.encodeQueryComponent(e.value)}').join('&')}';
      final resp = await dio.get<Map<String, dynamic>>('$_base/records$q');
      _items = resp.data?['items'] as List<dynamic>? ?? [];
      if (_role == 'sales_marketing' || _method == 'capture') {
        final cq = _appId.isNotEmpty ? '?app_id=${Uri.encodeQueryComponent(_appId)}' : '';
        final ch = await dio.get<Map<String, dynamic>>('$_base/channel-stats$cq');
        _channels = ch.data?['items'] as List<dynamic>? ?? [];
      } else {
        _channels = [];
      }
    } catch (e) {
      _items = [];
      _channels = [];
      _msg = '$e';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<GtgtStep> get _steps {
    switch (_method) {
      case 'capture':
        return const [
          GtgtStep(key: 'customer', label: '公司/客户', placeholder: '公司全称'),
          GtgtStep(key: 'source', label: '渠道来源', placeholder: '展会 / 官网 / 投放…'),
          GtgtStep(key: 'note', label: '备注（可空）', placeholder: '要点', multiline: true, optional: true),
        ];
      case 'referral':
        return const [
          GtgtStep(key: 'customer', label: '公司/客户', placeholder: '公司全称'),
          GtgtStep(key: 'referrer', label: '推荐人', placeholder: '老客户名称'),
          GtgtStep(key: 'note', label: '备注（可空）', placeholder: '可选', multiline: true, optional: true),
        ];
      case 'assign':
        return const [
          GtgtStep(key: 'lead_key', label: '线索', placeholder: '客户名 / 单号 / ID'),
          GtgtStep(key: 'assignee', label: '负责人', placeholder: '销售员姓名'),
          GtgtStep(key: 'note', label: '备注（可空）', placeholder: '可选', multiline: true, optional: true),
        ];
      case 'clean':
        return const [
          GtgtStep(key: 'lead_key', label: '线索', placeholder: '客户名 / 单号 / ID'),
          GtgtStep(
            key: 'result',
            label: '清洗结果',
            choices: [
              (value: '有效', label: '有效'),
              (value: '无效', label: '无效'),
              (value: '重复', label: '重复'),
              (value: '待领取', label: '待领取'),
            ],
          ),
          GtgtStep(key: 'reason', label: '原因（可空）', placeholder: '空号…', multiline: true, optional: true),
        ];
      case 'pool':
        return const [
          GtgtStep(key: 'lead_key', label: '待领取线索', placeholder: '客户名 / 单号 / ID'),
          GtgtStep(key: 'reason', label: '领取理由（可空）', placeholder: '可选', multiline: true, optional: true),
        ];
      case 'score':
        return const [
          GtgtStep(key: 'lead_key', label: '线索', placeholder: '客户名 / 单号 / ID'),
          GtgtStep(key: 'score', label: '评分 1-100', placeholder: '如 80'),
          GtgtStep(key: 'comment', label: '说明（可空）', placeholder: '可选', multiline: true, optional: true),
        ];
      default:
        return const [];
    }
  }

  String get _title {
    return switch (_method) {
      'capture' => '多渠道录入',
      'referral' => '转介绍线索',
      'assign' => '分配线索',
      'clean' => '清洗线索',
      'pool' => '领取线索',
      'score' => '线索评分',
      _ => '跟进成交',
    };
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _msg = null;
    });
    try {
      final dio = getRuntimeAuthedDio();
      final app = _appId;
      if (_method == 'capture' || _method == 'referral') {
        final customer = (_values['customer'] ?? '').trim();
        if (customer.isEmpty) return;
        await dio.post('$_base/records', data: {
          'category': _method == 'referral' ? 'referral-lead' : 'lead-capture',
          'customer': customer,
          'source': _method == 'referral' ? '转介绍' : (_values['source'] ?? '').trim(),
          'referrer': (_values['referrer'] ?? '').trim(),
          'note': (_values['note'] ?? '').trim(),
          'owner': '',
          'amount': '',
          'app_public_id': app,
        });
      } else if (_method == 'assign') {
        await dio.post('$_base/records/assign', data: {
          'lead_key': (_values['lead_key'] ?? '').trim(),
          'assignee': (_values['assignee'] ?? '').trim(),
          'note': (_values['note'] ?? '').trim(),
          'app_public_id': app,
        });
      } else if (_method == 'clean') {
        await dio.post('$_base/records/clean', data: {
          'lead_key': (_values['lead_key'] ?? '').trim(),
          'result': (_values['result'] ?? '').trim(),
          'reason': (_values['reason'] ?? '').trim(),
          'app_public_id': app,
        });
      } else if (_method == 'pool') {
        await dio.post('$_base/records/claim', data: {
          'lead_key': (_values['lead_key'] ?? '').trim(),
          'reason': (_values['reason'] ?? '').trim(),
          'app_public_id': app,
        });
      } else if (_method == 'score') {
        await dio.post('$_base/records/score', data: {
          'lead_key': (_values['lead_key'] ?? '').trim(),
          'score': int.tryParse((_values['score'] ?? '').trim()) ?? 0,
          'comment': (_values['comment'] ?? '').trim(),
          'app_public_id': app,
        });
      }
      _values.clear();
      setState(() {
        _resetKey++;
        _msg = '已写入真库';
      });
      await _load();
    } catch (e) {
      setState(() => _msg = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _move(String id, String action) async {
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records/$id/$action');
      await _load();
    } catch (e) {
      setState(() => _msg = '$e');
    }
  }

  Future<void> _release(String id) async {
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records/release', data: {'lead_key': id, 'app_public_id': _appId});
      setState(() => _msg = '已退回待领取');
      await _load();
    } catch (e) {
      setState(() => _msg = '$e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    final tabs = _methodTabs;
    if (!tabs.any((t) => t.$1 == _method)) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) setState(() => _method = tabs.first.$1);
      });
    }

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final r in _roles)
              ChoiceChip(
                label: Text(r.$2, style: const TextStyle(fontSize: 12)),
                selected: _role == r.$1,
                selectedColor: color.withValues(alpha: 0.25),
                onSelected: (_) {
                  setState(() {
                    _role = r.$1;
                    _method = r.$1 == 'sales_manager'
                        ? 'assign'
                        : r.$1 == 'sales_marketing'
                            ? 'capture'
                            : 'pool';
                    _values.clear();
                    _resetKey++;
                  });
                  _load();
                },
              ),
          ],
        ),
        const SizedBox(height: 10),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (final t in tabs)
                Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: TextButton(
                    onPressed: () {
                      setState(() {
                        _method = t.$1;
                        _values.clear();
                        _resetKey++;
                      });
                      _load();
                    },
                    child: Text(
                      t.$2,
                      style: TextStyle(
                        fontWeight: _method == t.$1 ? FontWeight.bold : FontWeight.normal,
                        color: _method == t.$1 ? color : null,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
        if (_role == 'sales_marketing' && _channels.isNotEmpty && _method != 'pipeline') ...[
          const SizedBox(height: 8),
          SizedBox(
            height: 72,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                for (final raw in _channels)
                  Builder(builder: (_) {
                    final c = Map<String, dynamic>.from(raw as Map);
                    final rate = ((c['win_rate'] as num?)?.toDouble() ?? 0) * 100;
                    return Card(
                      margin: const EdgeInsets.only(right: 8),
                      child: Padding(
                        padding: const EdgeInsets.all(10),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${c['source']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            Text(
                              '${c['total']} 条 · 成交 ${c['won']} · ${rate.toStringAsFixed(0)}%',
                              style: const TextStyle(fontSize: 11, color: Colors.black54),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
              ],
            ),
          ),
        ],
        if (_method != 'pipeline' && _steps.isNotEmpty) ...[
          const SizedBox(height: 8),
          GtgtStepComposer(
            title: _title,
            flowHint: '获客方法 · >> 单字段推进',
            accent: color,
            steps: _steps,
            values: _values,
            onChanged: (k, v) => setState(() => _values[k] = v),
            onComplete: _submit,
            busy: _busy,
            resetKey: _resetKey,
            submitLabel: '确认',
          ),
        ],
        if (_msg != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(_msg!, style: const TextStyle(fontSize: 12, color: Colors.black54)),
          ),
        const SizedBox(height: 12),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else if (_method == 'pipeline')
          ..._buildPipeline(color)
        else
          ..._buildList(color),
      ],
    );
  }

  List<Widget> _buildList(Color color) {
    if (_items.isEmpty) {
      return [const Text('空库 · 用上方方法写入后刷新可见', style: TextStyle(color: Colors.grey))];
    }
    return [
      for (final raw in _items)
        Builder(builder: (_) {
          final t = Map<String, dynamic>.from(raw as Map);
          final pool = '${t['pool_status'] ?? 'private'}';
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${t['customer']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                  Text(
                    '${t['record_no']}'
                    '${'${t['source'] ?? ''}'.isEmpty ? '' : ' · ${t['source']}'}'
                    '${'${t['owner'] ?? ''}'.isEmpty ? '' : ' · ${t['owner']}'}'
                    ' · $pool',
                    style: const TextStyle(fontSize: 12, color: Colors.black54),
                  ),
                  Wrap(
                    children: [
                      if (pool == 'pool' && _role == 'sales_rep')
                        TextButton(
                          onPressed: () {
                            setState(() {
                              _method = 'pool';
                              _values['lead_key'] = '${t['customer']}';
                              _resetKey++;
                            });
                          },
                          child: const Text('领取', style: TextStyle(fontSize: 12)),
                        ),
                      if (_role == 'sales_manager' && pool == 'private' && '${t['status']}' == 'open')
                        TextButton(
                          onPressed: () => _release('${t['id']}'),
                          child: const Text('退回待领取', style: TextStyle(fontSize: 12)),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          );
        }),
    ];
  }

  List<Widget> _buildPipeline(Color color) {
    const cols = [
      ('open', '新线索', null),
      ('following', '跟进中', 'following'),
      ('won', '成交', 'won'),
      ('lost', '丢单', 'lost'),
    ];
    return [
      SizedBox(
        height: 420,
        child: ListView(
          scrollDirection: Axis.horizontal,
          children: cols.map((col) {
            final (key, label, _) = col;
            final colItems = _items
                .map((e) => Map<String, dynamic>.from(e as Map))
                .where((t) => '${t['status']}' == key)
                .toList();
            return SizedBox(
              width: 200,
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
                            return Card(
                              child: Padding(
                                padding: const EdgeInsets.all(8),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('${t['customer']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                    Text(
                                      '${t['source'] ?? ''}'.isEmpty ? '${t['owner'] ?? ''}' : '${t['source']} · ${t['owner'] ?? ''}',
                                      style: const TextStyle(fontSize: 11),
                                    ),
                                    Wrap(
                                      children: cols
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
    ];
  }
}
