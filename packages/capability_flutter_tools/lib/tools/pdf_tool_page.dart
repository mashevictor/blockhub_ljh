import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_pdfview/flutter_pdfview.dart';

class PdfToolPage extends StatefulWidget {
  const PdfToolPage({super.key, required this.branding});

  final AppBranding branding;

  @override
  State<PdfToolPage> createState() => _PdfToolPageState();
}

class _PdfToolPageState extends State<PdfToolPage> {
  String? _path;
  String? _error;

  Future<void> _pick() async {
    setState(() => _error = null);
    try {
      final result = await FilePicker.platform.pickFiles(type: FileType.custom, allowedExtensions: ['pdf']);
      final path = result?.files.single.path;
      if (path == null) return;
      if (!mounted) return;
      setState(() => _path = path);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    if (_path != null) {
      return Column(
        children: [
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(onPressed: () => setState(() => _path = null), child: const Text('重选')),
          ),
          Expanded(child: PDFView(filePath: _path!)),
        ],
      );
    }
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('PDF 预览', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),
        FilledButton(onPressed: _pick, style: FilledButton.styleFrom(backgroundColor: color), child: const Text('选择 PDF 文件')),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(_error!, style: const TextStyle(color: Colors.red)),
        ],
      ],
    );
  }
}
