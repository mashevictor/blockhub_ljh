import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class _KindCfg {
  const _KindCfg({
    required this.heading,
    required this.doneAction,
    required this.doneLabel,
    required this.steps,
  });
  final String heading;
  final String doneAction;
  final String doneLabel;
  final List<GtgtStep> steps;
}

_KindCfg _cfgFor(String kind) {
  switch (kind) {
    case 'rent_collection':
      return const _KindCfg(
        heading: '租金收缴',
        doneAction: 'done',
        doneLabel: '确认回款',
        steps: [
          GtgtStep(key: 'title', label: '租户/房源'),
          GtgtStep(key: 'field_a', label: '账期'),
          GtgtStep(key: 'field_b', label: '金额'),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'lease_renewal':
      return const _KindCfg(
        heading: '租约续签',
        doneAction: 'approve',
        doneLabel: '续签完成',
        steps: [
          GtgtStep(key: 'title', label: '租户/合同号'),
          GtgtStep(key: 'field_a', label: '到期日'),
          GtgtStep(key: 'note', label: '说明', optional: true, multiline: true),
        ],
      );
    case 'owner_complaint':
      return const _KindCfg(
        heading: '业主投诉',
        doneAction: 'close',
        doneLabel: '结案',
        steps: [
          GtgtStep(key: 'title', label: '业主/房号'),
          GtgtStep(key: 'field_a', label: '类型'),
          GtgtStep(key: 'note', label: '投诉内容', optional: true, multiline: true),
        ],
      );
    case 'deco_acceptance':
      return const _KindCfg(
        heading: '装修/交房验收',
        doneAction: 'approve',
        doneLabel: '验收通过',
        steps: [
          GtgtStep(
            key: 'field_a',
            label: '类型',
            choices: [
              (value: 'deco', label: '装修验收'),
              (value: 'handover', label: '交房验收'),
            ],
          ),
          GtgtStep(key: 'title', label: '房源/工程'),
          GtgtStep(key: 'note', label: '问题清单', optional: true, multiline: true),
        ],
      );
    case 'sales_followup':
      return const _KindCfg(
        heading: '客户跟进',
        doneAction: 'done',
        doneLabel: '归档',
        steps: [
          GtgtStep(key: 'title', label: '客户姓名'),
          GtgtStep(key: 'field_a', label: '意向等级'),
          GtgtStep(key: 'note', label: '纪要', optional: true, multiline: true),
        ],
      );
    case 're_contract':
      return const _KindCfg(
        heading: '签约认购',
        doneAction: 'approve',
        doneLabel: '确认办结',
        steps: [
          GtgtStep(
            key: 'field_a',
            label: '类型',
            choices: [
              (value: 'subscribe', label: '认购'),
              (value: 'sign', label: '签约'),
            ],
          ),
          GtgtStep(key: 'title', label: '客户/房源'),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'viewing_feedback':
      return const _KindCfg(
        heading: '看房回访',
        doneAction: 'done',
        doneLabel: '回访完成',
        steps: [
          GtgtStep(key: 'title', label: '客户/房源'),
          GtgtStep(key: 'field_a', label: '意向'),
          GtgtStep(key: 'note', label: '反馈', optional: true, multiline: true),
        ],
      );
    case 'property_fee':
      return const _KindCfg(
        heading: '物业费催缴',
        doneAction: 'done',
        doneLabel: '确认回款',
        steps: [
          GtgtStep(key: 'title', label: '业主/房号'),
          GtgtStep(key: 'field_a', label: '账期'),
          GtgtStep(key: 'field_b', label: '金额'),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'broker_commission':
      return const _KindCfg(
        heading: '中介佣金',
        doneAction: 'approve',
        doneLabel: '确认结算',
        steps: [
          GtgtStep(key: 'title', label: '成交单/客户'),
          GtgtStep(key: 'field_a', label: '中介'),
          GtgtStep(key: 'field_b', label: '佣金'),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    default:
      return const _KindCfg(
        heading: '房源上架',
        doneAction: 'approve',
        doneLabel: '审核上架',
        steps: [
          GtgtStep(
            key: 'field_a',
            label: '类型',
            choices: [
              (value: 'sale', label: '出售'),
              (value: 'rent', label: '出租'),
            ],
          ),
          GtgtStep(key: 'title', label: '房源标题'),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
  }
}

class RealestateOpsPage extends StatefulWidget {
  const RealestateOpsPage({super.key, required this.branding, required this.kind});
  final AppBranding branding;
  final String kind;
  @override
  State<RealestateOpsPage> createState() => _RealestateOpsPageState();
}

class _RealestateOpsPageState extends State<RealestateOpsPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  int _resetKey = 0;
  final Map<String, String> _values = {};

  String get _base => '${widget.branding.apiBaseUrl}/realestate-ops/${widget.kind}';
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

  Future<void> _submit() async {
    if ((_values['title'] ?? '').trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'title': (_values['title'] ?? '').trim(),
        'field_a': (_values['field_a'] ?? '').trim(),
        'field_b': (_values['field_b'] ?? '').trim(),
        'field_c': (_values['field_c'] ?? '').trim(),
        'field_d': (_values['field_d'] ?? '').trim(),
        'note': (_values['note'] ?? '').trim(),
        'app_public_id': _appId,
      });
      _values.clear();
      _resetKey++;
      await _load();
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _done(String id, String action) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records/$id/$action', data: {});
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final cfg = _cfgFor(widget.kind);
    final color = Color(widget.branding.primaryColorValue);
    final open = _items.where((e) => (e as Map)['status'] == 'open').toList();
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        GtgtStepComposer(
          title: cfg.heading,
          flowHint: '>> 单字段推进 → 真库',
          accent: color,
          steps: cfg.steps,
          values: _values,
          onChanged: (k, v) => setState(() => _values[k] = v),
          onComplete: _submit,
          busy: _busy,
          resetKey: _resetKey,
          submitLabel: '提交',
        ),
        const SizedBox(height: 16),
        Text(_loading ? '加载中…' : (open.isEmpty ? '空库无数据' : '待办 · ${open.length}')),
        ...open.map((raw) {
          final t = raw as Map;
          return Card(
            child: ListTile(
              title: Text('${t['title']}'),
              subtitle: Text('${t['record_no']}'),
              trailing: TextButton(
                onPressed: () => _done('${t['id']}', cfg.doneAction),
                child: Text(cfg.doneLabel),
              ),
            ),
          );
        }),
      ],
    );
  }
}
