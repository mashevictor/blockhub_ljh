import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class MemberLoyaltyPage extends StatefulWidget {
  const MemberLoyaltyPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<MemberLoyaltyPage> createState() => _MemberLoyaltyPageState();
}

class _MemberLoyaltyPageState extends State<MemberLoyaltyPage> {
  List<dynamic> _members = [];
  List<dynamic> _campaigns = [];
  List<dynamic> _txns = [];
  List<dynamic> _outreaches = [];
  bool _loading = true;
  bool _busy = false;
  int _tab = 0;
  int _resetKey = 0;
  final Map<String, String> _values = {'points': '0', 'points_delta': '100'};

  String get _base => '${widget.branding.apiBaseUrl}/member-loyalty';
  String get _appId => widget.branding.appPublicId.trim();

  @override
  void initState() {
    super.initState();
    BhL10n.instance.addListener(_onL10n);
    _load();
  }

  void _onL10n() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    BhL10n.instance.removeListener(_onL10n);
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final dio = getRuntimeAuthedDio();
      final q = _appId.isNotEmpty ? '?app_id=${Uri.encodeQueryComponent(_appId)}' : '';
      final m = await dio.get<Map<String, dynamic>>('$_base/members$q');
      final c = await dio.get<Map<String, dynamic>>('$_base/campaigns$q');
      final t = await dio.get<Map<String, dynamic>>('$_base/point-txns$q');
      final o = await dio.get<Map<String, dynamic>>('$_base/outreaches$q');
      _members = m.data?['items'] as List<dynamic>? ?? [];
      _campaigns = c.data?['items'] as List<dynamic>? ?? [];
      _txns = t.data?['items'] as List<dynamic>? ?? [];
      _outreaches = o.data?['items'] as List<dynamic>? ?? [];
    } catch (_) {
      _members = [];
      _campaigns = [];
      _txns = [];
      _outreaches = [];
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _createMember() async {
    if ((_values['name'] ?? '').trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/members', data: {
        'name': (_values['name'] ?? '').trim(),
        'phone': (_values['phone'] ?? '').trim(),
        'points': int.tryParse((_values['points'] ?? '0').trim()) ?? 0,
        'app_public_id': _appId,
      });
      _values
        ..clear()
        ..['points'] = '0'
        ..['points_delta'] = '100';
      _resetKey++;
      await _load();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _createCampaign() async {
    if ((_values['camp'] ?? '').trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/campaigns', data: {
        'name': (_values['camp'] ?? '').trim(),
        'campaign_type': 'points',
        'rule_text': (_values['rule'] ?? '').trim(),
        'points_delta': int.tryParse((_values['points_delta'] ?? '0').trim()) ?? 0,
        'app_public_id': _appId,
      });
      _values
        ..clear()
        ..['points'] = '0'
        ..['points_delta'] = '100';
      _resetKey++;
      await _load();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _send(String id) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/outreaches/$id/send');
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(bhTf('cap.member_loyalty.ui.title', '会员营销'), style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        SegmentedButton<int>(
          segments: [
            ButtonSegment(value: 0, label: Text(bhTf('cap.member_loyalty.mode.member', '建会员'))),
            ButtonSegment(value: 1, label: Text(bhTf('cap.member_loyalty.mode.campaign', '建活动'))),
            ButtonSegment(value: 2, label: Text(bhTf('cap.member_loyalty.mode.list', '列表'))),
          ],
          selected: {_tab},
          onSelectionChanged: (s) => setState(() {
            _tab = s.first;
            _resetKey++;
          }),
        ),
        const SizedBox(height: 12),
        if (_tab == 0)
          GtgtStepComposer(
            title: bhTf('cap.member_loyalty.mode.member', '新建会员'),
            flowHint: '姓名 → 手机 → 初始积分',
            accent: color,
            steps: [
              GtgtStep(key: 'name', label: bhTf('cap.member_loyalty.field.name', '会员姓名')),
              GtgtStep(
                key: 'phone',
                label: bhTf('cap.member_loyalty.field.phone', '手机'),
                optional: true,
                keyboardType: TextInputType.phone,
              ),
              GtgtStep(
                key: 'points',
                label: bhTf('cap.member_loyalty.field.points', '初始积分'),
                placeholder: '0',
                keyboardType: TextInputType.number,
              ),
            ],
            values: _values,
            onChanged: (k, v) => setState(() => _values[k] = v),
            onComplete: _createMember,
            busy: _busy,
            resetKey: _resetKey,
            submitLabel: bhTf('cap.member_loyalty.submit', '确认建档'),
          )
        else if (_tab == 1)
          GtgtStepComposer(
            title: bhTf('cap.member_loyalty.mode.campaign', '新建活动'),
            flowHint: '活动名 → 规则 → 积分增减',
            accent: color,
            steps: [
              GtgtStep(key: 'camp', label: bhTf('cap.member_loyalty.field.campaign_name', '活动名')),
              GtgtStep(key: 'rule', label: '规则', optional: true),
              GtgtStep(
                key: 'points_delta',
                label: '积分增减',
                placeholder: '100',
                keyboardType: TextInputType.number,
              ),
            ],
            values: _values,
            onChanged: (k, v) => setState(() => _values[k] = v),
            onComplete: _createCampaign,
            busy: _busy,
            resetKey: _resetKey,
            submitLabel: bhTf('cap.member_loyalty.submit', '确认创建'),
          )
        else ...[
          if (_loading) const Center(child: CircularProgressIndicator()),
          Text('会员', style: Theme.of(context).textTheme.titleMedium),
          ..._members.map((raw) {
            final t = Map<String, dynamic>.from(raw as Map);
            return ListTile(title: Text('${t['name']}'), subtitle: Text('${t['points']}分 · ${t['status']}'));
          }),
          Text('活动', style: Theme.of(context).textTheme.titleMedium),
          ..._campaigns.map((raw) {
            final t = Map<String, dynamic>.from(raw as Map);
            return ListTile(title: Text('${t['name']}'), subtitle: Text('${t['rule_text']}'));
          }),
          Text('流水', style: Theme.of(context).textTheme.titleMedium),
          ..._txns.map((raw) {
            final t = Map<String, dynamic>.from(raw as Map);
            return ListTile(title: Text('${t['member_name']} · ${t['txn_type']} ${t['points']}'));
          }),
          Text('触达', style: Theme.of(context).textTheme.titleMedium),
          ..._outreaches.map((raw) {
            final t = Map<String, dynamic>.from(raw as Map);
            final id = '${t['id']}';
            return ListTile(
              title: Text('${t['member_name']}'),
              subtitle: Text('${t['message']} · ${t['status']}'),
              trailing: t['status'] == 'pending'
                  ? TextButton(onPressed: () => _send(id), child: const Text('发送'))
                  : null,
            );
          }),
        ],
      ],
    );
  }
}
