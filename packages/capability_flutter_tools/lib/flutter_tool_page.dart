import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

const _labels = <String, String>{
  'schedule_alarm': '定时闹钟',
  'flutter_push': '移动推送',
  'flutter_scan_qr': '扫码识别',
  'flutter_geolocation': '定位签到',
  'flutter_camera': '拍照上传',
  'flutter_map': '地图导航',
  'flutter_offline': '离线缓存',
  'flutter_biometric': '生物识别',
  'flutter_signature': '手写签名',
  'flutter_file_picker': '文件选择',
  'flutter_pdf': 'PDF 预览',
  'flutter_webview': '内嵌网页',
  'flutter_chart': '移动图表',
};

class FlutterToolPage extends StatelessWidget {
  const FlutterToolPage({super.key, required this.branding, required this.capabilityKey});

  final AppBranding branding;
  final String capabilityKey;

  @override
  Widget build(BuildContext context) {
    final color = Color(branding.primaryColorValue);
    final title = _labels[capabilityKey] ?? capabilityKey;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(title, style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        Text(
          'Flutter 原生工具能力（P2 stub，后续接设备 API）',
          style: TextStyle(color: Colors.grey.shade600),
        ),
        const SizedBox(height: 16),
        Card(
          child: ListTile(
            leading: Icon(Icons.phone_android, color: color),
            title: const Text('设备能力占位'),
            subtitle: Text('capability_key: $capabilityKey'),
          ),
        ),
        const SizedBox(height: 12),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: color),
          onPressed: () {},
          child: const Text('即将接入'),
        ),
      ],
    );
  }
}
