import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';

import '../../models/models.dart';
import '../../services/api_service.dart';
import '../../services/auth_provider.dart';
import '../../services/camera_service.dart';
import '../../services/location_service.dart';
import '../../services/notification_service.dart';
import '../../services/websocket_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/shared_widgets.dart';
import '../../utils/launcher.dart';
import '../auth/login_screen.dart';

class CourierHome extends StatefulWidget {
  const CourierHome({super.key});
  @override
  State<CourierHome> createState() => _CourierHomeState();
}

class _CourierHomeState extends State<CourierHome> {
  List<Order>             _orders        = [];
  bool                    _loading       = true;
  bool                    _refreshing    = false;
  final Map<String, bool> _actionLoading = {};

  // Live GPS tracking
  StreamSubscription<Position>? _locationSub;
  bool   _isTracking    = false;
  String? _trackingOrderId;
  Timer?  _locationTimer;

  @override
  void initState() {
    super.initState();
    NotificationService.init();
    _loadOrders();
    // Pasang WS listener setelah frame pertama
    WidgetsBinding.instance.addPostFrameCallback((_) => _initWs());
  }

  @override
  void dispose() {
    _stopLiveTracking();
    _locationTimer?.cancel();
    // Lepas listener WS
    final ws = context.read<WebSocketService>();
    ws.removeMessageListener(_onWsMessage);
    super.dispose();
  }

  void _initWs() {
    final auth = context.read<AuthProvider>();
    final ws   = context.read<WebSocketService>();
    ws.addMessageListener(_onWsMessage);

    if (!ws.isConnected && auth.user != null) {
      ws.connect(
        auth.user!.id,
        auth.user!.role,
        ApiService.baseUrl,
      );
    }
  }

  void _onWsMessage(Map<String, dynamic> msg) {
    if (!mounted) return;
    final type = msg['type'] as String? ?? '';
    if (type == WsEvents.orderUpdated) {
      final orderData = msg['order'] as Map<String, dynamic>?;
      if (orderData == null) return;
      final updated = Order.fromJson(orderData);
      // Cek apakah order ini milik kurir ini
      final myId = context.read<AuthProvider>().user?.courier?.id;
      if (updated.courierId == myId) {
        setState(() {
          final idx = _orders.indexWhere((o) => o.id == updated.id);
          if (idx >= 0) {
            _orders[idx] = updated;
          } else {
            _orders = [..._orders, updated];
          }
        });
        // Notif lokal
        if (updated.status == 'on_delivery') {
          NotificationService.show(id: 20, title: 'Tugas Baru!',
            body: 'Silakan antar ke ${updated.school?.name ?? "tujuan"}.');
        }
      }
    }
  }

  String? get _courierId   => context.read<AuthProvider>().user?.courier?.id;
  String? get _userId      => context.read<AuthProvider>().user?.id;
  String? get _courierName => context.read<AuthProvider>().user?.name;

  Future<void> _loadOrders() async {
    final cid = _courierId;
    if (cid == null) { setState(() { _loading = false; _refreshing = false; }); return; }
    if (!_refreshing) setState(() => _loading = true);
    try {
      final today  = DateFormat('yyyy-MM-dd').format(DateTime.now());
      final orders = await ApiService.getOrders(courierId: cid, date: today);
      if (!mounted) return;
      setState(() { _orders = orders; _loading = false; _refreshing = false; });
      // Auto-start tracking kalau ada order on_delivery
      for (final o in orders) {
        if (o.status == 'on_delivery' && !_isTracking) {
          _startLiveTracking(o.id);
        }
      }
    } catch (_) {
      if (mounted) setState(() { _loading = false; _refreshing = false; });
    }
  }

  Future<void> _refresh() async {
    setState(() => _refreshing = true);
    await _loadOrders();
  }

