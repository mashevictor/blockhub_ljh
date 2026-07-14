import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';

class _Ticket {
  _Ticket({
    required this.id,
    required this.assetCode,
    required this.location,
    required this.fault,
    required this.status,
  });

  final String id;
  final String assetCode;
  final String location;
  final String fault;
  String status;
}

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

  final List<_Ticket> _items = [
    _Ticket(
      id: 'WO-1001',
      assetCode: 'CNC-A12',
      location: '一车间·3号线',
      fault: '主轴异响，需停机检修',
      status: 'dispatched',
    ),
  ];

  @override
  void dispose() {
    _assetCtrl.dispose();
    _locCtrl.dispose();
    _faultCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    final asset = _assetCtrl.text.trim();
    final fault = _faultCtrl.text.trim();
    if (asset.isEmpty || fault.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('请填写设备编号与故障描述')),
      );
      return;
    }
    setState(() {
      _items.insert(
        0,
        _Ticket(
          id: 'WO-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
          assetCode: asset,
          location: _locCtrl.text.trim().isEmpty ? '未填写工位' : _locCtrl.text.trim(),
          fault: fault,
          status: 'pending',
        ),
      );
      _assetCtrl.clear();
      _locCtrl.clear();
      _faultCtrl.clear();
    });
  }

  void _advance(_Ticket t) {
    setState(() {
      if (t.status == 'pending') {
        t.status = 'dispatched';
      } else if (t.status == 'dispatched') {
        t.status = 'done';
      }
    });
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

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('设备报修工单', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 4),
        Text(
          '弹幕「设备报修」· CapShip 路径 A',
          style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _assetCtrl,
          decoration: const InputDecoration(
            labelText: '设备编号',
            border: OutlineInputBorder(),
            hintText: '扫码或输入 CNC-A12',
          ),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _locCtrl,
          decoration: const InputDecoration(
            labelText: '位置 / 工位',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: _faultCtrl,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: '故障描述',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: color),
          onPressed: _submit,
          child: const Text('提交报修'),
        ),
        const SizedBox(height: 20),
        Text('工单列表', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        ..._items.map(
          (t) => Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              title: Text('${t.id} · ${t.assetCode}'),
              subtitle: Text('${t.location}\n${t.fault}'),
              isThreeLine: true,
              trailing: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(_label(t.status), style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 12)),
                  if (t.status != 'done')
                    TextButton(
                      onPressed: () => _advance(t),
                      child: Text(t.status == 'pending' ? '派工' : '完工', style: const TextStyle(fontSize: 12)),
                    ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
