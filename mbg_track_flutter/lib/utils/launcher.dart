// lib/utils/launcher.dart
// Buka URL via MethodChannel ke Android native
// Tidak menggunakan url_launcher package (menghindari konflik androidx.browser)
import 'package:flutter/services.dart';

class UrlLauncher {
  static const _channel = MethodChannel('com.mbgtrack.app/launcher');

  static Future<void> openUrl(String url) async {
    if (url.trim().isEmpty) return;
    try {
      await _channel.invokeMethod('openUrl', {'url': url});
    } catch (_) {
      // Gagal diam-diam — tidak crash app
    }
  }

  static Future<void> openMaps(String address) async {
    if (address.trim().isEmpty) return;
    final encoded = Uri.encodeComponent(address);
    await openUrl('https://maps.google.com/?q=$encoded');
  }
}