  Future<void> _advance(Order order) async {
    // Cek wajib bukti sebelum selesaikan
    if (order.status == 'on_delivery' && !order.hasProof) {
      _showProofRequired(order);
      return;
    }

    HapticFeedback.mediumImpact();
    setState(() => _actionLoading[order.id] = true);
    try {
      final res = await fetch('/api/orders/${order.id}', 'PATCH',
        body: {'action': 'advance_status'});
      if (res['requireProof'] == true) {
        _showProofRequired(order);
        return;
      }
      if (res['error'] != null) {
        _showSnack(res['error'] as String, isError: true);
        return;
      }
      final updated = Order.fromJson(res['order'] as Map<String, dynamic>);
      if (updated.status == 'on_delivery') _startLiveTracking(order.id);
      if (updated.status == 'delivered')   _stopLiveTracking();
      await _loadOrders();
    } catch (e) {
      if (!mounted) return;
      _showSnack(e.toString().replaceAll('Exception: ', ''), isError: true);
    } finally {
      if (mounted) setState(() => _actionLoading.remove(order.id));
    }
  }

  // Wrapper fetch sederhana
  Future<Map<String, dynamic>> fetch(String path, String method,
      {Map<String, dynamic>? body}) =>
    method == 'PATCH'
      ? ApiService.patchRaw(path, body ?? {})
      : ApiService.getRaw(path);

