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
    case 'finance_aml':
      return const _KindCfg(
        heading: '反洗钱 / 风控预警',
        doneAction: 'done',
        doneLabel: '结案',
        steps: [
          GtgtStep(key: 'title', label: '预警标题', placeholder: '可疑交易 / 欺诈信号'),
          GtgtStep(key: 'field_a', label: '风险等级', placeholder: '高 / 中 / 低'),
          GtgtStep(key: 'field_b', label: '客户或账户', placeholder: '客户号'),
          GtgtStep(key: 'field_c', label: '规则命中', optional: true),
          GtgtStep(key: 'note', label: '研判说明', optional: true, multiline: true),
        ],
      );
    case 'credit_approval':
      return const _KindCfg(
        heading: '授信 / 贷后',
        doneAction: 'approve',
        doneLabel: '通过',
        steps: [
          GtgtStep(
            key: 'field_a',
            label: '类型',
            choices: [
              (value: 'credit', label: '授信审批'),
              (value: 'post_loan', label: '贷后检查'),
            ],
          ),
          GtgtStep(key: 'title', label: '借款人/产品'),
          GtgtStep(key: 'field_b', label: '申请额度'),
          GtgtStep(key: 'field_c', label: '担保方式', optional: true),
          GtgtStep(key: 'note', label: '审批意见', optional: true, multiline: true),
        ],
      );
    case 'due_diligence':
      return const _KindCfg(
        heading: '尽调 / 投后',
        doneAction: 'done',
        doneLabel: '归档',
        steps: [
          GtgtStep(
            key: 'field_a',
            label: '阶段',
            choices: [
              (value: 'research', label: '投研尽调'),
              (value: 'post_invest', label: '投后管理'),
            ],
          ),
          GtgtStep(key: 'title', label: '标的/项目'),
          GtgtStep(key: 'field_b', label: '行业', optional: true),
          GtgtStep(key: 'note', label: '要点纪要', optional: true, multiline: true),
        ],
      );
    case 'regulatory_report':
      return const _KindCfg(
        heading: '监管报送',
        doneAction: 'done',
        doneLabel: '已报送',
        steps: [
          GtgtStep(key: 'title', label: '报表名称'),
          GtgtStep(key: 'field_a', label: '报送周期', placeholder: '日/周/月/季'),
          GtgtStep(key: 'field_b', label: '截止日', optional: true),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'insurance_case':
      return const _KindCfg(
        heading: '核保 / 理赔',
        doneAction: 'close',
        doneLabel: '办结',
        steps: [
          GtgtStep(
            key: 'field_a',
            label: '类型',
            choices: [
              (value: 'underwrite', label: '核保'),
              (value: 'claim', label: '理赔'),
            ],
          ),
          GtgtStep(key: 'title', label: '保单/客户'),
          GtgtStep(key: 'field_b', label: '险种'),
          GtgtStep(key: 'note', label: '说明', optional: true, multiline: true),
        ],
      );
    default:
      return const _KindCfg(
        heading: '金融 KYC',
        doneAction: 'approve',
        doneLabel: '通过',
        steps: [
          GtgtStep(
            key: 'field_a',
            label: '业务类型',
            choices: [
              (value: 'corporate', label: '对公'),
              (value: 'retail', label: '零售'),
              (value: 'suitability', label: '适当性'),
            ],
          ),
          GtgtStep(key: 'title', label: '客户名称'),
          GtgtStep(key: 'field_b', label: '证件号'),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
  }
}

class FinanceOpsPage extends StatefulWidget {
  const FinanceOpsPage({super.key, required this.branding, required this.kind});
  final AppBranding branding;
  final String kind;
  @override
  State<FinanceOpsPage> createState() => _FinanceOpsPageState();
}

class _FinanceOpsPageState extends State<FinanceOpsPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  int _resetKey = 0;
  final Map<String, String> _values = {};

  String get _base => '${widget.branding.apiBaseUrl}/finance-ops/${widget.kind}';
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
    await dio.post('$_base/records/$id/$action');
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
        if (_loading)
          const Text('加载中…')
        else if (open.isEmpty)
          const Text('空库无数据')
        else
          ...open.map((raw) {
            final t = raw as Map;
            return Card(
              child: ListTile(
                title: Text('${t['title'] ?? ''}'),
                subtitle: Text('${t['record_no'] ?? ''} · ${t['field_a'] ?? ''}'),
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
