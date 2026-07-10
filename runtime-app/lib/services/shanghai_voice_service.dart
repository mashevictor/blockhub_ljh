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

class VoiceDemoSample {
  VoiceDemoSample({required this.label, required this.utterance});

  final String label;
  final String utterance;

  factory VoiceDemoSample.fromJson(Map<String, dynamic> json) {
    return VoiceDemoSample(
      label: json['label'] as String? ?? '',
      utterance: json['utterance'] as String? ?? '',
    );
  }
}

class VoiceClientConfig {
  VoiceClientConfig({
    required this.agentId,
    required this.wsUrl,
    required this.captureSampleRate,
    required this.playbackSampleRate,
    required this.frameMs,
    required this.configured,
    this.dialect = 'shanghai',
    this.greeting = '',
    this.demoSamples = const [],
    this.llmProvider = 'deepseek',
  });

  final String agentId;
  final String wsUrl;
  final int captureSampleRate;
  final int playbackSampleRate;
  final int frameMs;
  final bool configured;
  final String dialect;
  final String greeting;
  final List<VoiceDemoSample> demoSamples;
  final String llmProvider;

  factory VoiceClientConfig.fromJson(Map<String, dynamic> json) {
    final rawSamples = json['demo_samples'] as List<dynamic>? ?? [];
    return VoiceClientConfig(
      agentId: json['agent_id'] as String? ?? 'shanghai_voice',
      wsUrl: json['ws_url'] as String? ?? '',
      captureSampleRate: json['capture_sample_rate'] as int? ?? 16000,
      playbackSampleRate: json['playback_sample_rate'] as int? ?? 24000,
      frameMs: json['frame_ms'] as int? ?? 200,
      configured: json['configured'] as bool? ?? false,
      dialect: json['dialect'] as String? ?? 'shanghai',
      greeting: json['greeting'] as String? ?? '',
      demoSamples: rawSamples
          .whereType<Map<String, dynamic>>()
          .map(VoiceDemoSample.fromJson)
          .where((s) => s.utterance.isNotEmpty)
          .toList(),
      llmProvider: json['llm_provider'] as String? ?? 'deepseek',
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
  StreamSubscription<dynamic>? _wsSub;
  VoiceClientConfig? _config;
  String state = 'disconnected';
  String partialText = '';
  final List<Map<String, String>> messages = [];
  String? error;
  bool _micActive = false;
  bool _greetingAdded = false;

  Completer<void>? _readyCompleter;
  String? _sessionId;

  final _stateController = StreamController<String>.broadcast();
  Stream<String> get stateStream => _stateController.stream;
  Future<void> _playQueue = Future<void>.value();

  bool get isConnected =>
      _channel != null && state != 'disconnected' && state != 'error';
  bool get isMicActive => _micActive;
  List<VoiceDemoSample> get demoSamples => _config?.demoSamples ?? const [];

  Future<VoiceClientConfig> loadConfig() async {
    final res = await _dio.get<Map<String, dynamic>>('/voice/config');
    _config = VoiceClientConfig.fromJson(res.data ?? {});
    _seedGreeting(_config!.greeting);
    return _config!;
  }

  void _seedGreeting(String greeting) {
    if (greeting.isEmpty || _greetingAdded) return;
    messages.add({'role': 'assistant', 'text': greeting});
    _greetingAdded = true;
  }

  Future<void> ensureConnected({required String sessionId}) async {
    _sessionId = sessionId;
    if (isConnected) return;
    await connect(sessionId: sessionId);
  }

  Future<void> connect({required String sessionId}) async {
    _sessionId = sessionId;
    final config = _config ?? await loadConfig();
    if (!config.configured) {
      throw Exception('电信语音服务未配置');
    }

    await _tearDownSocket();

    final uri = normalizeWsUri(config.wsUrl, _branding.apiBaseUrl)
        .replace(queryParameters: {'session_id': sessionId});
    _readyCompleter = Completer<void>();
    error = null;
    _setState('connecting');

    _channel = await connectWebSocket(uri);
    _wsSub = _channel!.stream.listen(
      _onMessage,
      onError: (Object e) {
        error = e.toString();
        _setState('error');
      },
      onDone: () {
        _channel = null;
        _setState('disconnected');
      },
    );

    try {
      await _readyCompleter!.future.timeout(const Duration(seconds: 15));
    } catch (_) {
      await _tearDownSocket();
      throw Exception('连接语音服务超时，请检查网络');
    }
  }

  Future<void> simulateUtterance(String text) async {
    if (_channel == null) {
      throw Exception('未连接语音服务');
    }
    error = null;
    _channel!.sink.add(jsonEncode({'type': 'simulate', 'text': text}));
    _setState('thinking');
  }

  Future<void> holdTalkStart() async {
    if (_micActive) return;
    final status = await Permission.microphone.request();
    if (!status.isGranted) {
      throw Exception('需要麦克风权限');
    }
    if (_sessionId != null) {
      await ensureConnected(sessionId: _sessionId!);
    }
    if (_channel == null) {
      throw Exception('未连接语音服务');
    }

    error = null;
    partialText = '';
    final config = _config!;
    final stream = await _recorder.startStream(
      RecordConfig(
        encoder: AudioEncoder.pcm16bits,
        sampleRate: config.captureSampleRate,
        numChannels: 1,
      ),
    );
    _micActive = true;
    _setState('listening');
    _micSub = stream.listen((chunk) {
      final b64 = base64Encode(chunk);
      _channel?.sink.add(jsonEncode({'type': 'audio', 'data': b64}));
    });
  }

  Future<void> holdTalkEnd() async {
    if (!_micActive) return;
    _micActive = false;
    await _micSub?.cancel();
    _micSub = null;
    if (await _recorder.isRecording()) {
      await _recorder.stop();
    }
    _channel?.sink.add(jsonEncode({'type': 'utterance_end'}));
    partialText = '';
    _setState('thinking');
    _stateController.add(state);
  }

  Future<void> bargeIn() async {
    await _player.stop();
    if (_micActive) {
      await holdTalkEnd();
    }
    _channel?.sink.add(jsonEncode({'type': 'barge_in'}));
    if (!isConnected) return;
    _setState('idle');
  }

  Future<void> disconnect() async {
    if (_micActive) {
      await holdTalkEnd();
    }
    await _tearDownSocket();
    _setState('disconnected');
  }

  Future<void> _tearDownSocket() async {
    await _micSub?.cancel();
    _micSub = null;
    await _wsSub?.cancel();
    _wsSub = null;
    if (await _recorder.isRecording()) {
      await _recorder.stop();
    }
    _micActive = false;
    try {
      await _channel?.sink.close();
    } catch (_) {}
    _channel = null;
    _readyCompleter = null;
  }

  void _appendAssistantDelta(String text) {
    if (messages.isNotEmpty && messages.last['role'] == 'assistant') {
      messages.last['text'] = '${messages.last['text'] ?? ''}$text';
    } else {
      messages.add({'role': 'assistant', 'text': text});
    }
  }

  void _onMessage(dynamic event) {
    final msg = jsonDecode(event as String) as Map<String, dynamic>;
    final type = msg['type'] as String? ?? '';

    if (type == 'state') {
      if (!_micActive || (msg['state'] as String? ?? '') != 'listening') {
        _setState(msg['state'] as String? ?? 'idle');
      }
    } else if (type == 'ready') {
      _setState('idle');
      final greeting = msg['greeting'] as String? ?? '';
      _seedGreeting(greeting);
      if (_readyCompleter != null && !_readyCompleter!.isCompleted) {
        _readyCompleter!.complete();
      }
    } else if (type == 'assistant_message') {
      final text = msg['text'] as String? ?? '';
      if (text.isNotEmpty) {
        _seedGreeting(text);
      }
      _stateController.add(state);
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
        _appendAssistantDelta(text);
      }
      _stateController.add(state);
    } else if (type == 'tts_audio') {
      final data = msg['data'] as String? ?? '';
      final isEnd = msg['is_end'] as bool? ?? false;
      if (data.isNotEmpty) {
        _playPcmBase64(data);
      }
      if (isEnd && !_micActive) {
        _setState('idle');
      }
    } else if (type == 'error') {
      error = msg['message'] as String? ?? '语音会话错误';
      _setState('error');
      _stateController.add(state);
    }
  }

  Future<void> _playPcmBase64(String b64) async {
    final playbackRate = _config?.playbackSampleRate ?? 24000;
    _playQueue = _playQueue.then((_) async {
      final pcm = base64ToBytes(b64);
      final wav = pcm16ToWavBytes(pcm, sampleRate: playbackRate);
      await _player.play(BytesSource(wav));
      if (!_micActive) {
        _setState('speaking');
      }
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