  void _showProofRequired(Order order) {
    HapticFeedback.heavyImpact();
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 40, height: 4,
            decoration: BoxDecoration(color: AppColors.slate200, borderRadius: BorderRadius.circular(2))),
          const SizedBox(height: 20),
          Container(width: 56, height: 56,
            decoration: BoxDecoration(color: AppColors.redLight, borderRadius: BorderRadius.circular(16)),
            child: const Icon(Icons.photo_camera, color: AppColors.red, size: 28)),
          const SizedBox(height: 16),
          const Text('Bukti Foto Wajib', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.slate900)),
          const SizedBox(height: 8),
          const Text('Anda harus mengirim bukti foto pengiriman sebelum menyelesaikan pesanan ini.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, color: AppColors.slate500, height: 1.5)),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity, height: 52,
            child: ElevatedButton.icon(
              icon: const Icon(Icons.photo_camera, size: 20),
              label: const Text('Kirim Bukti Sekarang',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
              onPressed: () {
                Navigator.pop(context);
                _submitProof(order);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF7C3AED),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 0),
            ),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Nanti', style: TextStyle(color: AppColors.slate400))),
          const SizedBox(height: 8),
        ]),
      ),
    );
  }

  Future<void> _submitProof(Order order) async {
    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _DeliveryProofSheet(order: order),
    );
    if (result == true) {
      _stopLiveTracking();
      await _loadOrders();
      await NotificationService.deliveryProofReceived(order.school?.name ?? '');
    }
  }

  void _startLiveTracking(String orderId) {
    final uid  = _userId;
    final ws   = context.read<WebSocketService>();
    final name = _courierName ?? '';
    if (uid == null) return;

    _locationSub?.cancel();
    setState(() { _isTracking = true; _trackingOrderId = orderId; });

    _locationSub = LocationService.watchPosition().listen(
      (pos) {
        // Broadcast via WebSocket
        ws.sendLocation(
          lat: pos.latitude, lng: pos.longitude,
          accuracy: pos.accuracy, orderId: orderId,
          courierName: name,
        );
        // Broadcast via HTTP juga (fallback)
        ApiService.broadcastLocation(
          userId: uid, orderId: orderId,
          lat: pos.latitude, lng: pos.longitude,
          accuracy: pos.accuracy,
        );
      },
      onError: (_) => _stopLiveTracking(),
    );
  }

  void _stopLiveTracking() {
    _locationSub?.cancel();
    _locationSub = null;
    if (mounted) {
      // Beritahu server tracking berhenti
      try {
        context.read<WebSocketService>().sendLocationStop();
      } catch (_) {}
      setState(() { _isTracking = false; _trackingOrderId = null; });
    }
  }

  void _showSnack(String msg, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: isError ? AppColors.red : AppColors.green,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      margin: const EdgeInsets.all(16),
    ));
  }

  List<Order> get _active => _orders.where((o) => o.status != 'delivered').toList();
  List<Order> get _done   => _orders.where((o) => o.status == 'delivered').toList();

  @override
  Widget build(BuildContext context) {
    final user    = context.watch<AuthProvider>().user;
    final ws      = context.watch<WebSocketService>();

    return Scaffold(
      backgroundColor: AppColors.slate50,
      appBar: AppBar(
        titleSpacing: 16,
        title: const MbgLogo(size: 28),
        actions: [
          if (_isTracking)
            Container(
              margin: const EdgeInsets.only(right: 4),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: const Color(0x1527AE60),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.green.withAlpha(80))),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Container(width: 6, height: 6,
                  decoration: const BoxDecoration(color: AppColors.green, shape: BoxShape.circle)),
                const SizedBox(width: 5),
                const Text('GPS Live', style: TextStyle(fontSize: 11, color: AppColors.green, fontWeight: FontWeight.w700)),
              ]),
            ),
          // WS status indicator
          Container(
            margin: const EdgeInsets.only(right: 4),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: ws.isConnected ? const Color(0x1027AE60) : const Color(0x10E74C3C),
              borderRadius: BorderRadius.circular(8)),
            child: Icon(
              ws.isConnected ? Icons.wifi : Icons.wifi_off,
              size: 14,
              color: ws.isConnected ? AppColors.green : AppColors.slate400),
          ),
          Padding(
            padding: const EdgeInsets.only(right: 4),
            child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text(user?.name ?? '',
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.slate800),
                overflow: TextOverflow.ellipsis),
              const Text('Kurir', style: TextStyle(fontSize: 11, color: AppColors.primary, fontWeight: FontWeight.w500)),
            ]),
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: AppColors.slate400, size: 20),
            onPressed: () async {
              _stopLiveTracking();
              await context.read<AuthProvider>().logout();
              if (!mounted) return;
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const LoginScreen()), (_) => false);
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        color: AppColors.primary,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Daftar Tugas',
                      style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.slate900)),
                    Text(DateFormat('EEEE, d MMMM').format(DateTime.now()),
                      style: const TextStyle(fontSize: 13, color: AppColors.slate400)),
                  ])),
                  Material(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(12),
                      onTap: _refresh,
                      child: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          border: Border.all(color: AppColors.slate200),
                          borderRadius: BorderRadius.circular(12)),
                        child: AnimatedRotation(
                          turns: _refreshing ? 1 : 0,
                          duration: const Duration(milliseconds: 600),
                          child: const Icon(Icons.refresh_rounded, color: AppColors.slate500, size: 20)),
                      ),
                    ),
                  ),
                ]),
                const SizedBox(height: 14),
                Row(children: [
                  _SummaryChip(label: 'Total',   value: _orders.length.toString(), color: AppColors.slate700),
                  const SizedBox(width: 8),
                  _SummaryChip(label: 'Aktif',   value: _active.length.toString(), color: AppColors.primary),
                  const SizedBox(width: 8),
                  _SummaryChip(label: 'Selesai', value: _done.length.toString(),   color: AppColors.green),
                ]).animate().fadeIn(duration: 300.ms),
                const SizedBox(height: 16),
              ]),
            )),

            if (_loading)
              SliverPadding(padding: const EdgeInsets.symmetric(horizontal: 16),
                sliver: SliverToBoxAdapter(child: const ShimmerList(count: 3))),

            if (!_loading && _orders.isEmpty)
              SliverFillRemaining(child: EmptyState(
                icon: Icons.local_shipping_outlined,
                title: 'Tidak ada tugas hari ini',
                subtitle: 'Anda belum ditugaskan ke\npengiriman manapun')),

            if (!_loading && _active.isNotEmpty) ...[
              SliverToBoxAdapter(child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                child: Row(children: [
                  Container(width: 8, height: 8,
                    decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle)),
                  const SizedBox(width: 8),
                  Text('Tugas Aktif (${_active.length})',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700,
                      color: AppColors.slate600, letterSpacing: 0.3)),
                ]),
              )),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                sliver: SliverList(delegate: SliverChildBuilderDelegate(
                  (ctx, i) => _DeliveryCard(
                    order: _active[i],
                    isLoading: _actionLoading[_active[i].id] ?? false,
                    isTracking: _trackingOrderId == _active[i].id,
                    onAction: () => _advance(_active[i]),
                    onSubmitProof: () => _submitProof(_active[i]),
                    onMaps: () => UrlLauncher.openMaps(_active[i].school?.address ?? ''),
                  ).animate()
                    .fadeIn(delay: (i * 70).ms, duration: 380.ms)
                    .slideY(begin: 0.12, end: 0),
                  childCount: _active.length,
                )),
              ),
            ],

            if (!_loading && _done.isNotEmpty) ...[
              SliverToBoxAdapter(child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
                child: Row(children: [
                  Container(width: 8, height: 8,
                    decoration: const BoxDecoration(color: AppColors.green, shape: BoxShape.circle)),
                  const SizedBox(width: 8),
                  Text('Selesai (${_done.length})',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700,
                      color: AppColors.slate400, letterSpacing: 0.3)),
                ]),
              )),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                sliver: SliverList(delegate: SliverChildBuilderDelegate(
                  (ctx, i) => _DeliveryCard(
                    order: _done[i],
                    isLoading: false,
                    isDone: true,
                    onMaps: () => UrlLauncher.openMaps(_done[i].school?.address ?? ''),
                  ).animate().fadeIn(delay: (i * 50).ms, duration: 300.ms),
                  childCount: _done.length,
                )),
              ),
            ],
            const SliverToBoxAdapter(child: SizedBox(height: 24)),
          ],
        ),
      ),
    );
  }
}

