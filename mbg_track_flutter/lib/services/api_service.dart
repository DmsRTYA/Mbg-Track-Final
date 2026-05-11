import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../models/models.dart';

class ApiService {
  // ── Ganti sesuai environment ──────────────────────────────────────────────
  // Emulator Android  : http://10.0.2.2:3000
  // HP fisik (WiFi)   : http://192.168.x.x:3000
  // Production        : https://domain-anda.com
  static const String baseUrl = 'http://10.165.155.120:3000';
  // ─────────────────────────────────────────────────────────────────────────

  static const Duration _timeout = Duration(seconds: 20);
  static Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // ── Core ──────────────────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> _get(String path) async {
    try {
      final res = await http
          .get(Uri.parse('$baseUrl$path'), headers: _headers)
          .timeout(_timeout);
      return _decode(res);
    } on SocketException {
      throw Exception('Tidak dapat terhubung ke server.');
    } catch (e) {
      throw Exception(e.toString().replaceAll('Exception: ', ''));
    }
  }

  static Future<Map<String, dynamic>> _post(
      String path, Map<String, dynamic> body) async {
    try {
      final res = await http
          .post(Uri.parse('$baseUrl$path'),
              headers: _headers, body: jsonEncode(body))
          .timeout(_timeout);
      return _decode(res);
    } on SocketException {
      throw Exception('Tidak dapat terhubung ke server.');
    } catch (e) {
      throw Exception(e.toString().replaceAll('Exception: ', ''));
    }
  }

  static Future<Map<String, dynamic>> _patch(
      String path, Map<String, dynamic> body) async {
    try {
      final res = await http
          .patch(Uri.parse('$baseUrl$path'),
              headers: _headers, body: jsonEncode(body))
          .timeout(_timeout);
      return _decode(res);
    } on SocketException {
      throw Exception('Tidak dapat terhubung ke server.');
    } catch (e) {
      throw Exception(e.toString().replaceAll('Exception: ', ''));
    }
  }

  static Map<String, dynamic> _decode(http.Response res) {
    if (res.statusCode >= 500) {
      throw Exception('Server error (${res.statusCode}).');
    }
    try {
      return jsonDecode(res.body) as Map<String, dynamic>;
    } catch (_) {
      throw Exception('Respons server tidak valid.');
    }
  }

  // ── Public raw helpers (untuk courier_home) ───────────────────────────────
  static Future<Map<String, dynamic>> patchRaw(
          String path, Map<String, dynamic> body) =>
      _patch(path, body);

  static Future<Map<String, dynamic>> getRaw(String path) => _get(path);

  // ── Auth ──────────────────────────────────────────────────────────────────
  static Future<User> login(String email, String password) async {
    final data = await _post('/api/auth/login', {
      'email': email.trim().toLowerCase(),
      'password': password,
    });
    if (data['error'] != null) throw Exception(data['error'].toString());
    final userJson = data['user'];
    if (userJson == null) throw Exception('Data user tidak ditemukan.');
    return User.fromJson(userJson as Map<String, dynamic>);
  }

  // ── Orders ────────────────────────────────────────────────────────────────
  static Future<List<Order>> getOrders({
    String? schoolId,
    String? courierId,
    String? date,
    String? status,
  }) async {
    final params = <String, String>{};
    if (schoolId  != null) params['schoolId']  = schoolId;
    if (courierId != null) params['courierId'] = courierId;
    if (date      != null) params['date']      = date;
    if (status    != null) params['status']    = status;
    final q    = params.entries.map((e) => '${e.key}=${e.value}').join('&');
    final data = await _get('/api/orders${q.isNotEmpty ? '?$q' : ''}');
    final list = data['orders'];
    if (list == null) return [];
    return (list as List)
        .map((o) => Order.fromJson(o as Map<String, dynamic>))
        .toList();
  }

  static Future<Order> createOrder(String schoolId, int portions) async {
    final data = await _post('/api/orders', {
      'schoolId': schoolId,
      'portions': portions,
    });
    if (data['error'] != null) throw Exception(data['error'].toString());
    return Order.fromJson(data['order'] as Map<String, dynamic>);
  }

  static Future<Order> advanceOrderStatus(String orderId) async {
    final data = await _patch('/api/orders/$orderId', {'action': 'advance_status'});
    if (data['error'] != null) throw Exception(data['error'].toString());
    return Order.fromJson(data['order'] as Map<String, dynamic>);
  }

  static Future<Order> assignCourier(String orderId, String courierId) async {
    final data = await _patch('/api/orders/$orderId',
        {'action': 'assign_courier', 'courierId': courierId});
    if (data['error'] != null) throw Exception(data['error'].toString());
    return Order.fromJson(data['order'] as Map<String, dynamic>);
  }

  // ── Delivery Proof ────────────────────────────────────────────────────────
  static Future<void> submitDeliveryProof({
    required String orderId,
    required String photoBase64,
    double? latitude,
    double? longitude,
    String? address,
    String? note,
  }) async {
    final data = await _post('/api/delivery-proof', {
      'orderId': orderId,
      'photoBase64': photoBase64,
      if (latitude  != null) 'latitude':  latitude,
      if (longitude != null) 'longitude': longitude,
      if (address   != null) 'address':   address,
      if (note      != null) 'note':      note,
    });
    if (data['error'] != null) throw Exception(data['error'].toString());
  }

  // ── Location broadcast (HTTP fallback) ────────────────────────────────────
  static Future<void> broadcastLocation({
    required String userId,
    required String orderId,
    required double lat,
    required double lng,
    double? accuracy,
  }) async {
    try {
      await _post('/api/webrtc/signal', {
        'from': userId,
        'type': 'location_update',
        'payload': {
          'lat': lat, 'lng': lng,
          'accuracy': accuracy ?? 0,
          'orderId': orderId,
          'timestamp': DateTime.now().millisecondsSinceEpoch,
        },
      });
    } catch (_) {}
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  static Future<DashboardStats> getStats() async {
    final data = await _get('/api/stats');
    final stats = data['stats'];
    if (stats == null) throw Exception('Data statistik tidak tersedia.');
    return DashboardStats.fromJson(stats as Map<String, dynamic>);
  }

  // ── Inventory ─────────────────────────────────────────────────────────────
  static Future<List<InventoryItem>> getInventory() async {
    final data = await _get('/api/inventory');
    final list = data['inventory'];
    if (list == null) return [];
    return (list as List)
        .map((i) => InventoryItem.fromJson(i as Map<String, dynamic>))
        .toList();
  }

  static Future<void> addStock(
    String name, double quantity, String unit, String note) async {
    final data = await _post('/api/inventory', {
      'name': name.trim(), 'quantity': quantity,
      'unit': unit.trim(), 'note': note.trim(),
    });
    if (data['error'] != null) throw Exception(data['error'].toString());
  }

  // ── Couriers ──────────────────────────────────────────────────────────────
  static Future<List<Courier>> getCouriers() async {
    final data = await _get('/api/couriers');
    final list = data['couriers'];
    if (list == null) return [];
    return (list as List)
        .map((c) => Courier.fromJson(c as Map<String, dynamic>))
        .toList();
  }

  // ── Notifications ─────────────────────────────────────────────────────────
  static Future<List<Map<String, dynamic>>> getNotifications(
      String userId) async {
    final data = await _get('/api/notifications?userId=$userId');
    final list = data['notifications'];
    if (list == null) return [];
    return (list as List).cast<Map<String, dynamic>>();
  }
}
