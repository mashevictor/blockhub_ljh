import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class ItTicketModule implements CapabilityModule {
  const ItTicketModule();
  @override
  String get capabilityKey => 'it_ticket';
  @override
  Widget buildPage(AppBranding branding) => _ItTicketPage(branding: branding);
}

class _ItTicketPage extends StatefulWidget {
  const _ItTicketPage({required this.branding});
  final AppBranding branding;
  @override
  State<_ItTicketPage> createState() => _ItTicketPageState();
}

class _ItTicketPageState extends State<_ItTicketPage> {
  List<dynamic> items = const [];
  bool loading = true;
  String msg = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      final dio = getRuntimeAuthedDio();
      final appId = widget.branding.appPublicId;
      final q = appId.isNotEmpty ? '?app_id=${Uri.encodeComponent(appId)}' : '';
      final res = await dio.get('${widget.branding.apiBaseUrl}/it-ticket/tickets$q');
      setState(() {
        items = (res.data is Map && res.data['items'] is List) ? res.data['items'] as List : const [];
        loading = false;
      });
    } catch (e) {
      setState(() {
        msg = '$e';
        loading = false;
        items = const [];
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('IT 报障')),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (msg.isNotEmpty) Text(msg),
                if (items.isEmpty) const Text('暂无工单，请在 Web Runtime 提交后同步查看'),
                ...items.map((raw) {
                  final m = raw is Map ? raw : <String, dynamic>{};
                  return ListTile(
                    title: Text('${m['ticket_no'] ?? ''} · ${m['title'] ?? ''}'),
                    subtitle: Text('${m['status'] ?? ''}'),
                  );
                }),
              ],
            ),
    );
  }
}
