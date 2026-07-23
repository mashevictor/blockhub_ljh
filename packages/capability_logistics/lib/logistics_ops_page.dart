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
    case 'warehouse_inbound':
      return const _KindCfg(
        heading: '入库验收',
        doneAction: 'approve',
        doneLabel: '验收上架',
        steps: [
          GtgtStep(
            key: 'field_a',
            label: '类型',
            choices: [
              (value: 'purchase', label: '采购入库'),
              (value: 'return', label: '退货入库'),
              (value: 'transfer', label: '调拨入库'),
            ],
          ),
          GtgtStep(key: 'title', label: 'ASN/货品'),
          GtgtStep(key: 'field_b', label: '数量'),
          GtgtStep(key: 'note', label: '破损/备注', optional: true, multiline: true),
        ],
      );
    case 'warehouse_outbound':
      return const _KindCfg(
        heading: '出库拣配',
        doneAction: 'done',
        doneLabel: '复核出库',
        steps: [
          GtgtStep(key: 'title', label: '出库单/波次'),
          GtgtStep(key: 'field_a', label: 'SKU/货品'),
          GtgtStep(key: 'field_b', label: '数量'),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'fleet_dispatch':
      return const _KindCfg(
        heading: '车辆调度',
        doneAction: 'approve',
        doneLabel: '确认派车',
        steps: [
          GtgtStep(key: 'title', label: '任务名'),
          GtgtStep(key: 'field_a', label: '车牌'),
          GtgtStep(key: 'field_b', label: '司机'),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'pod_signoff':
      return const _KindCfg(
        heading: '签收确认',
        doneAction: 'done',
        doneLabel: '确认 POD',
        steps: [
          GtgtStep(
            key: 'field_a',
            label: '结果',
            choices: [
              (value: 'signed', label: '妥投签收'),
              (value: 'rejected', label: '拒收'),
              (value: 'partial', label: '部分签收'),
            ],
          ),
          GtgtStep(key: 'title', label: '运单号'),
          GtgtStep(key: 'note', label: '异常说明', optional: true, multiline: true),
        ],
      );
    case 'logistics_exception':
      return const _KindCfg(
        heading: '异常上报',
        doneAction: 'close',
        doneLabel: '结案',
        steps: [
          GtgtStep(
            key: 'field_a',
            label: '类型',
            choices: [
              (value: 'delay', label: '延误'),
              (value: 'damage', label: '破损'),
              (value: 'loss', label: '丢件'),
              (value: 'hazmat', label: '危险品'),
            ],
          ),
          GtgtStep(key: 'title', label: '关联运单/仓'),
          GtgtStep(key: 'note', label: '情况说明', optional: true, multiline: true),
        ],
      );
    case 'freight_settle':
      return const _KindCfg(
        heading: '运费结算',
        doneAction: 'approve',
        doneLabel: '确认结算',
        steps: [
          GtgtStep(key: 'title', label: '对账单/周期'),
          GtgtStep(key: 'field_a', label: '承运商'),
          GtgtStep(key: 'field_b', label: '金额'),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'cold_chain_alert':
      return const _KindCfg(
        heading: '冷链告警',
        doneAction: 'done',
        doneLabel: '处置完成',
        steps: [
          GtgtStep(key: 'title', label: '设备/车厢'),
          GtgtStep(key: 'field_a', label: '温度℃'),
          GtgtStep(key: 'note', label: '处置说明', optional: true, multiline: true),
        ],
      );
    case 'dock_queue':
      return const _KindCfg(
        heading: '装卸排队',
        doneAction: 'done',
        doneLabel: '叫号完成',
        steps: [
          GtgtStep(key: 'title', label: '车牌/预约号'),
          GtgtStep(key: 'field_a', label: '月台'),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'route_task':
      return const _KindCfg(
        heading: '路线任务',
        doneAction: 'approve',
        doneLabel: '任务下发',
        steps: [
          GtgtStep(key: 'title', label: '路线名'),
          GtgtStep(key: 'field_a', label: '站点顺序'),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    default:
      return const _KindCfg(
        heading: '运单跟踪',
        doneAction: 'done',
        doneLabel: '更新完成',
        steps: [
          GtgtStep(key: 'title', label: '运单号'),
          GtgtStep(key: 'field_a', label: '当前节点'),
          GtgtStep(key: 'field_b', label: '承运商/车牌', optional: true),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
  }
}

class LogisticsOpsPage extends StatefulWidget {
  const LogisticsOpsPage({super.key, required this.branding, required this.kind});
  final AppBranding branding;
  final String kind;
  @override
  State<LogisticsOpsPage> createState() => _LogisticsOpsPageState();
}

class _LogisticsOpsPageState extends State<LogisticsOpsPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  int _resetKey = 0;
  final Map<String, String> _values = {};

  String get _base => '${widget.branding.apiBaseUrl}/logistics-ops/${widget.kind}';
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
