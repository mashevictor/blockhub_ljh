import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

import 'capability_deferred_loader.g.dart';

/// P2 · deferred import 懒加载能力页（重组件）。
class DeferredCapabilityHost extends StatefulWidget {
  const DeferredCapabilityHost({super.key, required this.capabilityKey, required this.branding});

  final String capabilityKey;
  final AppBranding branding;

  @override
  State<DeferredCapabilityHost> createState() => _DeferredCapabilityHostState();
}

class _DeferredCapabilityHostState extends State<DeferredCapabilityHost> {
  Widget? _page;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final page = await buildDeferredCapabilityPage(
        key: widget.capabilityKey,
        branding: widget.branding,
      );
      if (!mounted) return;
      setState(() {
        _page = page;
        _error = page == null ? 'deferred 模块未配置: ${widget.capabilityKey}' : null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Center(child: Text(_error!, style: const TextStyle(color: Colors.red)));
    }
    if (_page == null) {
      return const Center(child: CircularProgressIndicator());
    }
    return _page!;
  }
}

bool shouldDeferCapabilityKey(String key) => isDeferredCapabilityKey(key);
