import 'package:flutter_test/flutter_test.dart';
import 'package:trackchat_runtime_app/app.dart';
import 'package:trackchat_runtime_app/config/app_branding.dart';

void main() {
  testWidgets('RuntimeApp loads home shell', (WidgetTester tester) async {
    await tester.pumpWidget(const RuntimeApp(branding: AppBranding.defaults));
    await tester.pump();

    expect(find.text('TrackChat'), findsOneWidget);
    expect(find.text('上海话语音 Agent'), findsOneWidget);
  });
}
