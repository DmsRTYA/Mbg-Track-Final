// lib/services/notification_service.dart
// Local Push Notification menggunakan flutter_local_notifications
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/material.dart';

class NotificationService {
  static final _plugin = FlutterLocalNotificationsPlugin();
  static bool _initialized = false;

  static Future<void> init() async {
    if (_initialized) return;

    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const ios = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    const settings = InitializationSettings(android: android, iOS: ios);

    await _plugin.initialize(
      settings,
      onDidReceiveNotificationResponse: (details) {
        debugPrint('[Notif] tapped: ${details.payload}');
      },
    );

    // Minta izin Android 13+
    await _plugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();

    _initialized = true;
  }

  static Future<void> show({
    int id = 0,
    required String title,
    required String body,
    String? payload,
  }) async {
    if (!_initialized) await init();

    const androidDetails = AndroidNotificationDetails(
      'mbg_track_channel',
      'MBG-Track Notifikasi',
      channelDescription: 'Notifikasi pengiriman dan pesanan MBG',
      importance: Importance.high,
      priority: Priority.high,
      ticker: 'MBG-Track',
      icon: '@drawable/logo_bgn',
      enableVibration: true,
      playSound: true,
      styleInformation: BigTextStyleInformation(''),
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(android: androidDetails, iOS: iosDetails);

    await _plugin.show(id, title, body, details, payload: payload);
  }

  // Notifikasi spesifik per event
  static Future<void> orderSubmitted(String schoolName, int portions) => show(
        id: 1,
        title: 'Permintaan Baru Masuk',
        body: '$schoolName meminta $portions porsi.',
        payload: 'order_submitted',
      );

  static Future<void> orderStatusChanged(String status, String schoolName) {
    final labels = {
      'cooking': 'Sedang Dimasak',
      'on_delivery': 'Dalam Perjalanan',
      'delivered': 'Telah Diterima',
    };
    return show(
      id: 2,
      title: 'Status Pesanan: ${labels[status] ?? status}',
      body: 'Pesanan $schoolName sekarang: ${labels[status] ?? status}',
      payload: 'order_$status',
    );
  }

  static Future<void> deliveryProofReceived(String schoolName) => show(
        id: 3,
        title: 'Bukti Pengiriman Diterima',
        body: '$schoolName — Bukti foto telah dikirim oleh kurir.',
        payload: 'delivery_proof',
      );
}
