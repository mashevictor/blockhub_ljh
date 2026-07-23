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
    case 'stock_alert':
      return const _KindCfg(
        heading: '库存预警',
        doneAction: 'done',
        doneLabel: '已补货',
        steps: [
          GtgtStep(key: 'title', label: 'SKU/品名'),
          GtgtStep(key: 'field_a', label: '门店/仓'),
          GtgtStep(key: 'field_b', label: '当前库存', optional: true),
          GtgtStep(key: 'field_c', label: '安全库存', optional: true),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'retail_order':
      return const _KindCfg(
        heading: '订单跟踪',
        doneAction: 'done',
        doneLabel: '履约完成',
        steps: [
          GtgtStep(key: 'title', label: '订单号'),
          GtgtStep(
            key: 'field_a',
            label: '渠道',
            choices: [
              (value: 'online', label: '线上'),
              (value: 'store', label: '门店'),
              (value: 'omni', label: '全渠道'),
            ],
          ),
          GtgtStep(key: 'field_b', label: '状态', optional: true),
          GtgtStep(key: 'field_c', label: '金额', optional: true),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'return_exchange':
      return const _KindCfg(
        heading: '退换货',
        doneAction: 'close',
        doneLabel: '结案',
        steps: [
          GtgtStep(
            key: 'field_a',
            label: '类型',
            choices: [
              (value: 'return', label: '退货'),
              (value: 'exchange', label: '换货'),
            ],
          ),
          GtgtStep(key: 'title', label: '订单/客户'),
          GtgtStep(key: 'field_b', label: '原因', optional: true),
          GtgtStep(key: 'note', label: '说明', optional: true, multiline: true),
        ],
      );
    case 'supplier_recon':
      return const _KindCfg(
        heading: '供应商对账',
        doneAction: 'approve',
        doneLabel: '对账确认',
        steps: [
          GtgtStep(key: 'title', label: '供应商'),
          GtgtStep(key: 'field_a', label: '账期'),
          GtgtStep(key: 'field_b', label: '差异金额', optional: true),
          GtgtStep(key: 'note', label: '差异说明', optional: true, multiline: true),
        ],
      );
    case 'price_change':
      return const _KindCfg(
        heading: '价格变更',
        doneAction: 'approve',
        doneLabel: '生效确认',
        steps: [
          GtgtStep(key: 'title', label: 'SKU/品名'),
          GtgtStep(key: 'field_a', label: '原价', optional: true),
          GtgtStep(key: 'field_b', label: '新价'),
          GtgtStep(key: 'field_c', label: '生效日', optional: true),
          GtgtStep(key: 'note', label: '原因', optional: true, multiline: true),
        ],
      );
    case 'display_check':
      return const _KindCfg(
        heading: '陈列检查',
        doneAction: 'done',
        doneLabel: '检查通过',
        steps: [
          GtgtStep(key: 'title', label: '门店/货架'),
          GtgtStep(key: 'field_a', label: '标准项', optional: true),
          GtgtStep(key: 'note', label: '问题描述', optional: true, multiline: true),
        ],
      );
    case 'shelf_replenish':
      return const _KindCfg(
        heading: '补货上架',
        doneAction: 'done',
        doneLabel: '上架完成',
        steps: [
          GtgtStep(key: 'title', label: 'SKU/品名'),
          GtgtStep(key: 'field_a', label: '门店'),
          GtgtStep(key: 'field_b', label: '补货量', optional: true),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'pos_exception':
      return const _KindCfg(
        heading: '收银异常',
        doneAction: 'close',
        doneLabel: '异常关闭',
        steps: [
          GtgtStep(key: 'title', label: '门店/收银机'),
          GtgtStep(
            key: 'field_a',
            label: '异常类型',
            choices: [
              (value: 'cash', label: '长短款'),
              (value: 'void', label: '作废异常'),
              (value: 'other', label: '其他'),
            ],
          ),
          GtgtStep(key: 'field_b', label: '金额', optional: true),
          GtgtStep(key: 'note', label: '说明', optional: true, multiline: true),
        ],
      );
    case 'store_transfer':
      return const _KindCfg(
        heading: '门店调拨',
        doneAction: 'done',
        doneLabel: '调拨完成',
        steps: [
          GtgtStep(key: 'title', label: 'SKU/品名'),
          GtgtStep(key: 'field_a', label: '调出门店'),
          GtgtStep(key: 'field_b', label: '调入门店'),
          GtgtStep(key: 'field_c', label: '数量'),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'loss_shrinkage':
      return const _KindCfg(
        heading: '损耗报损',
        doneAction: 'approve',
        doneLabel: '报损确认',
        steps: [
          GtgtStep(key: 'title', label: 'SKU/品名'),
          GtgtStep(
            key: 'field_a',
            label: '原因',
            choices: [
              (value: 'expire', label: '过期'),
              (value: 'damage', label: '破损'),
              (value: 'theft', label: '盗损'),
              (value: 'other', label: '其他'),
            ],
          ),
          GtgtStep(key: 'field_b', label: '金额', optional: true),
          GtgtStep(key: 'field_c', label: '门店', optional: true),
          GtgtStep(key: 'note', label: '说明', optional: true, multiline: true),
        ],
      );
    case 'omni_pickup':
      return const _KindCfg(
        heading: '全渠道自提',
        doneAction: 'done',
        doneLabel: '已提货',
        steps: [
          GtgtStep(key: 'title', label: '提货码/订单号'),
          GtgtStep(
            key: 'field_a',
            label: '渠道',
            choices: [
              (value: 'app', label: 'App'),
              (value: 'wechat', label: '企微/小程序'),
              (value: 'douyin', label: '抖音'),
            ],
          ),
          GtgtStep(key: 'field_b', label: '到店时段', optional: true),
          GtgtStep(key: 'field_c', label: '门店'),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'promo_coupon':
      return const _KindCfg(
        heading: '优惠券核销',
        doneAction: 'done',
        doneLabel: '已核销',
        steps: [
          GtgtStep(key: 'title', label: '券码'),
          GtgtStep(key: 'field_a', label: '活动名'),
          GtgtStep(key: 'field_b', label: '核销门店'),
          GtgtStep(key: 'field_c', label: '面额', optional: true),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'gift_card':
      return const _KindCfg(
        heading: '储值卡充值',
        doneAction: 'done',
        doneLabel: '充值完成',
        steps: [
          GtgtStep(key: 'title', label: '卡号'),
          GtgtStep(key: 'field_a', label: '金额'),
          GtgtStep(
            key: 'field_b',
            label: '渠道',
            choices: [
              (value: 'store', label: '门店'),
              (value: 'online', label: '线上'),
              (value: 'corp', label: '企业采购'),
            ],
          ),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'competitor_price':
      return const _KindCfg(
        heading: '竞品采价',
        doneAction: 'done',
        doneLabel: '采价归档',
        steps: [
          GtgtStep(key: 'title', label: '本品SKU'),
          GtgtStep(key: 'field_a', label: '竞品名'),
          GtgtStep(key: 'field_b', label: '竞品售价'),
          GtgtStep(key: 'field_c', label: '本品价', optional: true),
          GtgtStep(key: 'note', label: '门店/渠道', optional: true, multiline: true),
        ],
      );
    case 'new_sku_launch':
      return const _KindCfg(
        heading: '新品上架',
        doneAction: 'approve',
        doneLabel: '上架确认',
        steps: [
          GtgtStep(key: 'title', label: '新品名称'),
          GtgtStep(key: 'field_a', label: '品类'),
          GtgtStep(key: 'field_b', label: '上架日', optional: true),
          GtgtStep(key: 'field_c', label: '主推门店', optional: true),
          GtgtStep(key: 'note', label: '卖点', optional: true, multiline: true),
        ],
      );
    case 'vip_hold':
      return const _KindCfg(
        heading: '会员预留',
        doneAction: 'done',
        doneLabel: '已交付',
        steps: [
          GtgtStep(key: 'title', label: '会员号/手机'),
          GtgtStep(key: 'field_a', label: 'SKU/品名'),
          GtgtStep(key: 'field_b', label: '预留时段', optional: true),
          GtgtStep(key: 'field_c', label: '门店'),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'receipt_audit':
      return const _KindCfg(
        heading: '小票稽核',
        doneAction: 'close',
        doneLabel: '稽核结案',
        steps: [
          GtgtStep(key: 'title', label: '小票号'),
          GtgtStep(
            key: 'field_a',
            label: '异常类型',
            choices: [
              (value: 'discount', label: '折扣异常'),
              (value: 'void', label: '作废'),
              (value: 'split', label: '拆单'),
              (value: 'other', label: '其他'),
            ],
          ),
          GtgtStep(key: 'field_b', label: '差额', optional: true),
          GtgtStep(key: 'field_c', label: '门店', optional: true),
          GtgtStep(key: 'note', label: '说明', optional: true, multiline: true),
        ],
      );
    case 'online_refund':
      return const _KindCfg(
        heading: '电商仅退款',
        doneAction: 'approve',
        doneLabel: '退款确认',
        steps: [
          GtgtStep(key: 'title', label: '平台单号'),
          GtgtStep(
            key: 'field_a',
            label: '平台',
            choices: [
              (value: 'tmall', label: '天猫'),
              (value: 'jd', label: '京东'),
              (value: 'pdd', label: '拼多多'),
              (value: 'other', label: '其他'),
            ],
          ),
          GtgtStep(key: 'field_b', label: '退款原因', optional: true),
          GtgtStep(key: 'field_c', label: '金额'),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    default:
      return const _KindCfg(
        heading: '库存预警',
        doneAction: 'done',
        doneLabel: '已补货',
        steps: [
          GtgtStep(key: 'title', label: '标题'),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
  }
}

class RetailOpsPage extends StatefulWidget {
  const RetailOpsPage({super.key, required this.branding, required this.kind});
  final AppBranding branding;
  final String kind;
  @override
  State<RetailOpsPage> createState() => _RetailOpsPageState();
}

class _RetailOpsPageState extends State<RetailOpsPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  int _resetKey = 0;
  final Map<String, String> _values = {};

  String get _base => '${widget.branding.apiBaseUrl}/retail-ops/${widget.kind}';
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
