import 'dart:io';

/// 按 CAPABILITY_KEYS 生成 compile-time 模块化配置（阶段 5）。
/// 用法: CAPABILITY_KEYS=chat_qa,approval_flow dart run tool/generate_modular_config.dart
void main() {
  final raw = Platform.environment['CAPABILITY_KEYS'] ?? '';
  final keys = raw
      .split(',')
      .map((k) => k.trim())
      .where((k) => k.isNotEmpty)
      .toList();

  final buf = StringBuffer()
    ..writeln('// GENERATED — do not edit. CAPABILITY_KEYS=$raw')
    ..writeln("const modularCapabilityKeys = <String>[")
    ..writeln(keys.map((k) => "  '$k',").join('\n'))
    ..writeln('];')
    ..writeln('')
    ..writeln('const modularBuildProfile = \'${keys.isEmpty ? 'full' : 'trimmed'}\';');

  final out = File('lib/config/modular_capabilities.g.dart');
  out.parent.createSync(recursive: true);
  out.writeAsStringSync(buf.toString());
  stderr.writeln('Wrote ${out.path} (${keys.length} keys, profile=${keys.isEmpty ? 'full' : 'trimmed'})');
}
