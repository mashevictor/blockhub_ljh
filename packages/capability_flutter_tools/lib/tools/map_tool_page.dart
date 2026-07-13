import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

import '../tool_permission.dart';

class MapToolPage extends StatefulWidget {
  const MapToolPage({super.key, required this.branding});

  final AppBranding branding;

  @override
  State<MapToolPage> createState() => _MapToolPageState();
}

class _MapToolPageState extends State<MapToolPage> {
  LatLng? _center;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      if (!await ensureLocation()) throw StateError('需要定位权限');
      final pos = await Geolocator.getCurrentPosition();
      if (!mounted) return;
      setState(() => _center = LatLng(pos.latitude, pos.longitude));
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _center = const LatLng(31.2304, 121.4737); // 上海 fallback
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final center = _center;
    if (center == null) return const Center(child: CircularProgressIndicator());
    return Column(
      children: [
        if (_error != null)
          Material(
            color: Colors.orange.shade100,
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: Text('定位: $_error · 使用默认中心', style: const TextStyle(fontSize: 12)),
            ),
          ),
        Expanded(
          child: FlutterMap(
            options: MapOptions(initialCenter: center, initialZoom: 14),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'com.trackchat.runtime',
              ),
              MarkerLayer(
                markers: [
                  Marker(point: center, width: 40, height: 40, child: const Icon(Icons.location_pin, color: Colors.red, size: 40)),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}
