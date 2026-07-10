import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:audioplayers/audioplayers.dart';
import 'package:dio/dio.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../config/app_branding.dart';
import '../utils/pcm_wav.dart';
import 'dio_factory.dart';

class VoiceClientConfig {
  VoiceClientConfig({
    required this.agentId,
    required this.wsUrl,
    required this.captureSampleRate,
    required this.playbackSampleRate,
    required this.frameMs,
    required this.configured,
  });

  final String agentId;
  final String wsUrl;
  final int captureSampleRate;
  final int playbackSampleRate;
  final int frameMs;
  final bool configured;

  factory VoiceClientConfig.fromJson(Map<String, dynamic> json) {
    return VoiceClientConfig(
      agentId: json['agent_id'] as String? ?? 'shanghai_voice',
      wsUrl: json['ws_url'] as String? ?? '',
      captureSampleRate: json['capture_sample_rate'] as int? ?? 16000,
      playbackSampleRate: json['playback_sample_rate'] as int? ?? 24000,
      frameMs: json['frame_ms'] as int? ?? 200,
      configured: json['configured'] as bool? ?? false,
    );
  }
}

class ShanghaiVoiceService {
  ShanghaiVoiceService({required AppBranding branding})
      : _branding = branding,
        _dio = createDio(baseUrl: branding.apiBaseUrl);

  final AppBranding _branding;
  final Dio _dio;
  final AudioRecorder _recorder = AudioRecorder();
  final AudioPlayer _player = AudioPlayer();

  WebSocketChannel? _channel;
  StreamSubscription<Uint8List>? _micSub;
  VoiceClientConfig? _config;
  String state = 'disconnected';
  String partialText = '';
  final List<Map<String, String>> messages = [];
  String? error;

  final _stateController = StreamController<String>.broadcast();
  Stream<String> get stateStream => _stateController.stream;
  Future<void> _playQueue = Future<void>.value();

  Future<VoiceClientConfig> loadConfig() async {
    final res = await _dio.get<Map<String, dynamic>>('/voice/config');
    _config = VoiceClientConfig.fromJson(res.data ?? {});
    return _config!;
  }

  Future<void> connect({required String sessionId}) async {
    final config = _config ?? await loadConfig();
    if (!config.configured) {
      throw Exception('电信语音服务未配置');
    }
    final uri = normalizeWsUri(config.wsUrl, _branding.apiBaseUrl)
        .replace(queryParameters: {'session_id': sessionId});
    _setState('connecting');
    _channel = await connectWebSocket(uri);
    _channel!.stream.listen(_onMessage, onError: (Object e) {
      error = e.toString();
      _setState('error');
    }, onDone: () {
      _setState('disconnected');
    });
  }

  Future<void> startMic() async {
    final status = await Permission.microphone.request();
    if (!status.isGranted) {
      throw Exception('需要麦克风权限');
    }
    final config = _config!;
    final stream = await _recorder.startStream(
      RecordConfig(
        encoder: AudioEncoder.pcm16bits,
        sampleRate: config.captureSampleRate,
        numChannels: 1,
      ),
    );
    _setState('listening');
    _micSub = stream.listen((chunk) {
      final b64 = base64Encode(chunk);
      _channel?.sink.add(jsonEncode({'type': 'audio', 'data': b64}));
    });
  }

  Future<void> stopMic() async {
    await _micSub?.cancel();
    _micSub = null;
    if (await _recorder.isRecording()) {
      await _recorder.stop();
    }
    _channel?.sink.add(jsonEncode({'type': 'utterance_end'}));
    _setState('thinking');
  }

  Future<void> bargeIn() async {
    await _player.stop();
    _channel?.sink.add(jsonEncode({'type': 'barge_in'}));
    _setState('listening');
  }

  Future<void> disconnect() async {
    await _micSub?.cancel();
    _micSub = null;
    if (await _recorder.isRecording()) {
      await _recorder.stop();
    }
    await _channel?.sink.close();
    _channel = null;
    _setState('disconnected');
  }

  void _onMessage(dynamic event) {
    final msg = jsonDecode(event as String) as Map<String, dynamic>;
    final type = msg['type'] as String? ?? '';

    if (type == 'state') {
      _setState(msg['state'] as String? ?? 'idle');
    } else if (type == 'ready') {
      _setState('idle');
    } else if (type == 'asr_partial') {
      partialText = msg['text'] as String? ?? '';
      _stateController.add(state);
    } else if (type == 'asr_final') {
      final text = msg['text'] as String? ?? '';
      partialText = '';
      if (text.isNotEmpty) {
        messages.add({'role': 'user', 'text': text});
      }
      _stateController.add(state);
    } else if (type == 'llm_delta') {
      final text = msg['text'] as String? ?? '';
      if (text.isNotEmpty) {
        messages.add({'role': 'assistant', 'text': text});
      }
      _stateController.add(state);
    } else if (type == 'tts_audio') {
      final data = msg['data'] as String? ?? '';
      final isEnd = msg['is_end'] as bool? ?? false;
      if (data.isNotEmpty) {
        _playPcmBase64(data);
      }
      if (isEnd) {
        _setState('idle');
      }
    } else if (type == 'error') {
      error = msg['message'] as String? ?? '语音会话错误';
      _setState('error');
    }
  }

  Future<void> _playPcmBase64(String b64) async {
    final playbackRate = _config?.playbackSampleRate ?? 24000;
    _playQueue = _playQueue.then((_) async {
      final pcm = base64ToBytes(b64);
      final wav = pcm16ToWavBytes(pcm, sampleRate: playbackRate);
      await _player.play(BytesSource(wav));
      _setState('speaking');
    });
    return _playQueue;
  }

  void _setState(String next) {
    state = next;
    _stateController.add(next);
  }

  Future<void> dispose() async {
    await disconnect();
    await _stateController.close();
    await _recorder.dispose();
    await _player.dispose();
  }
}
