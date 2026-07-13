import 'package:blockhub_flutter_core/blockhub_flutter_core.dart';
import 'package:flutter/material.dart';
import 'package:local_auth/local_auth.dart';

class BiometricToolPage extends StatefulWidget {
  const BiometricToolPage({super.key, required this.branding});

  final AppBranding branding;

  @override
  State<BiometricToolPage> createState() => _BiometricToolPageState();
}

class _BiometricToolPageState extends State<BiometricToolPage> {
  final _auth = LocalAuthentication();
  String _status = '点击下方按钮验证指纹/面容';

  Future<void> _authenticate() async {
    try {
      final can = await _auth.canCheckBiometrics;
      if (!can) {
        setState(() => _status = '设备不支持生物识别');
        return;
      }
      final ok = await _auth.authenticate(
        localizedReason: '验证身份以访问应用',
        options: const AuthenticationOptions(biometricOnly: true, stickyAuth: true),
      );
      if (!mounted) return;
      setState(() => _status = ok ? '✓ 验证通过' : '✗ 验证失败或取消');
    } catch (e) {
      if (!mounted) return;
      setState(() => _status = '错误: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = Color(widget.branding.primaryColorValue);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('生物识别', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 24),
        Icon(Icons.fingerprint, size: 72, color: color),
        const SizedBox(height: 16),
        Text(_status, textAlign: TextAlign.center),
        const SizedBox(height: 24),
        FilledButton(
          onPressed: _authenticate,
          style: FilledButton.styleFrom(backgroundColor: color),
          child: const Text('开始验证'),
        ),
      ],
    );
  }
}
