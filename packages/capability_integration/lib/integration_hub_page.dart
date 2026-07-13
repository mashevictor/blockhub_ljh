import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

/// 外部集成能力专属页（ERP / 会议室 / 报障 / 资产 / IM / RBAC）
class IntegrationHubPage extends StatelessWidget {
  const IntegrationHubPage({super.key, required this.branding, required this.capabilityKey});

  final AppBranding branding;
  final String capabilityKey;

  static const _presets = <String, ({String title, String desc, List<String> actions})>{
    'erp_connector': (
      title: 'ERP 对接',
      desc: '连接用友 / 金蝶 / SAP，同步主数据与单据。',
      actions: ['测试连接', '同步主数据', '查看映射'],
    ),
    'oa_connector': (
      title: 'OA 连接器',
      desc: '对接泛微 / 致远 / 蓝凌等 OA 流程。',
      actions: ['配置 Webhook', '流程映射', '同步日志'],
    ),
    'meeting_booking': (
      title: '会议室预约',
      desc: '查看空闲会议室并完成预约。',
      actions: ['今日空闲', '发起预约', '我的预订'],
    ),
    'it_helpdesk': (
      title: 'IT 报障',
      desc: '提交 IT 工单并跟踪处理进度。',
      actions: ['新建工单', '我的工单', '知识库'],
    ),
    'asset_manage': (
      title: '资产管理',
      desc: '固定资产领用、归还与盘点。',
      actions: ['资产领用', '归还登记', '盘点任务'],
    ),
    'im_connector': (
      title: '企微 / 钉钉',
      desc: '配置企业 IM 通道并发送业务通知。',
      actions: ['绑定企微', '绑定钉钉', '测试消息'],
    ),
    'notify_im': (
      title: '企微 / 钉钉',
      desc: '配置企业 IM 通道并发送业务通知。',
      actions: ['绑定企微', '绑定钉钉', '测试消息'],
    ),
    'rbac_page': (
      title: '角色权限',
      desc: '配置应用可见范围与角色能力。',
      actions: ['角色列表', '成员授权', '审计日志'],
    ),
    'auth_sso': (
      title: 'SSO 单点登录',
      desc: '统一身份认证与登录跳转。',
      actions: ['测试连接', '预览登录页', '同步用户'],
    ),
  };

  @override
  Widget build(BuildContext context) {
    final color = Color(branding.primaryColorValue);
    final preset = _presets[capabilityKey] ??
        (
          title: '外部集成',
          desc: '对接第三方系统能力模块。',
          actions: ['配置连接', '查看日志'],
        );

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(preset.title, style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        Text(preset.desc, style: TextStyle(color: Colors.grey.shade600)),
        const SizedBox(height: 16),
        ...preset.actions.map(
          (label) => Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: Icon(Icons.link, color: color),
              title: Text(label),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
          ),
        ),
      ],
    );
  }
}
