import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../models/models.dart';
import '../../services/api_service.dart';
import '../../services/auth_provider.dart';
import '../../services/websocket_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/shared_widgets.dart';

class AdminOrdersTab extends StatefulWidget {
  const AdminOrdersTab({super.key});
  @override
  State<AdminOrdersTab> createState() => _AdminOrdersTabState();
}

class _AdminOrdersTabState extends State<AdminOrdersTab> {
  List<Order>       _orders   = [];
  DashboardStats?   _stats;
  List<Courier>     _couriers = [];
  bool              _loading  = true;
  final Map<String, bool> _actionLoading = {};

  // Live locations dari WebSocket
  final Map<String, Map<String, dynamic>> _locations = {};

  @override
  void initState() {
    super.initState();
    _load();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<WebSocketService>().addMessageListener(_onWsMessage);
    });
  }

  @override
  void dispose() {
    context.read<WebSocketService>().removeMessageListener(_onWsMessage);
    super.dispose();
  }

  void _onWsMessage(Map<String, dynamic> msg) {
    if (!mounted) return;
    final type = msg['type'] as String? ?? '';
    setState(() {
      switch (type) {
        case WsEvents.orderNew:
          final o = Order.fromJson(msg['order'] as Map<String, dynamic>);
          final idx = _orders.indexWhere((x) => x.id == o.id);
          if (idx >= 0) _orders[idx] = o; else _orders.add(o);
          _orders.sort((a, b) => a.createdAt.compareTo(b.createdAt));
          break;
        case WsEvents.orderUpdated:
          final o = Order.fromJson(msg['order'] as Map<String, dynamic>);
          final idx = _orders.indexWhere((x) => x.id == o.id);
          if (idx >= 0) _orders[idx] = o;
          break;
        case WsEvents.proofSubmitted:
          final o = Order.fromJson(msg['order'] as Map<String, dynamic>);
          final idx = _orders.indexWhere((x) => x.id == o.id);
          if (idx >= 0) _orders[idx] = o;
          break;
        case WsEvents.statsUpdated:
          if (msg['stats'] != null) {
            _stats = DashboardStats.fromJson(msg['stats'] as Map<String, dynamic>);
          }
          break;
        case WsEvents.locationUpdate:
          final courierId = msg['courierId'] as String?;
          if (courierId != null) _locations[courierId] = Map<String, dynamic>.from(msg);
          break;
        case WsEvents.locationStop:
          final courierId = msg['courierId'] as String?;
          if (courierId != null) _locations.remove(courierId);
          break;
      }
    });
  }

  Future<void> _load() async {
    if (!mounted) return;
    setState(() => _loading = true);
    try {
      final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
      final results = await Future.wait([
        ApiService.getOrders(date: today),
        ApiService.getStats(),
        ApiService.getCouriers(),
      ]);
      if (!mounted) return;
      setState(() {
        _orders   = results[0] as List<Order>;
        _stats    = results[1] as DashboardStats;
        _couriers = results[2] as List<Courier>;
        _loading  = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _advance(String orderId) async {
    setState(() => _actionLoading[orderId] = true);
    try {
      final data = await ApiService.patchRaw(
        '/api/orders/$orderId', {'action': 'advance_status'});
      if (data['error'] != null) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(data['error'].toString()),
          backgroundColor: AppColors.red,
          behavior: SnackBarBehavior.floating));
      }
      // WS akan update otomatis
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(e.toString().replaceAll('Exception: ', '')),
        backgroundColor: AppColors.red,
        behavior: SnackBarBehavior.floating));
    } finally {
      if (mounted) setState(() => _actionLoading.remove(orderId));
    }
  }

  Future<void> _assignCourier(String orderId, String courierId) async {
    try {
      await ApiService.assignCourier(orderId, courierId);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final ws      = context.watch<WebSocketService>();
    final isLive  = ws.isConnected;

    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.primary,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Dashboard Dapur Umum',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.slate900)),
                  Text(DateFormat('EEEE, d MMMM yyyy').format(DateTime.now()),
                    style: const TextStyle(fontSize: 12, color: AppColors.slate400)),
                ])),
                // WS status pill
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: isLive ? const Color(0x1027AE60) : const Color(0x10E74C3C),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: isLive
                      ? const Color(0x3027AE60) : const Color(0x30E74C3C))),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Container(width: 5, height: 5, decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isLive ? AppColors.green : AppColors.red)),
                    const SizedBox(width: 5),
                    Text(isLive ? 'Real-time' : 'Offline',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
                        color: isLive ? AppColors.green : AppColors.red)),
                  ]),
                ),
              ]),
              const SizedBox(height: 16),

              if (_loading) const ShimmerList(count: 2),
              if (!_loading && _stats != null) ...[
                Row(children: [
                  Expanded(child: StatCard(
                    label: 'Total Porsi',
                    value: _stats!.totalPortionsToday.toString(),
                    sub: 'Hari ini',
                    icon: Icons.people_outline, color: AppColors.primary)),
                  const SizedBox(width: 10),
                  Expanded(child: StatCard(
                    label: 'Sisa Beras',
                    value: '${_stats!.riceStock.toStringAsFixed(0)} kg',
                    sub: 'Dalam gudang',
                    icon: Icons.inventory_2_outlined, color: AppColors.green)),
                ]).animate().fadeIn(duration: 350.ms),
                const SizedBox(height: 10),
                Row(children: [
                  Expanded(child: StatCard(
                    label: 'Sekolah Dilayani',
                    value: '${_stats!.schoolsServed}/${_stats!.totalSchools}',
                    sub: 'Selesai',
                    icon: Icons.check_circle_outline,
                    color: const Color(0xFF6366F1))),
                  const SizedBox(width: 10),
                  Expanded(child: StatCard(
                    label: 'Permintaan',
                    value: _stats!.totalOrdersToday.toString(),
                    sub: 'Hari ini',
                    icon: Icons.trending_up,
                    color: const Color(0xFF8B5CF6))),
                ]).animate().fadeIn(delay: 80.ms, duration: 350.ms),
              ],
              const SizedBox(height: 20),
              Row(children: [
                const Expanded(child: SectionHeader('Rekap Pesanan Hari Ini')),
                if (isLive && _locations.isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0x1027AE60),
                      borderRadius: BorderRadius.circular(8)),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      Container(width: 5, height: 5,
                        decoration: const BoxDecoration(color: AppColors.green, shape: BoxShape.circle)),
                      const SizedBox(width: 4),
                      Text('${_locations.length} GPS aktif',
                        style: const TextStyle(fontSize: 11, color: AppColors.green, fontWeight: FontWeight.w600)),
                    ])),
              ]),
            ]),
          )),

          if (_loading)
            SliverPadding(padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverToBoxAdapter(child: const ShimmerList())),
          if (!_loading && _orders.isEmpty)
            const SliverFillRemaining(child: EmptyState(
              icon: Icons.receipt_long_outlined,
              title: 'Belum ada pesanan',
              subtitle: 'Pesanan dari sekolah akan muncul\notomatis di sini')),
          if (!_loading && _orders.isNotEmpty)
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
              sliver: SliverList(delegate: SliverChildBuilderDelegate(
                (ctx, i) => _OrderCard(
                  order: _orders[i],
                  couriers: _couriers,
                  isLoading: _actionLoading[_orders[i].id] ?? false,
                  locationData: _locations[_orders[i].courierId ?? ''],
                  onAdvance: () => _advance(_orders[i].id),
                  onAssign: (cid) => _assignCourier(_orders[i].id, cid),
                ).animate()
                  .fadeIn(delay: (i * 55).ms, duration: 320.ms)
                  .slideY(begin: 0.12, end: 0),
                childCount: _orders.length,
              )),
            ),
        ],
      ),
    );
  }
}