// ── Summary Chip ──────────────────────────────────────────────────────────────
class _SummaryChip extends StatelessWidget {
  final String label, value;
  final Color color;
  const _SummaryChip({required this.label, required this.value, required this.color});
  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.slate100),
        boxShadow: const [BoxShadow(color: Color(0x08000000), blurRadius: 4)]),
      child: Column(children: [
        Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: color)),
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.slate400)),
      ]),
    ),
  );
}

// ── Delivery Card ─────────────────────────────────────────────────────────────
class _DeliveryCard extends StatelessWidget {
  final Order         order;
  final bool          isLoading;
  final bool          isDone;
  final bool          isTracking;
  final VoidCallback? onAction;
  final VoidCallback? onSubmitProof;
  final VoidCallback  onMaps;

  const _DeliveryCard({
    required this.order,
    required this.isLoading,
    required this.onMaps,
    this.isDone = false,
    this.isTracking = false,
    this.onAction,
    this.onSubmitProof,
  });

  Color get _bg {
    if (isDone)                        return const Color(0xFFF0FDF4);
    if (order.status == 'on_delivery') return AppColors.primaryPale;
    return AppColors.amberLight;
  }

  Color get _borderColor {
    if (isDone)                        return const Color(0x3327AE60);
    if (order.status == 'on_delivery') return const Color(0x405DADE2);
    return const Color(0x40F39C12);
  }

  // Label tombol utama
  String get _actionLabel {
    if (order.status == 'cooking')     return 'Mulai Antar';
    if (order.status == 'on_delivery') return 'Selesaikan Pengiriman';
    return '';
  }

