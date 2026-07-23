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
    case 'guest_complaint':
      return const _KindCfg(
        heading: '客诉处理',
        doneAction: 'close',
        doneLabel: '结案',
        steps: [
          GtgtStep(
            key: 'field_a',
            label: '类型',
            choices: [
              (value: 'service', label: '服务'),
              (value: 'facility', label: '设施'),
              (value: 'fnb', label: '餐饮'),
              (value: 'other', label: '其他'),
            ],
          ),
          GtgtStep(key: 'title', label: '房号/客人'),
          GtgtStep(key: 'field_b', label: '紧急程度', optional: true),
          GtgtStep(key: 'note', label: '客诉内容', optional: true, multiline: true),
        ],
      );
    case 'food_purchase':
      return const _KindCfg(
        heading: '食材申购',
        doneAction: 'approve',
        doneLabel: '采购确认',
        steps: [
          GtgtStep(key: 'title', label: '品名'),
          GtgtStep(key: 'field_a', label: '厨房/档口'),
          GtgtStep(key: 'field_b', label: '数量'),
          GtgtStep(key: 'field_c', label: '预算', optional: true),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'hygiene_check':
      return const _KindCfg(
        heading: '卫生检查',
        doneAction: 'done',
        doneLabel: '检查通过',
        steps: [
          GtgtStep(key: 'title', label: '区域'),
          GtgtStep(key: 'field_a', label: '检查项', optional: true),
          GtgtStep(key: 'note', label: '问题/整改', optional: true, multiline: true),
        ],
      );
    case 'room_service':
      return const _KindCfg(
        heading: '客房服务',
        doneAction: 'done',
        doneLabel: '服务完成',
        steps: [
          GtgtStep(key: 'title', label: '房号'),
          GtgtStep(key: 'field_a', label: '服务项'),
          GtgtStep(key: 'field_b', label: '时间', optional: true),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'banquet_order':
      return const _KindCfg(
        heading: '宴会预订',
        doneAction: 'approve',
        doneLabel: '预订确认',
        steps: [
          GtgtStep(key: 'title', label: '宴会名称'),
          GtgtStep(key: 'field_a', label: '日期'),
          GtgtStep(key: 'field_b', label: '桌数/人数', optional: true),
          GtgtStep(key: 'field_c', label: '预算', optional: true),
          GtgtStep(key: 'note', label: '需求', optional: true, multiline: true),
        ],
      );
    case 'hotel_revenue':
      return const _KindCfg(
        heading: '营收日报',
        doneAction: 'done',
        doneLabel: '确认归档',
        steps: [
          GtgtStep(key: 'title', label: '日期'),
          GtgtStep(key: 'field_a', label: '客房收入', optional: true),
          GtgtStep(key: 'field_b', label: '餐饮收入', optional: true),
          GtgtStep(key: 'field_c', label: '其他', optional: true),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'fnb_order':
      return const _KindCfg(
        heading: '餐饮点单',
        doneAction: 'done',
        doneLabel: '出餐完成',
        steps: [
          GtgtStep(key: 'title', label: '桌号/房号'),
          GtgtStep(key: 'field_a', label: '菜品'),
          GtgtStep(key: 'field_b', label: '金额', optional: true),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'lost_found':
      return const _KindCfg(
        heading: '失物招领',
        doneAction: 'close',
        doneLabel: '已认领/关闭',
        steps: [
          GtgtStep(key: 'title', label: '物品'),
          GtgtStep(key: 'field_a', label: '发现地点'),
          GtgtStep(key: 'field_b', label: '发现人', optional: true),
          GtgtStep(key: 'note', label: '描述', optional: true, multiline: true),
        ],
      );
    case 'room_status':
      return const _KindCfg(
        heading: '房态变更',
        doneAction: 'done',
        doneLabel: '房态已更新',
        steps: [
          GtgtStep(key: 'title', label: '房号'),
          GtgtStep(
            key: 'field_a',
            label: '状态',
            choices: [
              (value: 'clean', label: '净房'),
              (value: 'dirty', label: '脏房'),
              (value: 'ooo', label: '维修'),
              (value: 'occ', label: '在住'),
            ],
          ),
          GtgtStep(key: 'field_b', label: '楼层', optional: true),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'hk_task':
      return const _KindCfg(
        heading: '客房打扫',
        doneAction: 'done',
        doneLabel: '打扫完成',
        steps: [
          GtgtStep(key: 'title', label: '房号'),
          GtgtStep(
            key: 'field_a',
            label: '优先级',
            choices: [
              (value: 'vip', label: 'VIP'),
              (value: 'checkout', label: '退房急扫'),
              (value: 'stay', label: '续住'),
              (value: 'normal', label: '普通'),
            ],
          ),
          GtgtStep(key: 'field_b', label: '完成节点', optional: true),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'minibar_charge':
      return const _KindCfg(
        heading: '迷你吧计费',
        doneAction: 'done',
        doneLabel: '已入账',
        steps: [
          GtgtStep(key: 'title', label: '房号'),
          GtgtStep(key: 'field_a', label: '品项'),
          GtgtStep(key: 'field_b', label: '金额'),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'concierge_req':
      return const _KindCfg(
        heading: '礼宾需求',
        doneAction: 'done',
        doneLabel: '已办结',
        steps: [
          GtgtStep(key: 'title', label: '客人/房号'),
          GtgtStep(
            key: 'field_a',
            label: '类型',
            choices: [
              (value: 'car', label: '用车'),
              (value: 'ticket', label: '票务'),
              (value: 'luggage', label: '行李'),
              (value: 'other', label: '其他'),
            ],
          ),
          GtgtStep(key: 'field_b', label: '时效', optional: true),
          GtgtStep(key: 'note', label: '需求说明', optional: true, multiline: true),
        ],
      );
    case 'group_checkin':
      return const _KindCfg(
        heading: '团队入住',
        doneAction: 'approve',
        doneLabel: '入住确认',
        steps: [
          GtgtStep(key: 'title', label: '团名'),
          GtgtStep(key: 'field_a', label: '间数'),
          GtgtStep(key: 'field_b', label: '到店日'),
          GtgtStep(key: 'field_c', label: '联系人', optional: true),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'night_audit':
      return const _KindCfg(
        heading: '夜审确认',
        doneAction: 'approve',
        doneLabel: '夜审通过',
        steps: [
          GtgtStep(key: 'title', label: '营业日'),
          GtgtStep(key: 'field_a', label: '差异项', optional: true),
          GtgtStep(key: 'field_b', label: '差异金额', optional: true),
          GtgtStep(key: 'note', label: '说明', optional: true, multiline: true),
        ],
      );
    case 'table_reserve':
      return const _KindCfg(
        heading: '餐厅订位',
        doneAction: 'done',
        doneLabel: '已入座/取消',
        steps: [
          GtgtStep(key: 'title', label: '客人姓名'),
          GtgtStep(key: 'field_a', label: '人数'),
          GtgtStep(key: 'field_b', label: '时段'),
          GtgtStep(
            key: 'field_c',
            label: '桌型',
            choices: [
              (value: 'hall', label: '大厅'),
              (value: 'private', label: '包厢'),
              (value: 'terrace', label: '露台'),
            ],
          ),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'menu_86':
      return const _KindCfg(
        heading: '菜品沽清',
        doneAction: 'done',
        doneLabel: '已恢复/关闭',
        steps: [
          GtgtStep(key: 'title', label: '菜名'),
          GtgtStep(key: 'field_a', label: '档口'),
          GtgtStep(key: 'field_b', label: '恢复预估', optional: true),
          GtgtStep(key: 'note', label: '原因', optional: true, multiline: true),
        ],
      );
    case 'kitchen_waste':
      return const _KindCfg(
        heading: '厨余报损',
        doneAction: 'approve',
        doneLabel: '报损确认',
        steps: [
          GtgtStep(key: 'title', label: '品类'),
          GtgtStep(key: 'field_a', label: '重量或金额'),
          GtgtStep(
            key: 'field_b',
            label: '原因',
            choices: [
              (value: 'spoil', label: '变质'),
              (value: 'prep', label: '备料过量'),
              (value: 'return', label: '退菜'),
              (value: 'other', label: '其他'),
            ],
          ),
          GtgtStep(key: 'note', label: '说明', optional: true, multiline: true),
        ],
      );
    case 'allergen_note':
      return const _KindCfg(
        heading: '过敏原工单',
        doneAction: 'done',
        doneLabel: '已告知厨房',
        steps: [
          GtgtStep(key: 'title', label: '桌号/房号'),
          GtgtStep(key: 'field_a', label: '过敏原'),
          GtgtStep(key: 'field_b', label: '菜品', optional: true),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    default:
      return const _KindCfg(
        heading: '客诉处理',
        doneAction: 'close',
        doneLabel: '结案',
        steps: [
          GtgtStep(key: 'title', label: '标题'),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
  }
}

class HotelOpsPage extends StatefulWidget {
  const HotelOpsPage({super.key, required this.branding, required this.kind});
  final AppBranding branding;
  final String kind;
  @override
  State<HotelOpsPage> createState() => _HotelOpsPageState();
}

class _HotelOpsPageState extends State<HotelOpsPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  int _resetKey = 0;
  final Map<String, String> _values = {};

  String get _base => '${widget.branding.apiBaseUrl}/hotel-ops/${widget.kind}';
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
