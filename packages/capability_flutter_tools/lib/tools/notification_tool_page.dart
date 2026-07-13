import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

import '../tool_permission.dart';

class NotificationToolService {
  static final FlutterLocalNotificationsPlugin plugin = FlutterLocalNotificationsPlugin();
  static bool _inited = false;

  static Future<void> ensureInit() async {
    if (_inited) return;
    tz_data.initializeTimeZones();
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    await plugin.initialize(const InitializationSettings(android: android));
    _inited = true;
  }
}

class AlarmToolPage extends StatefulWidget {
  const AlarmToolPage({super.key, required this.branding});

  final AppBranding branding;

  @override
  State<AlarmToolPage> createState() => _AlarmToolPageState();
}

class _AlarmToolPageState extends State<AlarmToolPage> {
  String _status = '设置 10 秒后的本地提醒';

  Future<void> _schedule() async {
    await NotificationToolService.ensureInit();
    await ensureNotifications();
    final when = tz.TZDateTime.now(tz.local).add(const Duration(seconds: 10));
    await NotificationToolService.plugin.zonedSchedule(
      1,
      'BlockHub 闹钟',
      '定时提醒到点（10 秒后）',
      when,
      const NotificationDetails(
        android: AndroidNotificationDetails('blockhub_alarm', '闹钟', importance: Importance.high),
      ),
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.absoluteTime,
    );
    if (!mounted) return;
    setState(() => _status = '已设定 ${when.toLocal()} 提醒');
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('定时闹钟', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),
        Text(_status),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: _schedule,
          style: FilledButton.styleFrom(backgroundColor: color),
          child: const Text('10 秒后提醒'),
        ),
      ],
    );
  }
}

class PushToolPage extends StatefulWidget {
  const PushToolPage({super.key, required this.branding});

  final AppBranding branding;

  @override
  State<PushToolPage> createState() => _PushToolPageState();
}

class _PushToolPageState extends State<PushToolPage> {
  String _status = '本地推送演示（非 TPNS/FCM 云端）';

  Future<void> _notifyNow() async {
    await NotificationToolService.ensureInit();
    await ensureNotifications();
    await NotificationToolService.plugin.show(
      2,
      'BlockHub 推送',
      '这是一条本地通知演示',
      const NotificationDetails(
        android: AndroidNotificationDetails('blockhub_push', '推送', importance: Importance.defaultImportance),
      ),
    );
    if (!mounted) return;
    setState(() => _status = '已发送本地通知');
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('移动推送', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        Text(_status, style: TextStyle(color: Colors.grey.shade600)),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: _notifyNow,
          style: FilledButton.styleFrom(backgroundColor: color),
          child: const Text('立即通知'),
        ),
      ],
    );
  }
}
