import 'dart:async';
import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart';

import 'pcm_wav.dart';

/// 缓冲 TTS PCM 分片后顺序播放，避免 Huawei 上频繁 play() 失败。
class PcmStreamPlayer {
  PcmStreamPlayer({this.sampleRate = 24000}) {
    _player.setReleaseMode(ReleaseMode.stop);
  }

  final int sampleRate;
  final AudioPlayer _player = AudioPlayer();
  final List<int> _buffer = [];
  Future<void> _queue = Future<void>.value();

  Future<void> enqueueBase64(String b64, {bool isEnd = false}) async {
    if (b64.isNotEmpty) {
      _buffer.addAll(base64ToBytes(b64));
    }
    if (isEnd || _buffer.length >= sampleRate * 2) {
      await _enqueueFlush(force: isEnd);
    }
  }

  Future<void> _enqueueFlush({required bool force}) async {
    if (_buffer.isEmpty) return;
    if (!force && _buffer.length < sampleRate ~/ 2) return;

    final pcm = Uint8List.fromList(_buffer);
    _buffer.clear();
    _queue = _queue.then((_) => _playOnce(pcm));
    await _queue;
  }

  Future<void> _playOnce(Uint8List pcm) async {
    if (pcm.isEmpty) return;
    try {
      final wav = pcm16ToWavBytes(pcm, sampleRate: sampleRate);
      await _player.stop();
      await _player.play(BytesSource(wav));
      await _player.onPlayerComplete.first.timeout(const Duration(seconds: 120));
    } catch (_) {
      /* 单段失败不阻断 */
    }
  }

  Future<void> finish() async {
    await _enqueueFlush(force: true);
    await _queue;
  }

  Future<void> stop() async {
    _buffer.clear();
    await _player.stop();
  }

  Future<void> dispose() async {
    await stop();
    await _player.dispose();
  }
}
