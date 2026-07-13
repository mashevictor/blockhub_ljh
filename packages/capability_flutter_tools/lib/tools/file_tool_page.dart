import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

class FileToolPage extends StatefulWidget {
  const FileToolPage({super.key, required this.branding});

  final AppBranding branding;

  @override
  State<FileToolPage> createState() => _FileToolPageState();
}

class _FileToolPageState extends State<FileToolPage> {
  PlatformFile? _file;
  String? _error;

  Future<void> _pick() async {
    setState(() => _error = null);
    try {
      final result = await FilePicker.platform.pickFiles(withData: false);
      if (!mounted) return;
      setState(() => _file = result?.files.single);
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
        Text('文件选择', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: _pick,
          icon: const Icon(Icons.attach_file),
          label: const Text('选择文件'),
          style: FilledButton.styleFrom(backgroundColor: color),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(_error!, style: const TextStyle(color: Colors.red)),
        ],
        if (_file != null) ...[
          const SizedBox(height: 16),
          Card(
            child: ListTile(
              leading: Icon(Icons.insert_drive_file, color: color),
              title: Text(_file!.name),
              subtitle: Text('${(_file!.size / 1024).toStringAsFixed(1)} KB\n${_file!.path ?? ''}'),
            ),
          ),
        ],
      ],
    );
  }
}
