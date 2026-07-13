import 'package:permission_handler/permission_handler.dart';

Future<bool> ensurePermission(Permission permission) async {
  var status = await permission.status;
  if (status.isGranted) return true;
  status = await permission.request();
  return status.isGranted;
}

Future<bool> ensureCamera() => ensurePermission(Permission.camera);

Future<bool> ensureLocation() async {
  if (await ensurePermission(Permission.locationWhenInUse)) return true;
  return ensurePermission(Permission.location);
}

Future<bool> ensureNotifications() async {
  if (await ensurePermission(Permission.notification)) return true;
  return true; // pre-Android 13
}