  @override
  Widget build(BuildContext context) {
    final proofRequired = order.status == 'on_delivery' && !order.hasProof;

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: _bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _borderColor, width: 1.5),
        boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 8, offset: Offset(0, 3))]),
      child: Column(children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            // Header
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(order.school?.name ?? '-',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.slate900)),
                const SizedBox(height: 4),
                Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Icon(Icons.location_on_outlined, size: 13, color: AppColors.slate400),
                  const SizedBox(width: 4),
                  Expanded(child: Text(order.school?.address ?? '-',
                    style: const TextStyle(fontSize: 12, color: AppColors.slate500),
                    maxLines: 2, overflow: TextOverflow.ellipsis)),
                ]),
              ])),
              const SizedBox(width: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12),
                  boxShadow: const [BoxShadow(color: Color(0x0F000000), blurRadius: 6)]),
                child: Column(children: [
                  Text(order.portions.toString(),
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.primary)),
                  const Text('porsi', style: TextStyle(fontSize: 10, color: AppColors.slate400)),
                ]),
              ),
            ]),
            const SizedBox(height: 12),

            // Info
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: const Color(0xB3FFFFFF), borderRadius: BorderRadius.circular(12)),
              child: Column(children: [
                InfoRow(label: 'Kepala Sekolah', value: order.school?.principalName ?? '-', icon: Icons.person_outline),
                const Divider(height: 12, color: AppColors.slate100),
                InfoRow(label: 'Est. Berat', value: '${(order.portions * 0.5).toStringAsFixed(0)} kg', icon: Icons.scale_outlined),
                const Divider(height: 12, color: AppColors.slate100),
                InfoRow(label: 'Waktu Order', value: DateFormat('HH:mm').format(order.createdAt.toLocal()), icon: Icons.schedule_outlined),
              ]),
            ),
            const SizedBox(height: 12),

            // Status + GPS
            Row(children: [
              StatusBadge(order.status),
              if (isTracking) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: const Color(0x1527AE60), borderRadius: BorderRadius.circular(12)),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Container(width: 5, height: 5,
                      decoration: const BoxDecoration(color: AppColors.green, shape: BoxShape.circle)),
                    const SizedBox(width: 4),
                    const Text('GPS Aktif', style: TextStyle(fontSize: 10, color: AppColors.green, fontWeight: FontWeight.w700)),
                  ])),
              ],
              if (isDone) ...[
                const Spacer(),
                Text(DateFormat('HH:mm').format(order.updatedAt.toLocal()),
                  style: const TextStyle(fontSize: 12, color: AppColors.green, fontWeight: FontWeight.w600)),
              ],
            ]),

            // Bukti foto (sudah dikirim)
            if (order.hasProof) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: AppColors.greenLight, borderRadius: BorderRadius.circular(12)),
                child: Row(children: [
                  const Icon(Icons.check_circle, size: 14, color: AppColors.green),
                  const SizedBox(width: 6),
                  const Text('Bukti foto telah dikirim', style: TextStyle(fontSize: 12, color: AppColors.green, fontWeight: FontWeight.w600)),
                  const Spacer(),
                  if (order.deliveryProof?.address != null)
                    Flexible(child: Text(order.deliveryProof!.address!,
                      style: const TextStyle(fontSize: 10, color: AppColors.green), overflow: TextOverflow.ellipsis)),
                ]),
              ),
            ],

            // Warning: bukti belum ada
            if (proofRequired && !isDone) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: AppColors.redLight, borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0x33E74C3C))),
                child: Row(children: [
                  const Icon(Icons.warning_amber_rounded, size: 14, color: AppColors.red),
                  const SizedBox(width: 6),
                  const Expanded(child: Text('Kirim bukti foto sebelum menyelesaikan pengiriman',
                    style: TextStyle(fontSize: 11, color: AppColors.red, fontWeight: FontWeight.w600))),
                ]),
              ),
            ],
          ]),
        ),

        // Tombol aksi
        if (!isDone)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Column(children: [
              // Tombol utama
              SizedBox(
                width: double.infinity, height: 56,
                child: ElevatedButton.icon(
                  onPressed: (isLoading || onAction == null) ? null : onAction,
                  icon: isLoading
                    ? const SizedBox(width: 20, height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                    : Icon(order.status == 'cooking'
                        ? Icons.local_shipping_outlined
                        : Icons.check_circle_outline,
                      size: 22),
                  label: Text(
                    isLoading ? 'Memproses...' : _actionLabel,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: order.status == 'cooking' ? AppColors.primary : AppColors.green,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: AppColors.slate300,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                ),
              ),

              // Tombol kirim bukti (saat on_delivery)
              if (order.status == 'on_delivery') ...[
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity, height: 50,
                  child: ElevatedButton.icon(
                    onPressed: onSubmitProof,
                    icon: Icon(order.hasProof ? Icons.edit : Icons.photo_camera, size: 20),
                    label: Text(
                      order.hasProof ? 'Ganti Bukti Foto' : 'Kirim Bukti Foto + Lokasi',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: order.hasProof
                        ? const Color(0xFF0891B2)
                        : const Color(0xFF7C3AED),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
                  ),
                ),
              ],

              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity, height: 46,
                child: OutlinedButton.icon(
                  onPressed: onMaps,
                  icon: const Icon(Icons.map_outlined, size: 18),
                  label: const Text('Buka di Google Maps',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.slate600,
                    side: const BorderSide(color: AppColors.slate200),
                    backgroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                ),
              ),
            ]),
          ),
      ]),
    );
  }
}

