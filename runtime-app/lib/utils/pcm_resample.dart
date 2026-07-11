import 'dart:math' as math;
import 'dart:typed_data';

/// 线性重采样 16-bit PCM（Android 常实际录 48k，ASR 需 16k）。
Uint8List resamplePcm16Bytes(
  Uint8List pcm,
  {
  required int fromRate,
  required int toRate,
}) {
  if (fromRate == toRate || pcm.isEmpty) return pcm;
  final sampleCount = pcm.length ~/ 2;
  if (sampleCount == 0) return pcm;

  final src = Int16List.view(pcm.buffer, pcm.offsetInBytes, sampleCount);
  final ratio = fromRate / toRate;
  final outCount = math.max(1, (sampleCount / ratio).floor());
  final out = Int16List(outCount);

  for (var i = 0; i < outCount; i++) {
    final idx = i * ratio;
    final i0 = idx.floor().clamp(0, sampleCount - 1);
    final i1 = math.min(i0 + 1, sampleCount - 1);
    final frac = idx - i0;
    out[i] = (src[i0] + (src[i1] - src[i0]) * frac).round();
  }

  return Uint8List.view(out.buffer);
}

/// Android 录音采样率：优先使用 ASR 要求的 16k，避免误按 48k 重采样导致识别异常。
int androidCaptureSampleRateHint() => 16000;
