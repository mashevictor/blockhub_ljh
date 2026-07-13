import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import '../tool_permission.dart';

class GeoToolPage extends StatefulWidget {
  const GeoToolPage({super.key, required this.branding});

  final AppBranding branding;

  @override
  State<GeoToolPage> createState() => _GeoToolPageState();
}

class _GeoToolPageState extends State<GeoToolPage> {
  Position? _pos;
  String? _error;
  bool _loading = false;

  Future<void> _locate() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      if (!await ensureLocation()) {
        throw StateError('需要定位权限');
      }
      final service = await Geolocator.isLocationServiceEnabled();
      if (!service) throw StateError('请开启系统定位服务');
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      if (!mounted) return;
      setState(() => _pos = pos);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('定位签到', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: _loading ? null : _locate,
          icon: _loading
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.my_location),
          label: const Text('获取当前位置'),
          style: FilledButton.styleFrom(backgroundColor: color),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(_error!, style: const TextStyle(color: Colors.red)),
        ],
        if (_pos != null) ...[
          const SizedBox(height: 16),
          Card(
            child: ListTile(
              leading: Icon(Icons.place, color: color),
              title: Text('${_pos!.latitude.toStringAsFixed(6)}, ${_pos!.longitude.toStringAsFixed(6)}'),
              subtitle: Text('精度 ±${_pos!.accuracy.toStringAsFixed(1)} m · ${DateTime.now()}'),
            ),
          ),
        ],
      ],
    );
  }
}
