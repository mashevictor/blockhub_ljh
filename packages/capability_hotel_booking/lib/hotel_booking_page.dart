import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

const _rooms = [
  ('标准间', '双床 · 适合差旅'),
  ('大床房', '1.8m 床 · 商务常选'),
  ('套房', '客厅+卧室 · 会客'),
];

const _statusLabel = {
  'booked': '已预订',
  'checked_in': '已入住',
  'cancelled': '已取消',
};

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
  String _roomType = '大床房';
  final _checkInCtrl = TextEditingController();
  final _checkOutCtrl = TextEditingController();
  final _guestCtrl = TextEditingController();

  String get _base => '${widget.branding.apiBaseUrl}/hotel-booking';
  String get _appId => widget.branding.appPublicId.trim();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _checkInCtrl.dispose();
    _checkOutCtrl.dispose();
    _guestCtrl.dispose();
    super.dispose();
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
    if (_checkInCtrl.text.trim().isEmpty || _checkOutCtrl.text.trim().isEmpty) return;
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post('$_base/records', data: {
        'guest_name': _guestCtrl.text.trim().isEmpty ? '散客' : _guestCtrl.text.trim(),
        'room_type': _roomType,
        'check_in': _checkInCtrl.text.trim(),
        'check_out': _checkOutCtrl.text.trim(),
        'note': '',
        'app_public_id': _appId,
      });
      _guestCtrl.clear();
      _checkInCtrl.clear();
      _checkOutCtrl.clear();
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
    final active = _items
        .map((e) => Map<String, dynamic>.from(e as Map))
        .where((t) => '${t['status']}' == 'booked')
        .toList();
    final others = _items
        .map((e) => Map<String, dynamic>.from(e as Map))
        .where((t) => '${t['status']}' != 'booked')
        .toList();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('选择房型', style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        Row(
          children: _rooms.map((r) {
            final selected = _roomType == r.$1;
            return Expanded(
              child: Padding(
                padding: const EdgeInsets.only(right: 6),
                child: InkWell(
                  onTap: () => setState(() => _roomType = r.$1),
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: selected ? color : Colors.black12,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(r.$1,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: selected ? Colors.white : null,
                              fontSize: 13,
                            )),
                        Text(r.$2,
                            style: TextStyle(fontSize: 10, color: selected ? Colors.white70 : Colors.black54)),
                      ],
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _checkInCtrl,
                decoration: const InputDecoration(labelText: '入住 YYYY-MM-DD', isDense: true),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: _checkOutCtrl,
                decoration: const InputDecoration(labelText: '退房 YYYY-MM-DD', isDense: true),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _guestCtrl,
          decoration: const InputDecoration(labelText: '入住人（可空）', isDense: true),
        ),
        const SizedBox(height: 8),
        ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: color),
          onPressed: _busy ? null : _submit,
          child: Text('确认预订 · $_roomType'),
        ),
        const SizedBox(height: 16),
        Text('待入住', style: Theme.of(context).textTheme.titleSmall),
        if (_loading)
          const Center(child: CircularProgressIndicator())
        else if (active.isEmpty)
          const Text('暂无预订')
        else
          ...active.map((t) {
            final id = '${t['id']}';
            return Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${t['room_type']} · ${t['guest_name']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                    Text('${t['check_in']} → ${t['check_out']}'),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: color),
                          onPressed: () => _checkIn(id),
                          child: const Text('办理入住'),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton(onPressed: () => _cancel(id), child: const Text('取消')),
                      ],
                    ),
                  ],
                ),
              ),
            );
          }),
        if (others.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text('历史', style: Theme.of(context).textTheme.titleSmall),
          ...others.map(
            (t) => Card(
              child: ListTile(
                title: Text('${t['room_type']} · ${t['guest_name']}'),
                subtitle: Text('${t['check_in']} → ${t['check_out']}'),
                trailing: Text(_statusLabel['${t['status']}'] ?? '${t['status']}'),
              ),
            ),
          ),
        ],
      ],
    );
  }
}
