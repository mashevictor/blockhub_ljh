import 'package:flutter/material.dart';

import '../config/app_branding.dart';
import '../services/auth_service.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key, required this.branding, required this.onLoggedIn});

  final AppBranding branding;
  final VoidCallback onLoggedIn;

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _emailCtrl = TextEditingController(text: 'employee@trackchat.local');
  final _pwdCtrl = TextEditingController(text: 'emp123');
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _pwdCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    setState(() => _busy = true);
    try {
      await authService.login(_emailCtrl.text.trim(), _pwdCtrl.text.trim());
      widget.onLoggedIn();
    } catch (e) {
      setState(() => _error = '登录失败: $e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final primary = Color(widget.branding.primaryColorValue);
    return Scaffold(
      body: Center(
        child: Container(
          width: 320,
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(widget.branding.appName, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: primary)),
              const SizedBox(height: 24),
              TextField(
                controller: _emailCtrl,
                decoration: const InputDecoration(labelText: '邮箱', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _pwdCtrl,
                obscureText: true,
                decoration: const InputDecoration(labelText: '密码', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 16),
              if (_error != null) Text(_error!, style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _busy ? null : _login,
                  child: _busy ? const CircularProgressIndicator() : const Text('登录'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
