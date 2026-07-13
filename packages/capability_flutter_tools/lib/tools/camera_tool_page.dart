import 'dart:io';

import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../tool_permission.dart';

class CameraToolPage extends StatefulWidget {
  const CameraToolPage({super.key, required this.branding});

  final AppBranding branding;

  @override
  State<CameraToolPage> createState() => _CameraToolPageState();
}

class _CameraToolPageState extends State<CameraToolPage> {
  final _picker = ImagePicker();
  XFile? _photo;
  String? _error;

  Future<void> _capture(ImageSource source) async {
    setState(() => _error = null);
    if (source == ImageSource.camera && !await ensureCamera()) {
      setState(() => _error = '需要相机权限');
      return;
    }
    try {
      final file = await _picker.pickImage(source: source, maxWidth: 1920, imageQuality: 85);
      if (!mounted) return;
      setState(() => _photo = file);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('拍照上传', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: FilledButton.icon(
                onPressed: () => _capture(ImageSource.camera),
                icon: const Icon(Icons.camera_alt),
                label: const Text('拍照'),
                style: FilledButton.styleFrom(backgroundColor: color),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => _capture(ImageSource.gallery),
                icon: const Icon(Icons.photo_library),
                label: const Text('相册'),
              ),
            ),
          ],
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(_error!, style: const TextStyle(color: Colors.red)),
        ],
        if (_photo != null) ...[
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.file(File(_photo!.path), height: 240, width: double.infinity, fit: BoxFit.cover),
          ),
          const SizedBox(height: 8),
          Text(_photo!.path, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
        ],
      ],
    );
  }
}
