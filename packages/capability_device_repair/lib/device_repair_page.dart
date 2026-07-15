import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class DeviceRepairPage extends StatefulWidget {
  const DeviceRepairPage({super.key, required this.branding});

  final AppBranding branding;

  @override
  State<DeviceRepairPage> createState() => _DeviceRepairPageState();
}

class _DeviceRepairPageState extends State<DeviceRepairPage> {
  final _assetCtrl = TextEditingController();
  final _locCtrl = TextEditingController();
  final _faultCtrl = TextEditingController();

  List<dynamic> _items = [];
  bool _loading = true;
  bool _busy = false;
  int _step = 0;
  String? _error;

  static const _steps = ['设备编号', '工位位置', '故障描述'];

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _assetCtrl.dispose();
    _locCtrl.dispose();
    _faultCtrl.dispose();
    super.dispose();
  }

  String get _base => '${widget.branding.apiBaseUrl}/device-repair';

  String get _appPublicId => widget.branding.appPublicId.trim();

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final dio = getRuntimeAuthedDio();
      final appId = _appPublicId;
      final q = appId.isNotEmpty ? '?app_id=${Uri.encodeQueryComponent(appId)}' : '';
      final resp = await dio.get<Map<String, dynamic>>('$_base/tickets$q');
      _items = resp.data?['items'] as List<dynamic>? ?? [];
    } catch (e) {
      _error = '加载失败: $e';
      _items = [];
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submit() async {
    final asset = _assetCtrl.text.trim();
    final fault = _faultCtrl.text.trim();
    if (asset.isEmpty || fault.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('请填写设备编号与故障描述')),
      );
      return;
    }
    setState(() => _busy = true);
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post(
        '$_base/tickets',
        data: {
          'asset_code': asset,
          'location': _locCtrl.text.trim(),
          'fault': fault,
          'app_public_id': _appPublicId,
        },
      );
      _assetCtrl.clear();
      _locCtrl.clear();
      _faultCtrl.clear();
      _step = 0;
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('报修单已提交')),
        );
      }
      await _load();
    } catch (e) {
      setState(() => _error = '提交失败: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _advance(Map<String, dynamic> t) async {
    final id = t['id']?.toString() ?? '';
    if (id.isEmpty) return;
    final status = t['status']?.toString() ?? '';
    if (status == 'pending') {
      final nameCtrl = TextEditingController();
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('派工选人'),
          content: TextField(
            controller: nameCtrl,
            decoration: const InputDecoration(
              labelText: '维修工姓名',
              hintText: '选择或填写，如：张三',
            ),
            autofocus: true,
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('取消')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('确认派工')),
          ],
        ),
      );
      final name = nameCtrl.text.trim();
      nameCtrl.dispose();
      if (ok != true || name.isEmpty) return;
      try {
        final dio = getRuntimeAuthedDio();
        await dio.post(
          '$_base/tickets/$id/action',
          data: {'action': 'dispatch', 'assignee_name': name},
        );
        await _load();
      } catch (e) {
        setState(() => _error = '派工失败: $e');
      }
      return;
    }
    try {
      final dio = getRuntimeAuthedDio();
      await dio.post(
        '$_base/tickets/$id/action',
        data: {'action': 'complete'},
      );
      await _load();
    } catch (e) {
      setState(() => _error = '操作失败: $e');
    }
  }

  String _label(String s) {
    switch (s) {
      case 'pending':
        return '待派工';
      case 'dispatched':
        return '维修中';
      case 'done':
        return '已完工';
      default:
        return s;
    }
  }

  bool get _canNext {
    if (_step == 0) return _assetCtrl.text.trim().isNotEmpty;
    if (_step == 2) return _faultCtrl.text.trim().isNotEmpty;
    return true;
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            Expanded(child: Text('设备报修', style: Theme.of(context).textTheme.titleLarge)),
            Text('${_step + 1}/${_steps.length}', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
          ],
        ),
        const SizedBox(height: 4),
        Text('提单 → 派工选人 → 完工 · 同租户协作', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
        if (_error != null) ...[
          const SizedBox(height: 8),
          Text(_error!, style: const TextStyle(color: Colors.red, fontSize: 13)),
        ],
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 6,
          children: [
            for (var i = 0; i < _steps.length; i++)
              Chip(
                avatar: CircleAvatar(
                  backgroundColor: i <= _step ? color : Colors.grey.shade300,
                  radius: 6,
                ),
                label: Text(_steps[i], style: TextStyle(fontSize: 12, fontWeight: i == _step ? FontWeight.w600 : FontWeight.w400)),
                backgroundColor: i == _step ? color.withOpacity(0.12) : Colors.grey.shade100,
                side: BorderSide.none,
              ),
          ],
        ),
        const SizedBox(height: 12),
        if (_step == 0)
          TextField(
            controller: _assetCtrl,
            decoration: const InputDecoration(
              labelText: '设备编号',
              border: OutlineInputBorder(),
              hintText: '扫码或输入 CNC-A12',
            ),
            onChanged: (_) => setState(() {}),
          )
        else if (_step == 1)
          TextField(
            controller: _locCtrl,
            decoration: const InputDecoration(
              labelText: '位置 / 工位',
              border: OutlineInputBorder(),
              hintText: '一车间·3号线（可留空）',
            ),
          )
        else
          TextField(
            controller: _faultCtrl,
            maxLines: 3,
            decoration: const InputDecoration(
              labelText: '故障描述',
              border: OutlineInputBorder(),
              hintText: '现象、是否停机…',
            ),
            onChanged: (_) => setState(() {}),
          ),
        const SizedBox(height: 12),
        Row(
          children: [
            if (_step > 0)
              TextButton(onPressed: () => setState(() => _step -= 1), child: const Text('上一步')),
            const Spacer(),
            if (_step < _steps.length - 1)
              FilledButton(
                style: FilledButton.styleFrom(backgroundColor: color),
                onPressed: _canNext ? () => setState(() => _step += 1) : null,
                child: const Text('下一步'),
              )
            else
              FilledButton(
                style: FilledButton.styleFrom(backgroundColor: color),
                onPressed: _busy || !_canNext ? null : _submit,
                child: Text(_busy ? '提交中…' : '提交报修'),
              ),
          ],
        ),
        const SizedBox(height: 20),
        Row(
          children: [
            Text('工单列表', style: Theme.of(context).textTheme.titleMedium),
            const Spacer(),
            IconButton(onPressed: _loading ? null : _load, icon: const Icon(Icons.refresh), tooltip: '刷新'),
          ],
        ),
        if (_loading)
          const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator()))
        else if (_items.isEmpty)
          Text('暂无工单，按步骤提交后写入数据库', style: TextStyle(color: Colors.grey.shade600))
        else
          ..._items.map((raw) {
            final t = Map<String, dynamic>.from(raw as Map);
            final status = t['status']?.toString() ?? '';
            final no = t['ticket_no']?.toString() ?? t['id']?.toString() ?? '';
            final asset = t['asset_code']?.toString() ?? '';
            final loc = t['location']?.toString() ?? '';
            final fault = t['fault']?.toString() ?? '';
            final assignee = t['assignee_name']?.toString() ?? '';
            final reporter = t['reporter_name']?.toString() ?? '';
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                title: Text('$no · $asset'),
                subtitle: Text(
                  '$loc\n$fault\n报修:${reporter.isEmpty ? '—' : reporter}'
                  '${assignee.isEmpty ? '' : ' · 维修:$assignee'}',
                ),
                isThreeLine: true,
                trailing: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(_label(status), style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 12)),
                    if (status != 'done')
                      TextButton(
                        onPressed: () => _advance(t),
                        child: Text(status == 'pending' ? '派工选人' : '完工', style: const TextStyle(fontSize: 12)),
                      ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }
}
