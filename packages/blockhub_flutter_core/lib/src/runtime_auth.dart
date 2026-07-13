import 'package:dio/dio.dart';

typedef AuthTokenProvider = String? Function();
typedef AuthedDioFactory = Dio Function();

AuthTokenProvider? runtimeAuthToken;
AuthedDioFactory? runtimeAuthedDio;

String? getRuntimeAuthToken() => runtimeAuthToken?.call();

Dio getRuntimeAuthedDio() {
  final factory = runtimeAuthedDio;
  if (factory == null) {
    throw StateError('runtimeAuthedDio not configured — set in RuntimeApp.initState');
  }
  return factory();
}
