import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class WebViewToolPage extends StatefulWidget {
  const WebViewToolPage({super.key, required this.branding});

  final AppBranding branding;

  @override
  State<WebViewToolPage> createState() => _WebViewToolPageState();
}

class _WebViewToolPageState extends State<WebViewToolPage> {
  late final WebViewController _controller;
  final _urlCtrl = TextEditingController(text: 'https://flutter.dev');

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..loadRequest(Uri.parse(_urlCtrl.text));
  }

  @override
  void dispose() {
    _urlCtrl.dispose();
    super.dispose();
  }

  void _load() {
    final uri = Uri.tryParse(_urlCtrl.text.trim());
    if (uri != null) _controller.loadRequest(uri);
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(8),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _urlCtrl,
                  decoration: const InputDecoration(hintText: 'URL', isDense: true, border: OutlineInputBorder()),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(onPressed: _load, style: FilledButton.styleFrom(backgroundColor: color), child: const Text('打开')),
            ],
          ),
        ),
        Expanded(child: WebViewWidget(controller: _controller)),
      ],
    );
  }
}
