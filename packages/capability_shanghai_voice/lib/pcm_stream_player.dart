import 'dart:async';
import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';

import 'pcm_wav.dart';

/// 缓冲 TTS PCM 分片后顺序播放，避免 Huawei 上频繁 play() 失败。
class PcmStreamPlayer {
  PcmStreamPlayer({this.sampleRate = 24000}) {
    _player.setReleaseMode(ReleaseMode.stop);
    unawaited(_configureAudioContext());
  }

  final int sampleRate;
  final AudioPlayer _player = AudioPlayer();
  final List<int> _buffer = [];
  Future<void> _queue = Future<void>.value();
  bool _audioContextReady = false;

  Future<void> _configureAudioContext() async {
    if (_audioContextReady) return;
    try {
      await AudioPlayer.global.setAudioContext(
        AudioContext(
          android: const AudioContextAndroid(
            isSpeakerphoneOn: true,
            stayAwake: true,
            contentType: AndroidContentType.speech,
            usageType: AndroidUsageType.voiceCommunication,
            audioFocus: AndroidAudioFocus.gain,
          ),
          iOS: AudioContextIOS(
            category: AVAudioSessionCategory.playback,
            options: {AVAudioSessionOptions.mixWithOthers},
          ),
        ),
      );
      await _player.setPlayerMode(PlayerMode.lowLatency);
      _audioContextReady = true;
    } catch (e) {
      debugPrint('[tts] audio context setup failed: $e');
    }
  }

  Future<void> enqueueBase64(String b64, {bool isEnd = false}) async {
    await _configureAudioContext();
    if (b64.isNotEmpty) {
      _buffer.addAll(base64ToBytes(b64));
    }
    // 约 250ms PCM 即 flush，避免短句卡在 buffer
    final flushThreshold = (sampleRate * 0.25).round() * 2;
    if (isEnd || _buffer.length >= flushThreshold) {
      await _enqueueFlush(force: isEnd);
    }
  }

  Future<void> _enqueueFlush({required bool force}) async {
    if (_buffer.isEmpty) return;
    final minBytes = (sampleRate * 0.08).round() * 2;
    if (!force && _buffer.length < minBytes) return;

    final pcm = Uint8List.fromList(_buffer);
    _buffer.clear();
    _queue = _queue.then((_) => _playOnce(pcm));
    await _queue;
  }

  Future<void> _playOnce(Uint8List pcm) async {
    if (pcm.isEmpty) return;
    try {
      await _configureAudioContext();
      final wav = pcm16ToWavBytes(pcm, sampleRate: sampleRate);
      await _player.stop();
      await _player.play(BytesSource(wav));
      await _player.onPlayerComplete.first.timeout(const Duration(seconds: 120));
    } catch (e, st) {
      debugPrint('[tts] play failed (${pcm.length} bytes): $e\n$st');
    }
  }

  Future<void> finish() async {
    await _enqueueFlush(force: true);
    await _queue;
  }

  Future<void> stop() async {
    _buffer.clear();
    try {
      await _player.stop();
    } catch (e) {
      debugPrint('[tts] stop failed: $e');
    }
  }

  Future<void> dispose() async {
    await stop();
    await _player.dispose();
  }
}
