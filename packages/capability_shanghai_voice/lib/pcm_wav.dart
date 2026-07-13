import 'dart:convert';
import 'dart:typed_data';

Uint8List pcm16ToWavBytes(Uint8List pcm, {int sampleRate = 24000, int channels = 1}) {
  final byteRate = sampleRate * channels * 2;
  final blockAlign = channels * 2;
  final dataSize = pcm.length;
  final buffer = BytesBuilder();
  buffer.add('RIFF'.codeUnits);
  buffer.add(_le32(36 + dataSize));
  buffer.add('WAVE'.codeUnits);
  buffer.add('fmt '.codeUnits);
  buffer.add(_le32(16));
  buffer.add(_le16(1));
  buffer.add(_le16(channels));
  buffer.add(_le32(sampleRate));
  buffer.add(_le32(byteRate));
  buffer.add(_le16(blockAlign));
  buffer.add(_le16(16));
  buffer.add('data'.codeUnits);
  buffer.add(_le32(dataSize));
  buffer.add(pcm);
  return buffer.toBytes();
}

Uint8List base64ToBytes(String b64) => base64Decode(b64);

List<int> _le16(int value) => [value & 0xff, (value >> 8) & 0xff];

List<int> _le32(int value) => [
      value & 0xff,
      (value >> 8) & 0xff,
      (value >> 16) & 0xff,
      (value >> 24) & 0xff,
    ];
