import 'dart:async';
import 'dart:convert';
import 'dart:io' show Platform;
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../config/app_branding.dart';
import '../utils/pcm_resample.dart';
import '../utils/pcm_stream_player.dart';
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
  late PcmStreamPlayer _ttsPlayer = PcmStreamPlayer();

  WebSocketChannel? _channel;
  StreamSubscription<Uint8List>? _micSub;
  StreamSubscription<dynamic>? _wsSub;
  VoiceClientConfig? _config;
  int _deviceCaptureRate = 16000;
  final List<int> _pcmFrameBuffer = [];
  final List<int> _captureProbeBuffer = [];
  bool _captureRateReady = false;
  DateTime? _captureProbeStart;
  int _captureProbeBytes = 0;
  String state = 'disconnected';
  String partialText = '';
  final List<Map<String, String>> messages = [];
  String? error;
  bool _micActive = false;
  bool _greetingAdded = false;

  Completer<void>? _readyCompleter;
  String? _sessionId;
  int _connectAttempt = 0;
  static const _maxConnectAttempts = 3;

  final _stateController = StreamController<String>.broadcast();
  Stream<String> get stateStream => _stateController.stream;

  bool get isConnected =>
      _channel != null && state != 'disconnected' && state != 'error';
  bool get isMicActive => _micActive;
  List<VoiceDemoSample> get demoSamples => _config?.demoSamples ?? const [];

  Future<VoiceClientConfig> loadConfig() async {
    final res = await _dio.get<Map<String, dynamic>>(
      '/voice/config',
      options: Options(receiveTimeout: const Duration(seconds: 30)),
    );
    _config = VoiceClientConfig.fromJson(res.data ?? {});
    _ttsPlayer = PcmStreamPlayer(sampleRate: _config!.playbackSampleRate);
    _seedGreeting(_config!.greeting);
    return _config!;
  }

  void _seedGreeting(String greeting) {
    if (greeting.isEmpty || _greetingAdded) return;
    messages.add({'role': 'assistant', 'text': greeting});
    _greetingAdded = true;
  }

  void _notifyUi() {
    _stateController.add(state);
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

    Object? lastError;
    for (var attempt = 1; attempt <= _maxConnectAttempts; attempt++) {
      _connectAttempt = attempt;
      try {
        _channel = await connectWebSocket(uri);
        _wsSub = _channel!.stream.listen(
          _onMessage,
          onError: (Object e) {
            debugPrint('[voice] ws error: $e');
            error = e.toString();
            _setState('error');
            _scheduleReconnect();
          },
          onDone: () {
            debugPrint('[voice] ws closed');
            _channel = null;
            _setState('disconnected');
            _scheduleReconnect();
          },
        );
        await _readyCompleter!.future.timeout(const Duration(seconds: 20));
        _connectAttempt = 0;
        return;
      } catch (e) {
        lastError = e;
        debugPrint('[voice] connect attempt $attempt failed: $e');
        await _tearDownSocket();
        if (attempt < _maxConnectAttempts) {
          await Future<void>.delayed(Duration(milliseconds: 400 * attempt));
        }
      }
    }
    throw Exception(lastError ?? '连接语音服务失败，请检查网络');
  }

  void _scheduleReconnect() {
    if (_sessionId == null || _connectAttempt >= _maxConnectAttempts) return;
    Future<void>.delayed(const Duration(seconds: 2), () async {
      if (_channel != null || _sessionId == null) return;
      try {
        await connect(sessionId: _sessionId!);
      } catch (e) {
        debugPrint('[voice] auto reconnect failed: $e');
      }
    });
  }

  Future<void> simulateUtterance(String text) async {
    if (_channel == null) {
      throw Exception('未连接语音服务');
    }
    error = null;
    await _ttsPlayer.stop();
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
    await _ttsPlayer.stop();
    if (state == 'speaking') {
      _channel!.sink.add(jsonEncode({'type': 'barge_in'}));
    }

    partialText = '';
    final config = _config!;
    _resetCapturePipeline(config);
    final stream = await _recorder.startStream(
      RecordConfig(
        encoder: AudioEncoder.pcm16bits,
        sampleRate: config.captureSampleRate,
        numChannels: 1,
      ),
    );
    _micActive = true;
    _setState('listening');
    _micSub = stream.listen((chunk) => _onMicChunk(chunk, config));
  }

  void _resetCapturePipeline(VoiceClientConfig config) {
    _pcmFrameBuffer.clear();
    _captureProbeBuffer.clear();
    _captureRateReady = false;
    _captureProbeStart = null;
    _captureProbeBytes = 0;
    _deviceCaptureRate = config.captureSampleRate;
  }

  int _frameBytesFor(VoiceClientConfig config) =>
      (config.captureSampleRate * config.frameMs ~/ 1000) * 2;

  int _snapSampleRate(int measured, {required int target}) {
    const common = [8000, 11025, 12000, 16000, 22050, 24000, 44100, 48000];
    if (measured <= 0) return target;
    if ((measured - target).abs() <= (target * 0.12).round()) return target;
    var best = common.first;
    var bestDiff = (best - measured).abs();
    for (final rate in common.skip(1)) {
      final diff = (rate - measured).abs();
      if (diff < bestDiff) {
        best = rate;
        bestDiff = diff;
      }
    }
    return best;
  }

  void _detectCaptureRate(VoiceClientConfig config) {
    final probeStart = _captureProbeStart;
    if (probeStart == null || _captureRateReady) return;
    final elapsedMs = DateTime.now().difference(probeStart).inMilliseconds;
    if (elapsedMs < 250) return;

    final measured = ((_captureProbeBytes / 2) / (elapsedMs / 1000)).round();
    _deviceCaptureRate = _snapSampleRate(
      measured,
      target: config.captureSampleRate,
    );
    _captureRateReady = true;
    debugPrint(
      '[voice] capture probe measured=${measured}Hz using=${_deviceCaptureRate}Hz '
      '(target=${config.captureSampleRate} platform=${Platform.operatingSystem})',
    );
  }

  Uint8List _normalizeCaptureChunk(Uint8List chunk, VoiceClientConfig config) {
    if (_deviceCaptureRate == config.captureSampleRate) return chunk;
    return resamplePcm16Bytes(
      chunk,
      fromRate: _deviceCaptureRate,
      toRate: config.captureSampleRate,
    );
  }

  void _enqueueCaptureFrames(Uint8List pcm, VoiceClientConfig config) {
    _pcmFrameBuffer.addAll(pcm);
    final frameBytes = _frameBytesFor(config);
    while (_pcmFrameBuffer.length >= frameBytes) {
      final frame = Uint8List.fromList(_pcmFrameBuffer.sublist(0, frameBytes));
      _pcmFrameBuffer.removeRange(0, frameBytes);
      _sendAudioFrame(frame);
    }
  }

  void _flushCaptureFrames(VoiceClientConfig config) {
    if (_pcmFrameBuffer.isEmpty) return;
    _sendAudioFrame(Uint8List.fromList(_pcmFrameBuffer));
    _pcmFrameBuffer.clear();
  }

  void _sendAudioFrame(Uint8List frame) {
    if (frame.isEmpty || _channel == null) return;
    _channel!.sink.add(jsonEncode({
      'type': 'audio',
      'data': base64Encode(frame),
    }));
  }

  void _onMicChunk(Uint8List chunk, VoiceClientConfig config) {
    if (!_captureRateReady) {
      _captureProbeStart ??= DateTime.now();
      _captureProbeBytes += chunk.length;
      _captureProbeBuffer.addAll(chunk);
      _detectCaptureRate(config);
      if (!_captureRateReady) return;

      final probePcm = _normalizeCaptureChunk(
        Uint8List.fromList(_captureProbeBuffer),
        config,
      );
      _captureProbeBuffer.clear();
      _enqueueCaptureFrames(probePcm, config);
      return;
    }

    final pcm = _normalizeCaptureChunk(chunk, config);
    _enqueueCaptureFrames(pcm, config);
  }

  Future<void> holdTalkEnd() async {
    if (!_micActive) return;
    _micActive = false;
    await _micSub?.cancel();
    _micSub = null;
    if (await _recorder.isRecording()) {
      await _recorder.stop();
    }
    final config = _config;
    if (config != null) {
      if (!_captureRateReady && _captureProbeBuffer.isNotEmpty) {
        _deviceCaptureRate = config.captureSampleRate;
        _captureRateReady = true;
        final probePcm = _normalizeCaptureChunk(
          Uint8List.fromList(_captureProbeBuffer),
          config,
        );
        _captureProbeBuffer.clear();
        _enqueueCaptureFrames(probePcm, config);
      }
      _flushCaptureFrames(config);
    }
    _channel?.sink.add(jsonEncode({'type': 'utterance_end'}));
    // 保留 partialText 直到 asr_final，避免松手后文字空白
    _setState('thinking');
    _notifyUi();
  }

  Future<void> bargeIn() async {
    await _ttsPlayer.stop();
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

  void _appendAssistantMessage(String text) {
    if (text.isEmpty) return;
    final last = messages.isNotEmpty ? messages.last : null;
    if (last != null && last['role'] == 'assistant' && last['text'] == text) {
      return;
    }
    if (!_greetingAdded) {
      _seedGreeting(text);
      return;
    }
    _appendAssistantDelta(text);
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
      _appendAssistantMessage(msg['text'] as String? ?? '');
      _notifyUi();
    } else if (type == 'asr_partial') {
      partialText = msg['text'] as String? ?? '';
      if (_micActive) _setState('listening');
      _notifyUi();
    } else if (type == 'asr_speech_start') {
      if (_micActive) _setState('listening');
      _notifyUi();
    } else if (type == 'asr_final') {
      final text = msg['text'] as String? ?? '';
      partialText = '';
      if (text.isNotEmpty) {
        messages.add({'role': 'user', 'text': text});
      }
      _setState('thinking');
      _notifyUi();
    } else if (type == 'llm_delta') {
      final text = msg['text'] as String? ?? '';
      if (text.isNotEmpty) {
        _appendAssistantDelta(text);
      }
      if (!_micActive) _setState('thinking');
      _notifyUi();
    } else if (type == 'tts_audio') {
      final data = msg['data'] as String? ?? '';
      final isEnd = msg['is_end'] as bool? ?? false;
      if (data.isNotEmpty || isEnd) {
        if (!_micActive && state != 'speaking') _setState('speaking');
        unawaited(_ttsPlayer.enqueueBase64(data, isEnd: isEnd));
      }
      if (isEnd) {
        unawaited(_ttsPlayer.finish());
      }
      _notifyUi();
    } else if (type == 'error') {
      error = msg['message'] as String? ?? '语音会话错误';
      _setState('error');
      _notifyUi();
    }
  }

  void _setState(String next) {
    state = next;
    _stateController.add(next);
  }

  Future<void> dispose() async {
    await disconnect();
    await _stateController.close();
    await _recorder.dispose();
    await _ttsPlayer.dispose();
  }
}
