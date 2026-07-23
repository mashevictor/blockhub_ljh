import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class _KindCfg {
  const _KindCfg({
    required this.heading,
    required this.industry,
    required this.doneAction,
    required this.doneLabel,
    required this.steps,
  });
  final String heading;
  final String industry;
  final String doneAction;
  final String doneLabel;
  final List<GtgtStep> steps;
}

_KindCfg _cfgFor(String kind) {
  switch (kind) {
    case 'edu_grade_alert':
      return const _KindCfg(
        heading: '成绩预警',
        industry: 'edu',
        doneAction: 'done',
        doneLabel: '已跟进',
        steps: [
          GtgtStep(key: 'title', label: '学生/班级'),
          GtgtStep(key: 'field_a', label: '科目'),
          GtgtStep(key: 'field_b', label: '分数', optional: true),
          GtgtStep(key: 'note', label: '预警说明', optional: true, multiline: true),
        ],
      );
    case 'edu_tuition':
      return const _KindCfg(
        heading: '学费收缴',
        industry: 'edu',
        doneAction: 'close',
        doneLabel: '已缴费',
        steps: [
          GtgtStep(key: 'title', label: '学生'),
          GtgtStep(key: 'field_a', label: '学期'),
          GtgtStep(key: 'field_b', label: '金额'),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'edu_attendance':
      return const _KindCfg(
        heading: '到课考勤',
        industry: 'edu',
        doneAction: 'done',
        doneLabel: '已统计',
        steps: [
          GtgtStep(key: 'title', label: '班级/课程'),
          GtgtStep(key: 'field_a', label: '日期'),
          GtgtStep(key: 'field_b', label: '缺勤人数', optional: true),
          GtgtStep(key: 'note', label: '说明', optional: true, multiline: true),
        ],
      );
    case 'edu_quiz':
      return const _KindCfg(
        heading: '题库练习',
        industry: 'edu',
        doneAction: 'done',
        doneLabel: '已发布',
        steps: [
          GtgtStep(key: 'title', label: '知识点'),
          GtgtStep(key: 'field_a', label: '题量', optional: true),
          GtgtStep(key: 'field_b', label: '难度', optional: true),
          GtgtStep(key: 'note', label: '说明', optional: true, multiline: true),
        ],
      );
    case 'edu_textbook':
      return const _KindCfg(
        heading: '教材发放',
        industry: 'edu',
        doneAction: 'done',
        doneLabel: '已发放',
        steps: [
          GtgtStep(key: 'title', label: '教材名'),
          GtgtStep(key: 'field_a', label: '版本'),
          GtgtStep(key: 'field_b', label: '数量', optional: true),
          GtgtStep(key: 'note', label: '领取人', optional: true, multiline: true),
        ],
      );
    case 'energy_defect':
      return const _KindCfg(
        heading: '缺陷隐患',
        industry: 'energy',
        doneAction: 'close',
        doneLabel: '已消除',
        steps: [
          GtgtStep(key: 'title', label: '站点/设备'),
          GtgtStep(key: 'field_a', label: '隐患等级'),
          GtgtStep(key: 'field_b', label: '发现人', optional: true),
          GtgtStep(key: 'note', label: '描述', optional: true, multiline: true),
        ],
      );
    case 'energy_ticket':
      return const _KindCfg(
        heading: '两票管理',
        industry: 'energy',
        doneAction: 'approve',
        doneLabel: '许可开工',
        steps: [
          GtgtStep(key: 'title', label: '票号/作业'),
          GtgtStep(key: 'field_a', label: '票种'),
          GtgtStep(key: 'field_b', label: '负责人'),
          GtgtStep(key: 'note', label: '安全措施', optional: true, multiline: true),
        ],
      );
    case 'energy_spare':
      return const _KindCfg(
        heading: '备件领用',
        industry: 'energy',
        doneAction: 'done',
        doneLabel: '已出库',
        steps: [
          GtgtStep(key: 'title', label: '备件名'),
          GtgtStep(key: 'field_a', label: '数量'),
          GtgtStep(key: 'field_b', label: '用途', optional: true),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'energy_emissions':
      return const _KindCfg(
        heading: '碳排填报',
        industry: 'energy',
        doneAction: 'approve',
        doneLabel: '已报送',
        steps: [
          GtgtStep(key: 'title', label: '站点'),
          GtgtStep(key: 'field_a', label: '周期'),
          GtgtStep(key: 'field_b', label: '排放量', optional: true),
          GtgtStep(key: 'note', label: '说明', optional: true, multiline: true),
        ],
      );
    case 'energy_outage':
      return const _KindCfg(
        heading: '停电计划',
        industry: 'energy',
        doneAction: 'done',
        doneLabel: '已执行',
        steps: [
          GtgtStep(key: 'title', label: '线路/区域'),
          GtgtStep(key: 'field_a', label: '计划时段'),
          GtgtStep(key: 'field_b', label: '影响户数', optional: true),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'gov_appeal':
      return const _KindCfg(
        heading: '诉求受理',
        industry: 'gov',
        doneAction: 'close',
        doneLabel: '已办结',
        steps: [
          GtgtStep(key: 'title', label: '诉求主题'),
          GtgtStep(key: 'field_a', label: '来源渠道'),
          GtgtStep(key: 'field_b', label: '紧急度', optional: true),
          GtgtStep(key: 'note', label: '诉求内容', optional: true, multiline: true),
        ],
      );
    case 'gov_grid':
      return const _KindCfg(
        heading: '网格事件',
        industry: 'gov',
        doneAction: 'done',
        doneLabel: '已处置',
        steps: [
          GtgtStep(key: 'title', label: '事件'),
          GtgtStep(key: 'field_a', label: '网格/社区'),
          GtgtStep(key: 'field_b', label: '网格员', optional: true),
          GtgtStep(key: 'note', label: '处置说明', optional: true, multiline: true),
        ],
      );
    case 'gov_license':
      return const _KindCfg(
        heading: '证照申领',
        industry: 'gov',
        doneAction: 'approve',
        doneLabel: '已发证',
        steps: [
          GtgtStep(key: 'title', label: '证照类型'),
          GtgtStep(key: 'field_a', label: '申请人'),
          GtgtStep(key: 'field_b', label: '材料齐全', optional: true),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'gov_hotline':
      return const _KindCfg(
        heading: '热线转办',
        industry: 'gov',
        doneAction: 'close',
        doneLabel: '已回复',
        steps: [
          GtgtStep(key: 'title', label: '工单号/主题'),
          GtgtStep(key: 'field_a', label: '转办部门'),
          GtgtStep(key: 'field_b', label: '时限', optional: true),
          GtgtStep(key: 'note', label: '摘要', optional: true, multiline: true),
        ],
      );
    case 'legal_filing':
      return const _KindCfg(
        heading: '立案登记',
        industry: 'legal',
        doneAction: 'done',
        doneLabel: '已立案',
        steps: [
          GtgtStep(key: 'title', label: '案由'),
          GtgtStep(key: 'field_a', label: '当事人'),
          GtgtStep(key: 'field_b', label: '案号', optional: true),
          GtgtStep(key: 'note', label: '摘要', optional: true, multiline: true),
        ],
      );
    case 'legal_evidence':
      return const _KindCfg(
        heading: '证据台账',
        industry: 'legal',
        doneAction: 'done',
        doneLabel: '已归档',
        steps: [
          GtgtStep(key: 'title', label: '证据名'),
          GtgtStep(key: 'field_a', label: '关联案件'),
          GtgtStep(key: 'field_b', label: '证据类型', optional: true),
          GtgtStep(key: 'note', label: '说明', optional: true, multiline: true),
        ],
      );
    case 'legal_hearing':
      return const _KindCfg(
        heading: '开庭排期',
        industry: 'legal',
        doneAction: 'done',
        doneLabel: '已开庭',
        steps: [
          GtgtStep(key: 'title', label: '案件'),
          GtgtStep(key: 'field_a', label: '开庭时间'),
          GtgtStep(key: 'field_b', label: '法庭', optional: true),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'legal_contract_ops':
      return const _KindCfg(
        heading: '合同审查单',
        industry: 'legal',
        doneAction: 'approve',
        doneLabel: '审查通过',
        steps: [
          GtgtStep(key: 'title', label: '合同名称'),
          GtgtStep(key: 'field_a', label: '对方'),
          GtgtStep(key: 'field_b', label: '风险点', optional: true),
          GtgtStep(key: 'note', label: '审查意见', optional: true, multiline: true),
        ],
      );
    case 'hr_perf':
      return const _KindCfg(
        heading: '绩效考核',
        industry: 'hr',
        doneAction: 'approve',
        doneLabel: '已确认',
        steps: [
          GtgtStep(key: 'title', label: '员工'),
          GtgtStep(key: 'field_a', label: '周期'),
          GtgtStep(key: 'field_b', label: '等级', optional: true),
          GtgtStep(key: 'note', label: '评语', optional: true, multiline: true),
        ],
      );
    case 'hr_training':
      return const _KindCfg(
        heading: '培训报名',
        industry: 'hr',
        doneAction: 'done',
        doneLabel: '已完成',
        steps: [
          GtgtStep(key: 'title', label: '课程'),
          GtgtStep(key: 'field_a', label: '学员'),
          GtgtStep(key: 'field_b', label: '场次', optional: true),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'hr_headcount':
      return const _KindCfg(
        heading: '编制申请',
        industry: 'hr',
        doneAction: 'approve',
        doneLabel: '已批复',
        steps: [
          GtgtStep(key: 'title', label: '岗位'),
          GtgtStep(key: 'field_a', label: '部门'),
          GtgtStep(key: 'field_b', label: '人数'),
          GtgtStep(key: 'note', label: '理由', optional: true, multiline: true),
        ],
      );
    case 'hr_payroll':
      return const _KindCfg(
        heading: '薪资异议',
        industry: 'hr',
        doneAction: 'close',
        doneLabel: '已处理',
        steps: [
          GtgtStep(key: 'title', label: '员工'),
          GtgtStep(key: 'field_a', label: '月份'),
          GtgtStep(key: 'field_b', label: '异议项', optional: true),
          GtgtStep(key: 'note', label: '说明', optional: true, multiline: true),
        ],
      );
    case 'const_safety':
      return const _KindCfg(
        heading: '现场安全',
        industry: 'construction',
        doneAction: 'close',
        doneLabel: '已整改',
        steps: [
          GtgtStep(key: 'title', label: '工点'),
          GtgtStep(key: 'field_a', label: '隐患'),
          GtgtStep(key: 'field_b', label: '整改人', optional: true),
          GtgtStep(key: 'note', label: '说明', optional: true, multiline: true),
        ],
      );
    case 'const_accept':
      return const _KindCfg(
        heading: '材料验收',
        industry: 'construction',
        doneAction: 'approve',
        doneLabel: '验收通过',
        steps: [
          GtgtStep(key: 'title', label: '材料'),
          GtgtStep(key: 'field_a', label: '批次'),
          GtgtStep(key: 'field_b', label: '结果', optional: true),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'const_progress':
      return const _KindCfg(
        heading: '进度填报',
        industry: 'construction',
        doneAction: 'done',
        doneLabel: '已确认',
        steps: [
          GtgtStep(key: 'title', label: '分项工程'),
          GtgtStep(key: 'field_a', label: '完成比例'),
          GtgtStep(key: 'field_b', label: '日期', optional: true),
          GtgtStep(key: 'note', label: '说明', optional: true, multiline: true),
        ],
      );
    case 'agro_patrol':
      return const _KindCfg(
        heading: '田间巡查',
        industry: 'agriculture',
        doneAction: 'done',
        doneLabel: '已巡查',
        steps: [
          GtgtStep(key: 'title', label: '地块'),
          GtgtStep(key: 'field_a', label: '作物'),
          GtgtStep(key: 'field_b', label: '长势', optional: true),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'agro_subsidy':
      return const _KindCfg(
        heading: '补贴申请',
        industry: 'agriculture',
        doneAction: 'approve',
        doneLabel: '已核准',
        steps: [
          GtgtStep(key: 'title', label: '补贴项目'),
          GtgtStep(key: 'field_a', label: '申请人'),
          GtgtStep(key: 'field_b', label: '面积/数量', optional: true),
          GtgtStep(key: 'note', label: '材料说明', optional: true, multiline: true),
        ],
      );
    case 'agro_inventory':
      return const _KindCfg(
        heading: '农资出入库',
        industry: 'agriculture',
        doneAction: 'done',
        doneLabel: '已记账',
        steps: [
          GtgtStep(key: 'title', label: '农资名'),
          GtgtStep(key: 'field_a', label: '出入类型'),
          GtgtStep(key: 'field_b', label: '数量'),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'media_review':
      return const _KindCfg(
        heading: '内容审核',
        industry: 'media',
        doneAction: 'approve',
        doneLabel: '审核通过',
        steps: [
          GtgtStep(key: 'title', label: '标题/稿件'),
          GtgtStep(key: 'field_a', label: '频道'),
          GtgtStep(key: 'field_b', label: '风险点', optional: true),
          GtgtStep(key: 'note', label: '意见', optional: true, multiline: true),
        ],
      );
    case 'media_calendar':
      return const _KindCfg(
        heading: '发布排期',
        industry: 'media',
        doneAction: 'done',
        doneLabel: '已发布',
        steps: [
          GtgtStep(key: 'title', label: '选题'),
          GtgtStep(key: 'field_a', label: '渠道'),
          GtgtStep(key: 'field_b', label: '发布时间', optional: true),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'auto_service':
      return const _KindCfg(
        heading: '维保工单',
        industry: 'auto',
        doneAction: 'done',
        doneLabel: '已交车',
        steps: [
          GtgtStep(key: 'title', label: '车牌/VIN'),
          GtgtStep(key: 'field_a', label: '项目'),
          GtgtStep(key: 'field_b', label: '里程', optional: true),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'auto_fleet':
      return const _KindCfg(
        heading: '车队调度',
        industry: 'auto',
        doneAction: 'done',
        doneLabel: '已完成',
        steps: [
          GtgtStep(key: 'title', label: '任务'),
          GtgtStep(key: 'field_a', label: '车辆'),
          GtgtStep(key: 'field_b', label: '司机', optional: true),
          GtgtStep(key: 'note', label: '路线', optional: true, multiline: true),
        ],
      );
    case 'mkt_lead':
      return const _KindCfg(
        heading: '线索分配',
        industry: 'marketing',
        doneAction: 'done',
        doneLabel: '已分配',
        steps: [
          GtgtStep(key: 'title', label: '线索/客户'),
          GtgtStep(key: 'field_a', label: '渠道'),
          GtgtStep(key: 'field_b', label: '负责人', optional: true),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    case 'mkt_content':
      return const _KindCfg(
        heading: '内容排期',
        industry: 'marketing',
        doneAction: 'done',
        doneLabel: '已上线',
        steps: [
          GtgtStep(key: 'title', label: '选题'),
          GtgtStep(key: 'field_a', label: '平台'),
          GtgtStep(key: 'field_b', label: '档期', optional: true),
          GtgtStep(key: 'note', label: '备注', optional: true, multiline: true),
        ],
      );
    default:
      return const _KindCfg(
        heading: '业务登记',
        industry: 'office',
        doneAction: 'done',
        doneLabel: '完成',
        steps: [GtgtStep(key: 'title', label: '标题')],
      );
  }
}


class VerticalOpsPage extends StatefulWidget {
  const VerticalOpsPage({super.key, required this.branding, required this.kind});
  final AppBranding branding;
  final String kind;

  @override
  State<VerticalOpsPage> createState() => _VerticalOpsPageState();
}

class _VerticalOpsPageState extends State<VerticalOpsPage> {
  int _reset = 0;
  List<Map<String, dynamic>> _items = [];

  _KindCfg get cfg => _cfgFor(widget.kind);

  Future<void> _load() async {
    final dio = getRuntimeAuthedDio(widget.branding);
    final appId = widget.branding.appPublicId;
    final res = await dio.get(
      '/api/v1/vertical-ops/${widget.kind}/records',
      queryParameters: {if (appId != null && appId.isNotEmpty) 'app_id': appId},
    );
    final list = (res.data['items'] as List?) ?? [];
    setState(() => _items = list.cast<Map<String, dynamic>>());
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _submit(Map<String, String> values) async {
    final dio = getRuntimeAuthedDio(widget.branding);
    await dio.post('/api/v1/vertical-ops/${widget.kind}/records', data: {
      'title': values['title'] ?? values['field_a'] ?? cfg.heading,
      'field_a': values['field_a'] ?? '',
      'field_b': values['field_b'] ?? '',
      'field_c': values['field_c'] ?? '',
      'field_d': values['field_d'] ?? '',
      'note': values['note'] ?? '',
      'app_public_id': widget.branding.appPublicId ?? '',
      'industry_key': cfg.industry,
    });
    setState(() => _reset++);
    await _load();
  }

  Future<void> _act(String id) async {
    final dio = getRuntimeAuthedDio(widget.branding);
    await dio.post('/api/v1/vertical-ops/${widget.kind}/records/$id/${cfg.doneAction}');
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(cfg.heading, style: TextStyle(fontSize: 20, color: widget.branding.primaryColor)),
        const SizedBox(height: 8),
        const Text('空库空列表 · >> 单字段步进 · 真 API'),
        const SizedBox(height: 12),
        GtgtStepComposer(key: ValueKey(_reset), steps: cfg.steps, onComplete: _submit),
        const SizedBox(height: 16),
        ..._items.map((it) {
          final status = '${it['status'] ?? ''}';
          return ListTile(
            title: Text('${it['record_no']} · ${it['title']}'),
            subtitle: Text('$status'),
            trailing: status == 'open'
                ? TextButton(onPressed: () => _act('${it['id']}'), child: Text(cfg.doneLabel))
                : null,
          );
        }),
        if (_items.isEmpty) const Text('暂无记录'),
      ],
    );
  }
}
