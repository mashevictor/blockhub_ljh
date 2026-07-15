import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class HotelBookingPage extends StatefulWidget {
  const HotelBookingPage({super.key, required this.branding});
  final AppBranding branding;
  @override
  State<HotelBookingPage> createState() => _HotelBookingPageState();
}

class _HotelBookingPageState extends State<HotelBookingPage> {
  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  int _resetKey = 0;
  final Map<String, String> _values = {};

  String get _base => '${widget.branding.apiBaseUrl}/hotel-booking';
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
    if ((_values['room_type'] ?? '').trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'guest_name': (_values['guest_name'] ?? '散客').trim(),
        'room_type': (_values['room_type'] ?? '').trim(),
        'check_in': (_values['check_in'] ?? '').trim(),
        'check_out': (_values['check_out'] ?? '').trim(),
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

  Future<void> _checkIn(String id) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records/$id/check-in');
    await _load();
  }

  Future<void> _cancel(String id) async {
    final dio = getRuntimeAuthedDio();
    await dio.post('$_base/records/$id/cancel');
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        GtgtStepComposer(
          title: '酒店预订',
          flowHint: '客人 → 房型 → 入住 → 退房 → 备注',
          accent: color,
          steps: const [
            GtgtStep(key: 'guest_name', label: '客人姓名', optional: true),
            GtgtStep(key: 'room_type', label: '房型', placeholder: '大床房…'),
            GtgtStep(key: 'check_in', label: '入住日期', placeholder: '2026-03-15'),
            GtgtStep(key: 'check_out', label: '退房日期', placeholder: '2026-03-17'),
            GtgtStep(key: 'note', label: '备注', optional: true),
          ],
          values: _values,
          onChanged: (k, v) => setState(() => _values[k] = v),
          onComplete: _submit,
          busy: _busy,
          resetKey: _resetKey,
          submitLabel: '提交预订',
        ),
        const SizedBox(height: 16),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else
          ..._items.map((raw) {
            final t = Map<String, dynamic>.from(raw as Map);
            final id = '${t['id']}';
            return Card(
              child: ListTile(
                title: Text('${t['record_no']} · ${t['guest_name']}'),
                subtitle: Text('${t['room_type']} · ${t['check_in']} → ${t['check_out']} · ${t['status']}'),
                trailing: t['status'] == 'booked'
                    ? Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          TextButton(onPressed: () => _checkIn(id), child: const Text('入住')),
                          TextButton(onPressed: () => _cancel(id), child: const Text('取消')),
                        ],
                      )
                    : null,
              ),
            );
          }),
      ],
    );
  }
}
