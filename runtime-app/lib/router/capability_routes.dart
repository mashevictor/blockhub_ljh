/// M11 前置：capability 路由路径约定（后续接 go_router deep link）。
class CapabilityRoutes {
  CapabilityRoutes._();

  static String pathFor(String capabilityKey) => '/cap/$capabilityKey';

  static String? keyFromPath(String path) {
    const prefix = '/cap/';
    if (!path.startsWith(prefix)) return null;
    final key = path.substring(prefix.length);
    return key.isEmpty ? null : key;
  }
}
