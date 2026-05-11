import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../models/models.dart';
import '../../services/api_service.dart';
import '../../services/auth_provider.dart';
import '../../services/notification_service.dart';
import '../../services/websocket_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/shared_widgets.dart';
import '../auth/login_screen.dart';

class SchoolHome extends StatefulWidget {
  const SchoolHome({super.key});
  @override
  State<SchoolHome> createState() => _SchoolHomeState();
}

class _SchoolHomeState extends State<SchoolHome> {
  Order?  _todayOrder;
  bool    _loading    = true;
  bool    _submitting = false;
  bool    _confirming = false;
  final   _portionsCtrl = TextEditingController();
  String? _portionsError;

  @override
  void initState() {
    super.initState();
    NotificationService.init();
    _loadOrder();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      final ws   = context.read<WebSocketService>();
      ws.addMessageListener(_onWsMessage);
      if (auth.user != null && !ws.isConnected) {
        ws.connect(auth.user!.id, auth.user!.role, ApiService.baseUrl);
      }
    });
  }

  @override
  void dispose() {
    _portionsCtrl.dispose();
    context.read<WebSocketService>().removeMessageListener(_onWsMessage);
    super.dispose();
  }

  void _onWsMessage(Map<String, dynamic> msg) {
    if (!mounted) return;
    final type = msg['type'] as String? ?? '';

    if (type == WsEvents.orderUpdated || type == WsEvents.proofSubmitted) {
      final orderData = msg['order'] as Map<String, dynamic>?;
      if (orderData == null) return;
      final updated = Order.fromJson(orderData);
      if (_todayOrder != null && updated.id == _todayOrder!.id) {
        setState(() => _todayOrder = updated);
        // Notif lokal
        final labels = {
          'cooking':     'Sedang Dimasak',
          'on_delivery': 'Dalam Perjalanan',
          'delivered':   'Telah Diterima',
        };
        final label = labels[updated.status];
        if (label != null) {
          NotificationService.orderStatusChanged(updated.status, updated.school?.name ?? '');
        }
      }
    }
  }

  String? get _schoolId  => context.read<AuthProvider>().user?.school?.id;
  int     get _maxPortions => context.read<AuthProvider>().user?.school?.totalStudents ?? 9999;

  Future<void> _loadOrder() async {
    final sid = _schoolId;
    if (sid == null) { setState(() => _loading = false); return; }
    setState(() => _loading = true);
    try {
      final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
      final orders = await ApiService.getOrders(schoolId: sid, date: today);
      if (!mounted) return;
      setState(() {
        _todayOrder = orders.isNotEmpty ? orders.first : null;
        if (_todayOrder != null) _portionsCtrl.text = _todayOrder!.portions.toString();
        _loading = false;
      });
    } catch (_) { if (mounted) setState(() => _loading = false); }
  }

  void _validatePortions(String v) {
    final n = int.tryParse(v);
    if (n == null || n < 1) {
      setState(() => _portionsError = 'Jumlah harus lebih dari 0');
    } else if (n > _maxPortions) {
      setState(() => _portionsError = 'Maks. ${_fmt(_maxPortions)} porsi (total siswa)');
    } else {
      setState(() => _portionsError = null);
    }
  }

  String _fmt(int n) => n.toString().replaceAllMapped(
    RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.');

  Future<void> _submit() async {
    final portions = int.tryParse(_portionsCtrl.text.trim());
    final sid = _schoolId;
    if (portions == null || portions < 1) {
      setState(() => _portionsError = 'Jumlah harus lebih dari 0'); return;
    }
    if (portions > _maxPortions) {
      setState(() => _portionsError = 'Maks. ${_fmt(_maxPortions)} porsi'); return;
    }
    if (_portionsError != null || sid == null) return;
    setState(() => _submitting = true);
    try {
      final order = await ApiService.createOrder(sid, portions);
      if (!mounted) return;
      setState(() => _todayOrder = order);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Permintaan berhasil dikirim ke dapur!'),
        backgroundColor: AppColors.green,
        behavior: SnackBarBehavior.floating));
    } catch (e) {
      if (!mounted) return;
      setState(() => _portionsError = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _confirm() async {
    if (_todayOrder == null) return;
    setState(() => _confirming = true);
    try {
      final updated = await ApiService.advanceOrderStatus(_todayOrder!.id);
      if (!mounted) return;
      setState(() => _todayOrder = updated);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Penerimaan makanan berhasil dikonfirmasi!'),
        backgroundColor: AppColors.green,
        behavior: SnackBarBehavior.floating));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(e.toString().replaceAll('Exception: ', '')),
        backgroundColor: AppColors.red,
        behavior: SnackBarBehavior.floating));
    } finally {
      if (mounted) setState(() => _confirming = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user   = context.watch<AuthProvider>().user;
    final ws     = context.watch<WebSocketService>();
    final school = user?.school;
    final maxP   = school?.totalStudents ?? 9999;
    final n      = int.tryParse(_portionsCtrl.text) ?? 0;
    final pct    = maxP > 0 ? (n / maxP * 100).clamp(0.0, 100.0) : 0.0;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: const MbgLogo(size: 28),
        actions: [
          // WS indicator
          Container(
            margin: const EdgeInsets.only(right: 4),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: ws.isConnected
                ? const Color(0x1027AE60) : const Color(0x10E74C3C),
              borderRadius: BorderRadius.circular(8)),
            child: Icon(ws.isConnected ? Icons.wifi : Icons.wifi_off,
              size: 14,
              color: ws.isConnected ? AppColors.green : AppColors.slate400)),
          Padding(padding: const EdgeInsets.only(right: 4),
            child: Column(mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text(school?.name ?? (user?.name ?? ''),
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600,
                  color: AppColors.slate800),
                overflow: TextOverflow.ellipsis),
              const Text('Sekolah',
                style: TextStyle(fontSize: 11, color: AppColors.primary,
                  fontWeight: FontWeight.w500)),
            ])),
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: AppColors.slate400, size: 20),
            onPressed: () async {
              context.read<WebSocketService>().removeMessageListener(_onWsMessage);
              await context.read<AuthProvider>().logout();
              if (!mounted) return;
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const LoginScreen()), (_) => false);
            }),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadOrder,
        color: AppColors.primary,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(child: Column(children: [
              // Hero card
              Container(
                margin: const EdgeInsets.all(16),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.primary, AppColors.primaryDark],
                    begin: Alignment.topLeft, end: Alignment.bottomRight),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: const [BoxShadow(
                    color: Color(0x4D5DADE2), blurRadius: 20, offset: Offset(0,8))]),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Row(children: [
                    Icon(Icons.school_outlined, color: Color(0xB3FFFFFF), size: 14),
                    SizedBox(width: 6),
                    Text('Sekolah Terdaftar',
                      style: TextStyle(color: Color(0xB3FFFFFF), fontSize: 12, fontWeight: FontWeight.w500)),
                  ]),
                  const SizedBox(height: 6),
                  Text(school?.name ?? '-',
                    style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Text(school?.address ?? '-',
                    style: const TextStyle(color: Color(0xB3FFFFFF), fontSize: 12),
                    maxLines: 2, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 16),
                  Row(children: [
                    Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('Maks. Porsi/Hari',
                        style: TextStyle(color: Color(0xB3FFFFFF), fontSize: 11)),
                      Text(_fmt(maxP),
                        style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w800)),
                    ]),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0x33FFFFFF), borderRadius: BorderRadius.circular(8)),
                      child: Row(children: [
                        Container(width: 5, height: 5, decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: ws.isConnected ? AppColors.green : Colors.white.withAlpha(128))),
                        const SizedBox(width: 5),
                        Text(ws.isConnected ? 'Live Update' : 'Offline',
                          style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
                      ])),
                  ]),
                ]),
              ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.1, end: 0),

              // Form Permintaan
              _Card(title: 'Form Permintaan Harian', icon: Icons.people_outline, delay: 100,
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Jumlah Siswa Hadir (Maks: ${_fmt(maxP)})',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.slate600)),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _portionsCtrl,
                    keyboardType: TextInputType.number,
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.slate900),
                    enabled: _todayOrder == null || _todayOrder!.status == 'pending',
                    onChanged: (v) { _validatePortions(v); setState(() {}); },
                    decoration: InputDecoration(
                      hintText: '1 – ${_fmt(maxP)}',
                      hintStyle: const TextStyle(fontSize: 16, color: AppColors.slate300),
                      suffixText: 'siswa',
                      suffixStyle: const TextStyle(fontSize: 14, color: AppColors.slate400),
                      errorText: _portionsError,
                      errorStyle: const TextStyle(fontSize: 12),
                      errorMaxLines: 2)),
                  if (n > 0 && _portionsError == null) ...[
                    const SizedBox(height: 10),
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      Text('Kehadiran: ${pct.round()}%',
                        style: const TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w600)),
                      Text('$n / ${_fmt(maxP)}',
                        style: const TextStyle(fontSize: 12, color: AppColors.slate400)),
                    ]),
                    const SizedBox(height: 6),
                    ClipRRect(borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: pct / 100, minHeight: 6,
                        backgroundColor: AppColors.slate100,
                        valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary))),
                  ],
                  const SizedBox(height: 18),
                  PrimaryButton(
                    text: _todayOrder != null ? 'Perbarui Permintaan' : 'Kirim Permintaan ke Dapur',
                    onPressed: (_todayOrder != null && _todayOrder!.status != 'pending')
                      ? null : (_portionsError != null ? null : _submit),
                    loading: _submitting,
                    icon: Icons.send_outlined),
                  if (_todayOrder != null && _todayOrder!.status != 'pending')
                    const Padding(padding: EdgeInsets.only(top: 8),
                      child: Text('Permintaan sedang diproses dapur.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 12, color: AppColors.slate400))),
                ])),

              // Status Timeline
              _Card(title: 'Status Pengiriman', icon: Icons.local_shipping_outlined, delay: 200,
                child: _loading
                  ? const ShimmerList(count: 2)
                  : _todayOrder == null
                    ? const Padding(padding: EdgeInsets.symmetric(vertical: 16),
                        child: EmptyState(icon: Icons.schedule_outlined,
                          title: 'Belum ada permintaan',
                          subtitle: 'Isi form di atas untuk memulai'))
                    : Column(children: [
                        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                          Expanded(child: DeliveryTimeline(_todayOrder!.status)),
                        ]),
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(color: AppColors.slate50, borderRadius: BorderRadius.circular(12)),
                          child: Column(children: [
                            InfoRow(label: 'Jumlah Porsi',
                              value: '${_fmt(_todayOrder!.portions)} porsi',
                              icon: Icons.people_outline),
                            if (_todayOrder!.courier != null) ...[
                              const Divider(height: 16, color: AppColors.slate100),
                              InfoRow(label: 'Kurir',
                                value: _todayOrder!.courier!.name, icon: Icons.person_outline),
                            ],
                            const Divider(height: 16, color: AppColors.slate100),
                            InfoRow(label: 'Waktu Order',
                              value: DateFormat('HH:mm').format(_todayOrder!.createdAt.toLocal()),
                              icon: Icons.schedule_outlined),
                            if (ws.isConnected) ...[
                              const Divider(height: 16, color: AppColors.slate100),
                              Row(children: [
                                Container(width: 6, height: 6, decoration: const BoxDecoration(
                                  color: AppColors.green, shape: BoxShape.circle)),
                                const SizedBox(width: 6),
                                const Text('Status diperbarui otomatis',
                                  style: TextStyle(fontSize: 11, color: AppColors.green, fontWeight: FontWeight.w500)),
                              ]),
                            ],
                          ])),

                        if (_todayOrder!.status == 'on_delivery') ...[
                          const SizedBox(height: 16),
                          PrimaryButton(
                            text: 'Konfirmasi Makanan Diterima',
                            onPressed: _confirm, loading: _confirming,
                            icon: Icons.check_circle_outline, color: AppColors.green),
                        ],

                        if (_todayOrder!.status == 'delivered') ...[
                          const SizedBox(height: 14),
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(color: AppColors.greenLight,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: const Color(0x3327AE60))),
                            child: const Row(children: [
                              Icon(Icons.check_circle, color: AppColors.green, size: 24),
                              SizedBox(width: 12),
                              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text('Makanan telah diterima',
                                  style: TextStyle(fontWeight: FontWeight.w700,
                                    color: Color(0xFF166534), fontSize: 14)),
                                Text('Terima kasih telah mengkonfirmasi penerimaan.',
                                  style: TextStyle(fontSize: 12, color: AppColors.green)),
                              ])),
                            ])),
                          // Bukti foto
                          if (_todayOrder!.deliveryProof != null) ...[
                            const SizedBox(height: 12),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(color: AppColors.slate50,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: AppColors.slate200)),
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                const Row(children: [
                                  Icon(Icons.photo_camera, size: 14, color: AppColors.slate500),
                                  SizedBox(width: 6),
                                  Text('Bukti Foto dari Kurir',
                                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.slate600)),
                                ]),
                                const SizedBox(height: 8),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(10),
                                  child: Image.network(
                                    '${ApiService.baseUrl}${_todayOrder!.deliveryProof!.photoUrl}',
                                    height: 160, width: double.infinity, fit: BoxFit.cover,
                                    errorBuilder: (_, __, ___) => Container(
                                      height: 80, color: AppColors.slate100,
                                      child: const Center(child: Icon(Icons.broken_image, color: AppColors.slate300))))),
                                if (_todayOrder!.deliveryProof!.address != null) ...[
                                  const SizedBox(height: 8),
                                  Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                    const Icon(Icons.location_on_outlined, size: 13, color: AppColors.slate400),
                                    const SizedBox(width: 4),
                                    Expanded(child: Text(_todayOrder!.deliveryProof!.address!,
                                      style: const TextStyle(fontSize: 12, color: AppColors.slate500))),
                                  ]),
                                ],
                              ])),
                          ],
                        ],
                      ])),
              const SizedBox(height: 24),
            ])),
          ],
        ),
      ),
    );
  }
}

class _Card extends StatelessWidget {
  final String title; final IconData icon; final Widget child; final int delay;
  const _Card({required this.title, required this.icon, required this.child, this.delay = 0});

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20),
      border: Border.all(color: AppColors.slate100),
      boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 10)]),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Icon(icon, size: 16, color: AppColors.primary),
        const SizedBox(width: 8),
        Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.slate800)),
      ]),
      const SizedBox(height: 16),
      child,
    ]),
  ).animate().fadeIn(delay: delay.ms, duration: 400.ms).slideY(begin: 0.08, end: 0);
}
