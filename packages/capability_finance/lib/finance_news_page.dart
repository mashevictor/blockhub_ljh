import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class FinanceNewsPage extends StatefulWidget {
  const FinanceNewsPage({
    super.key,
    required this.branding,
    this.vertical = 'bank',
  });

  final AppBranding branding;
  final String vertical;

  @override
  State<FinanceNewsPage> createState() => _FinanceNewsPageState();
}

class _FinanceNewsPageState extends State<FinanceNewsPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  bool _showSource = false;
  String _scope = 'all';
  String _msg = '';
  String _brief = '';
  int _resetKey = 0;
  final Map<String, String> _values = {};

  String get _appId => widget.branding.appPublicId.trim();
  String get _base => '${widget.branding.apiBaseUrl}/finance-news';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final dio = getRuntimeAuthedDio();
      final qs = <String, String>{'vertical': widget.vertical};
      if (_appId.isNotEmpty) qs['app_id'] = _appId;
      if (_scope != 'all') qs['scope'] = _scope;
      final q = '?${qs.entries.map((e) => '${e.key}=${Uri.encodeQueryComponent(e.value)}').join('&')}';
      final resp = await dio.get<Map<String, dynamic>>('$_base/items$q');
      _items = resp.data?['items'] as List<dynamic>? ?? [];
      _msg = '';
    } catch (e) {
      _items = [];
      _msg = '$e';
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _seed({bool refresh = false}) async {
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      final resp = await dio.post<Map<String, dynamic>>(
        '$_base/demo-seed',
        data: {
          'vertical': widget.vertical,
          'app_public_id': _appId,
          'refresh': refresh,
        },
      );
      _msg = '${resp.data?['message'] ?? 'ok'}';
      await _load();
    } catch (e) {
      _msg = '$e';
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _syncSource() async {
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      final provider = (_values['provider'] ?? 'public_cn').trim().toLowerCase();
      final tok = (_values['token'] ?? '').trim();
      if (provider == 'tushare') {
        if (tok.isEmpty || tok == '-') {
          throw Exception('选择 Tushare 时请填写 Token');
        }
        await dio.post('$_base/source-config', data: {
          'provider': 'tushare',
          'token': tok,
          'enabled': true,
        });
      }
      final resp = await dio.post<Map<String, dynamic>>(
        '$_base/sync',
        data: {
          'provider': provider,
          'vertical': widget.vertical,
          'app_public_id': _appId,
          'limit': 20,
        },
      );
      _msg = '${resp.data?['message'] ?? 'synced'}';
      _showSource = false;
      _values.clear();
      _resetKey++;
      await _load();
    } catch (e) {
      _msg = '$e';
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _brief(String kind) async {
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      final resp = await dio.post<Map<String, dynamic>>(
        '$_base/brief',
        data: {'vertical': widget.vertical, 'kind': kind},
      );
      _brief = '${resp.data?['brief'] ?? ''}';
      _msg = '已基于 ${resp.data?['based_on'] ?? 0} 条入库新闻生成';
    } catch (e) {
      _msg = '$e';
      _brief = '';
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
        Text('行业新闻 Agent', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 4),
        Text(
          '垂直=${widget.vertical} · 空库空列表 · 演示样本带标记',
          style: TextStyle(color: Colors.black54, fontSize: 13),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            FilledButton(
              onPressed: _busy ? null : () => _seed(),
              child: const Text('写入演示样本'),
            ),
            OutlinedButton(
              onPressed: _busy ? null : () => _seed(refresh: true),
              child: const Text('刷新演示'),
            ),
            OutlinedButton(
              onPressed: _busy
                  ? null
                  : () => setState(() {
                        _showSource = !_showSource;
                        _resetKey++;
                      }),
              child: Text(_showSource ? '收起真源' : '接入真源'),
            ),
            OutlinedButton(
              onPressed: _busy ? null : () => _brief('industry'),
              child: const Text('行业一页纸'),
            ),
            OutlinedButton(
              onPressed: _busy ? null : () => _brief('macro'),
              child: const Text('宏观速览'),
            ),
          ],
        ),
        if (_showSource) ...[
          const SizedBox(height: 12),
          GtgtStepComposer(
            title: '接入真源',
            flowHint: '>> 源类型 → Token（仅 tushare）→ 同步',
            accent: color,
            steps: const [
              GtgtStep(
                key: 'provider',
                label: '源类型',
                choices: [
                  (value: 'public_cn', label: '公开中文源'),
                  (value: 'tushare', label: 'Tushare'),
                ],
              ),
              GtgtStep(
                key: 'token',
                label: 'Tushare Token',
                placeholder: 'public_cn 可填 -',
                optional: true,
              ),
            ],
            values: _values,
            onChanged: (k, v) => setState(() => _values[k] = v),
            onComplete: _syncSource,
            busy: _busy,
            resetKey: _resetKey,
            submitLabel: '保存并同步',
          ),
        ],
        if (_msg.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(_msg, style: TextStyle(color: color, fontSize: 13)),
        ],
        if (_brief.isNotEmpty) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(_brief, style: const TextStyle(fontSize: 13, height: 1.5)),
          ),
        ],
        const SizedBox(height: 12),
        Wrap(
          spacing: 6,
          children: [
            for (final s in const [
              ('all', '全部'),
              ('macro_cn', '国内宏观'),
              ('macro_global', '全球宏观'),
              ('micro', '微观'),
            ])
              ChoiceChip(
                label: Text(s.$2),
                selected: _scope == s.$1,
                onSelected: (_) {
                  setState(() => _scope = s.$1);
                  _load();
                },
              ),
          ],
        ),
        const SizedBox(height: 12),
        if (_loading)
          const Text('加载中…')
        else if (_items.isEmpty)
          const Text('暂无新闻。请写入演示样本或接入真源。')
        else
          ..._items.map((raw) {
            final t = raw as Map;
            final isDemo = t['is_demo'] == true || t['source'] == 'demo';
            final symbols = (t['symbols'] as List?) ?? [];
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                title: Text('${t['title'] ?? ''}'),
                subtitle: Text(
                  [
                    if (isDemo) '演示' else '${t['source']}',
                    '${t['scope']}',
                    '${t['summary'] ?? ''}',
                    if (symbols.isNotEmpty)
                      symbols
                          .map((s) {
                            final m = s as Map;
                            return '${m['name'] ?? m['code'] ?? ''}${m['chg'] != null ? ' ${m['chg']}' : ''}';
                          })
                          .where((e) => e.trim().isNotEmpty)
                          .join(' · '),
                  ].where((e) => e.toString().trim().isNotEmpty).join('\n'),
                ),
                isThreeLine: true,
              ),
            );
          }),
      ],
    );
  }
}