// ── Order Card ────────────────────────────────────────────────────────────────
class _OrderCard extends StatelessWidget {
  final Order order;
  final List<Courier> couriers;
  final bool isLoading;
  final Map<String, dynamic>? locationData;
  final VoidCallback onAdvance;
  final ValueChanged<String> onAssign;

  const _OrderCard({
    required this.order, required this.couriers,
    required this.isLoading, required this.onAdvance,
    required this.onAssign, this.locationData,
  });

  String? get _actionLabel {
    if (order.status == 'pending') return 'Mulai Masak';
    if (order.status == 'cooking') return 'Kirim';
    return null;
  }

  Color get _actionColor =>
    order.status == 'pending' ? AppColors.amber : AppColors.primary;

  IconData get _actionIcon =>
    order.status == 'pending'
      ? Icons.local_fire_department_outlined
      : Icons.send_outlined;

  @override
  Widget build(BuildContext context) {
    final hasLoc = locationData != null;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.slate100),
        boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 8, offset: Offset(0, 2))]),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(order.school?.name ?? '-',
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.slate900)),
            const SizedBox(height: 2),
            Text(order.school?.address ?? '',
              style: const TextStyle(fontSize: 11, color: AppColors.slate400),
              maxLines: 1, overflow: TextOverflow.ellipsis),
          ])),
          const SizedBox(width: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(color: AppColors.primaryPale, borderRadius: BorderRadius.circular(10)),
            child: Column(children: [
              Text(order.portions.toString(),
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.primary)),
              const Text('porsi', style: TextStyle(fontSize: 9, color: AppColors.slate400)),
            ])),
        ]),
        const SizedBox(height: 10),

        Row(children: [
          StatusBadge(order.status),
          const SizedBox(width: 6),
          if (hasLoc)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
              decoration: BoxDecoration(
                color: const Color(0x1027AE60),
                borderRadius: BorderRadius.circular(10)),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Container(width: 5, height: 5,
                  decoration: const BoxDecoration(color: AppColors.green, shape: BoxShape.circle)),
                const SizedBox(width: 4),
                const Text('GPS Live', style: TextStyle(fontSize: 10, color: AppColors.green, fontWeight: FontWeight.w700)),
              ])),
          const Spacer(),
          // Kurir dropdown
          if (order.status != 'delivered')
            Container(
              height: 32,
              padding: const EdgeInsets.symmetric(horizontal: 8),
              decoration: BoxDecoration(
                border: Border.all(color: AppColors.slate200),
                borderRadius: BorderRadius.circular(8), color: Colors.white),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: order.courierId,
                  isDense: true,
                  hint: const Text('Kurir', style: TextStyle(fontSize: 11, color: AppColors.slate400)),
                  style: const TextStyle(fontSize: 11, color: AppColors.slate700, fontWeight: FontWeight.w500),
                  items: couriers.map((c) => DropdownMenuItem(
                    value: c.id, child: Text(c.name))).toList(),
                  onChanged: (v) { if (v != null) onAssign(v); },
                ))),
          if (order.status == 'delivered')
            Text(order.courier?.name ?? '—',
              style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
        ]),

        // Lokasi live (kalau ada)
        if (hasLoc) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0x0A27AE60),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0x2027AE60))),
            child: Row(children: [
              const Icon(Icons.location_on, size: 12, color: AppColors.green),
              const SizedBox(width: 5),
              Text(
                '${(locationData!['lat'] as double?)?.toStringAsFixed(5) ?? '-'}, '
                '${(locationData!['lng'] as double?)?.toStringAsFixed(5) ?? '-'}',
                style: const TextStyle(fontSize: 11, color: AppColors.green, fontFamily: 'monospace')),
              const Spacer(),
              GestureDetector(
                onTap: () {
                  final lat = locationData!['lat'];
                  final lng = locationData!['lng'];
                  if (lat != null && lng != null) {
                    // Buka di maps (via launcher)
                  }
                },
                child: const Text('Maps', style: TextStyle(fontSize: 11, color: AppColors.green, fontWeight: FontWeight.w600, decoration: TextDecoration.underline))),
            ])),
        ],

        if (_actionLabel != null) ...[
          const SizedBox(height: 10),
          SizedBox(
            height: 38, width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: isLoading ? null : onAdvance,
              icon: isLoading
                ? const SizedBox(width: 14, height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Icon(_actionIcon, size: 15),
              label: Text(isLoading ? 'Memproses...' : _actionLabel!,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
              style: ElevatedButton.styleFrom(
                backgroundColor: _actionColor, foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
            )),
        ],

        if (order.deliveryProof != null) ...[
          const SizedBox(height: 8),
          Row(children: [
            const Icon(Icons.check_circle, size: 13, color: AppColors.green),
            const SizedBox(width: 5),
            const Text('Bukti foto tersedia',
              style: TextStyle(fontSize: 12, color: AppColors.green, fontWeight: FontWeight.w500)),
          ]),
        ],
      ]),
    );
  }
}