// ── Delivery Proof Bottom Sheet ───────────────────────────────────────────────
class _DeliveryProofSheet extends StatefulWidget {
  final Order order;
  const _DeliveryProofSheet({required this.order});
  @override
  State<_DeliveryProofSheet> createState() => _DeliveryProofSheetState();
}

class _DeliveryProofSheetState extends State<_DeliveryProofSheet> {
  File?   _photo;
  double? _lat, _lng;
  String? _address;
  bool    _gettingLocation = false;
  bool    _submitting      = false;
  String? _error;
  final   _noteCtrl = TextEditingController();

  @override
  void dispose() { _noteCtrl.dispose(); super.dispose(); }

  Future<void> _pickPhoto() async {
    // KITA UBAH ImageSource MENJADI String
    final source = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => SafeArea(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
        const SizedBox(height: 8),
        Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
                color: AppColors.slate200,
                borderRadius: BorderRadius.circular(2))),
        const SizedBox(height: 16),
        ListTile(
            leading: const Icon(Icons.camera_alt, color: AppColors.primary),
            title: const Text('Ambil Foto dari Kamera',
                style: TextStyle(fontWeight: FontWeight.w600)),
            // Ubah kembaliannya menjadi teks 'camera'
            onTap: () => Navigator.pop(context, 'camera')),
        ListTile(
            leading: const Icon(Icons.photo_library, color: AppColors.primary),
            title: const Text('Pilih dari Galeri',
                style: TextStyle(fontWeight: FontWeight.w600)),
            // Ubah kembaliannya menjadi teks 'gallery'
            onTap: () => Navigator.pop(context, 'gallery')),
        const SizedBox(height: 8),
      ])),
    );

    if (source == null) return;

    // Cek teksnya, bukan ImageSource-nya
    final file = source == 'camera'
        ? await CameraService.takePhoto()
        : await CameraService.pickFromGallery();

    if (file != null && mounted)
      setState(() {
        _photo = file;
        _error = null;
      });
  }

  Future<void> _getLocation() async {
    setState(() { _gettingLocation = true; _error = null; });
    try {
      final pos = await LocationService.getCurrentPosition();
      if (pos == null) {
        setState(() { _error = 'Tidak dapat mengakses GPS. Berikan izin lokasi di pengaturan.'; _gettingLocation = false; });
        return;
      }
      final addr = await LocationService.reverseGeocode(pos.latitude, pos.longitude);
      if (mounted) setState(() {
        _lat = pos.latitude; _lng = pos.longitude;
        _address = addr; _gettingLocation = false;
      });
    } catch (e) {
      if (mounted) setState(() {
        _error = 'Gagal ambil lokasi: ${e.toString().replaceAll("Exception: ", "")}';
        _gettingLocation = false;
      });
    }
  }

  Future<void> _submit() async {
    if (_photo == null) { setState(() => _error = 'Foto bukti wajib diambil terlebih dahulu.'); return; }
    setState(() { _submitting = true; _error = null; });
    try {
      final base64 = await CameraService.fileToBase64(_photo!);
      if (base64 == null) throw Exception('Gagal memproses foto.');
      await ApiService.submitDeliveryProof(
        orderId: widget.order.id,
        photoBase64: base64,
        latitude: _lat, longitude: _lng,
        address: _address,
        note: _noteCtrl.text.trim().isEmpty ? null : _noteCtrl.text.trim(),
      );
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
        _submitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          Center(child: Container(width: 40, height: 4,
            decoration: BoxDecoration(color: AppColors.slate200, borderRadius: BorderRadius.circular(2)))),
          const SizedBox(height: 16),
          const Text('Kirim Bukti Pengiriman',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.slate900)),
          const SizedBox(height: 4),
          Text('${widget.order.school?.name} — ${widget.order.portions} porsi',
            style: const TextStyle(fontSize: 13, color: AppColors.slate400)),
          const SizedBox(height: 20),

          if (_error != null)
            Container(
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: AppColors.redLight,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0x33E74C3C))),
              child: Row(children: [
                const Icon(Icons.error_outline, color: AppColors.red, size: 16),
                const SizedBox(width: 8),
                Expanded(child: Text(_error!, style: const TextStyle(color: AppColors.red, fontSize: 13))),
              ]),
            ),

          // Foto
          GestureDetector(
            onTap: _pickPhoto,
            child: Container(
              height: 200, width: double.infinity,
              decoration: BoxDecoration(
                color: AppColors.slate50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _photo != null ? AppColors.primary : AppColors.slate200,
                  width: _photo != null ? 2 : 1)),
              child: _photo != null
                ? ClipRRect(borderRadius: BorderRadius.circular(14),
                    child: Image.file(_photo!, fit: BoxFit.cover))
                : Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    const Icon(Icons.add_a_photo_outlined, size: 40, color: AppColors.slate300),
                    const SizedBox(height: 8),
                    const Text('Ketuk untuk ambil foto',
                      style: TextStyle(fontSize: 14, color: AppColors.slate400, fontWeight: FontWeight.w500)),
                    const Text('Wajib diisi', style: TextStyle(fontSize: 12, color: AppColors.red)),
                  ]),
            ),
          ),
          if (_photo != null)
            TextButton.icon(
              onPressed: _pickPhoto,
              icon: const Icon(Icons.refresh, size: 16),
              label: const Text('Ganti Foto'),
              style: TextButton.styleFrom(foregroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(horizontal: 4))),

          const SizedBox(height: 16),

          // Lokasi
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: _lat != null ? AppColors.greenLight : AppColors.slate50,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: _lat != null ? const Color(0x3327AE60) : AppColors.slate200)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Icon(Icons.location_on, size: 16, color: _lat != null ? AppColors.green : AppColors.slate400),
                const SizedBox(width: 8),
                Text('Lokasi GPS', style: TextStyle(
                  fontSize: 13, fontWeight: FontWeight.w600,
                  color: _lat != null ? AppColors.green : AppColors.slate600)),
                const Spacer(),
                if (_lat == null)
                  TextButton(
                    onPressed: _gettingLocation ? null : _getLocation,
                    style: TextButton.styleFrom(foregroundColor: AppColors.primary,
                      padding: EdgeInsets.zero, minimumSize: const Size(60, 30)),
                    child: _gettingLocation
                      ? const SizedBox(width: 14, height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Ambil Lokasi', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
                if (_lat != null)
                  TextButton(
                    onPressed: _getLocation,
                    style: TextButton.styleFrom(foregroundColor: AppColors.green,
                      padding: EdgeInsets.zero, minimumSize: const Size(60, 30)),
                    child: const Text('Perbarui', style: TextStyle(fontSize: 12))),
              ]),
              if (_lat != null) ...[
                const SizedBox(height: 6),
                if (_address != null)
                  Text(_address!, style: const TextStyle(fontSize: 12, color: AppColors.green)),
                Text('${_lat!.toStringAsFixed(6)}, ${_lng!.toStringAsFixed(6)}',
                  style: const TextStyle(fontSize: 11, color: AppColors.green, fontFamily: 'monospace')),
              ] else
                const Text('Opsional — bantu admin memverifikasi lokasi',
                  style: TextStyle(fontSize: 11, color: AppColors.slate400)),
            ]),
          ),

          const SizedBox(height: 14),
          const Text('Catatan (opsional)',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.slate600)),
          const SizedBox(height: 8),
          TextField(
            controller: _noteCtrl,
            maxLines: 2,
            decoration: InputDecoration(
              hintText: 'cth: Diterima oleh guru piket',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.slate200)),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.slate200)),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.primary, width: 2)),
              filled: true, fillColor: Colors.white,
              contentPadding: const EdgeInsets.all(14))),

          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity, height: 56,
            child: ElevatedButton.icon(
              onPressed: _submitting ? null : _submit,
              icon: _submitting
                ? const SizedBox(width: 20, height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                : const Icon(Icons.check_circle_outline, size: 22),
              label: Text(_submitting ? 'Mengirim...' : 'Kirim Bukti Pengiriman',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF7C3AED),
                foregroundColor: Colors.white,
                disabledBackgroundColor: AppColors.slate300,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
            ),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: _submitting ? null : () => Navigator.of(context).pop(false),
            style: TextButton.styleFrom(foregroundColor: AppColors.slate400),
            child: const Text('Batal', style: TextStyle(fontSize: 14))),
          const SizedBox(height: 8),
        ]),
      ),
    );
  }
}
