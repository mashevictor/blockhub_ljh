import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../tool_permission.dart';

class ScanToolPage extends StatefulWidget {
  const ScanToolPage({super.key, required this.branding});

  final AppBranding branding;

  @override
  State<ScanToolPage> createState() => _ScanToolPageState();
}

class _ScanToolPageState extends State<ScanToolPage> {
  String? _result;
  String? _error;
  bool _ready = false;
  MobileScannerController? _controller;

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final ok = await ensureCamera();
    if (!mounted) return;
    if (!ok) {
      setState(() => _error = '需要相机权限才能扫码');
      return;
    }
    setState(() {
      _ready = true;
      _controller = MobileScannerController(detectionSpeed: DetectionSpeed.normal);
    });
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Center(child: Text(_error!, style: const TextStyle(color: Colors.red)));
    }
    if (!_ready || _controller == null) {
      return const Center(child: CircularProgressIndicator());
    }
    return Column(
      children: [
        Expanded(
          child: MobileScanner(
            controller: _controller,
            onDetect: (capture) {
              final barcodes = capture.barcodes;
              if (barcodes.isEmpty) return;
              final raw = barcodes.first.rawValue;
              if (raw != null && raw != _result) {
                setState(() => _result = raw);
              }
            },
          ),
        ),
        if (_result != null)
          Container(
            width: double.infinity,
            color: Colors.black87,
            padding: const EdgeInsets.all(12),
            child: Text('识别: $_result', style: const TextStyle(color: Colors.white)),
          ),
      ],
    );
  }
}
