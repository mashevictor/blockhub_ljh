import 'package:flutter/material.dart';

import '../config/app_branding.dart';
import 'approval_page.dart';
import 'chat_page.dart';
import 'nl_query_page.dart';
import 'report_page.dart';
import 'shanghai_voice_page.dart';

/// 能力页面注册表：capability_key -> 页面构造器。
///
/// key 与 backend capability_registry / page_schema.menu 对齐（含别名）。
typedef CapabilityPageBuilder = Widget Function(AppBranding branding);

Widget _chat(AppBranding b) => ChatPage(branding: b);
Widget _approval(AppBranding b) => ApprovalPage(branding: b);
Widget _report(AppBranding b) => ReportPage(branding: b);
Widget _voice(AppBranding b) => ShanghaiVoicePage(branding: b);
Widget _nlQuery(AppBranding b) => NLQueryPage(branding: b);

final Map<String, CapabilityPageBuilder> capabilityPages = {
  // 语音
  'shanghai_voice': _voice,
  'shanghai_voice_stream': _voice,
  'chat_voice': _voice,
  'flutter_speech': _voice,
  // 问答
  'chat_qa': _chat,
  'chat': _chat,
  'multi_agent': _chat,
  'chat_summary': _chat,
  'kb_document': _chat,
  'kb_search': _chat,
  'data_nl_query': _nlQuery,
  // 审批
  'approval_flow': _approval,
  'approval_inbox': _approval,
  'approval': _approval,
  'approval_countersign': _approval,
  'approval_conditional': _approval,
  'approval_remind': _approval,
  'approval_esign': _approval,
  'contract_editor': _approval,
  'contract_esign': _approval,
  // 报表 / 看板
  'chart_dashboard': _report,
  'chart_line': _report,
  'chart_bar': _report,
  'report_scheduled': _report,
  'data_export': _report,
  'report': _report,
  'notify_inapp': _report,
  'notify_email': _report,
  'notify_sms': _report,
  'announce_board': _report,
  'schedule_alarm': _report,
};
