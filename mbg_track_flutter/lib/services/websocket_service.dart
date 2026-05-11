// lib/services/websocket_service.dart
// WebSocket client real-time untuk Flutter
import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

// Event types — harus sama dengan server
class WsEvents {
  static const orderNew         = 'order_new';
  static const orderUpdated     = 'order_updated';
  static const proofSubmitted   = 'proof_submitted';
  static const locationUpdate   = 'location_update';
  static const locationStop     = 'location_stop';
  static const inventoryUpdated = 'inventory_updated';
  static const statsUpdated     = 'stats_updated';
  static const connected        = 'connected';
  static const pong             = 'pong';
}

typedef WsMessageCallback = void Function(Map<String, dynamic> message);

class WebSocketService extends ChangeNotifier {
  static const _reconnectDelay = Duration(seconds: 3);
  static const _pingInterval   = Duration(seconds: 20);

  WebSocketChannel? _channel;
  StreamSubscription? _sub;
  Timer? _pingTimer;
  Timer? _reconnectTimer;

  bool _connected    = false;
  bool _reconnecting = false;
  bool _disposed     = false;

  String? _userId;
  String? _role;
  String? _baseUrl;

  bool get isConnected    => _connected;
  bool get isReconnecting => _reconnecting;

  final List<WsMessageCallback> _listeners = [];

  void addMessageListener(WsMessageCallback cb) {
    if (!_listeners.contains(cb)) _listeners.add(cb);
  }

  void removeMessageListener(WsMessageCallback cb) {
    _listeners.remove(cb);
  }

  void _notify(Map<String, dynamic> msg) {
    for (final cb in List.from(_listeners)) {
      try { cb(msg); } catch (_) {}
    }
  }

  // Ganti http:// → ws://, https:// → wss://
  String _toWsUrl(String httpUrl) {
    return httpUrl
      .replaceFirst('https://', 'wss://')
      .replaceFirst('http://',  'ws://');
  }

  Future<void> connect(String userId, String role, String baseUrl) async {
    _userId  = userId;
    _role    = role;
    _baseUrl = baseUrl;
    _disposed = false;
    await _doConnect();
  }

  Future<void> _doConnect() async {
    if (_disposed || _userId == null) return;

    _channel?.sink.close();
    _sub?.cancel();
    _pingTimer?.cancel();

    final wsBase = _toWsUrl(_baseUrl ?? 'http://10.0.2.2:3000');
    final url    = '$wsBase/ws?userId=$_userId&role=$_role';

    try {
      _channel = WebSocketChannel.connect(Uri.parse(url));
      _sub = _channel!.stream.listen(
        _onData,
        onError: (_) => _onDisconnect(),
        onDone:  ()  => _onDisconnect(),
        cancelOnError: false,
      );

      // Ping setiap 20 detik untuk keep-alive
      _pingTimer = Timer.periodic(_pingInterval, (_) => send({'type': 'ping'}));

      _connected    = true;
      _reconnecting = false;
      notifyListeners();
      debugPrint('[WS] Connected as $_role / ${_userId?.substring(0, 8)}');
    } catch (e) {
      debugPrint('[WS] Connect error: $e');
      _onDisconnect();
    }
  }

  void _onData(dynamic raw) {
    try {
      final msg = jsonDecode(raw.toString()) as Map<String, dynamic>;
      if (msg['type'] == WsEvents.pong) return;
      _notify(msg);
    } catch (_) {}
  }

  void _onDisconnect() {
    if (_disposed) return;
    _connected = false;
    notifyListeners();
    debugPrint('[WS] Disconnected, reconnecting in ${_reconnectDelay.inSeconds}s...');
    _reconnecting = true;
    notifyListeners();
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(_reconnectDelay, _doConnect);
  }

  void send(Map<String, dynamic> payload) {
    if (_channel == null) return;
    try {
      _channel!.sink.add(jsonEncode(payload));
    } catch (_) {}
  }

  // Broadcast lokasi GPS kurir
  void sendLocation({
    required double lat,
    required double lng,
    required double accuracy,
    required String orderId,
    String courierName = '',
  }) {
    send({
      'type': WsEvents.locationUpdate,
      'courierName': courierName,
      'payload': {
        'lat': lat, 'lng': lng,
        'accuracy': accuracy, 'orderId': orderId,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      },
    });
  }

  void sendLocationStop() {
    send({'type': WsEvents.locationStop});
  }

  @override
  void dispose() {
    _disposed = true;
    _pingTimer?.cancel();
    _reconnectTimer?.cancel();
    _sub?.cancel();
    _channel?.sink.close();
    super.dispose();
  }
}
