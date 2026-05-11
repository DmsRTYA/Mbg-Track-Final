import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_provider.dart';
import '../../services/websocket_service.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/shared_widgets.dart';
import '../auth/login_screen.dart';
import 'admin_orders_tab.dart';
import 'admin_inbound_tab.dart';
import 'admin_inventory_tab.dart';

class AdminHome extends StatefulWidget {
  const AdminHome({super.key});
  @override
  State<AdminHome> createState() => _AdminHomeState();
}

class _AdminHomeState extends State<AdminHome> {
  int _tab = 0;

  static const _tabs = [
    AdminOrdersTab(),
    AdminInboundTab(),
    AdminInventoryTab(),
  ];

  static const _tabDefs = [
    _TabDef('Pesanan',    Icons.receipt_long_outlined),
    _TabDef('Stok Masuk', Icons.warehouse_outlined),
    _TabDef('Inventaris', Icons.inventory_2_outlined),
  ];

  @override
  void initState() {
    super.initState();
    // Connect WebSocket setelah frame pertama
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      final ws   = context.read<WebSocketService>();
      if (auth.user != null && !ws.isConnected) {
        ws.connect(auth.user!.id, auth.user!.role, ApiService.baseUrl);
      }
    });
  }

  Future<void> _logout() async {
    context.read<WebSocketService>().dispose();
    await context.read<AuthProvider>().logout();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()), (_) => false);
  }

  @override
  Widget build(BuildContext context) {
    final user = context.read<AuthProvider>().user;
    final ws   = context.watch<WebSocketService>();

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: const MbgLogo(size: 30),
        actions: [
          // WS indicator
          Container(
            margin: const EdgeInsets.only(right: 4),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: ws.isConnected
                ? const Color(0x1027AE60) : const Color(0x10E74C3C),
              borderRadius: BorderRadius.circular(8)),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Container(width: 5, height: 5, decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: ws.isConnected ? AppColors.green : AppColors.slate400)),
              const SizedBox(width: 4),
              Text(
                ws.isConnected ? 'Live' : ws.isReconnecting ? '...' : 'Off',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
                  color: ws.isConnected ? AppColors.green : AppColors.slate400)),
            ])),
          if (user != null)
            Padding(padding: const EdgeInsets.only(right: 4),
              child: Column(mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text(user.name,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600,
                    color: AppColors.slate800),
                  overflow: TextOverflow.ellipsis),
                const Text('Admin Dapur MBG',
                  style: TextStyle(fontSize: 11, color: AppColors.primary,
                    fontWeight: FontWeight.w500)),
              ])),
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: AppColors.slate400, size: 20),
            onPressed: _logout, tooltip: 'Keluar'),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(54),
          child: Container(
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: AppColors.slate100))),
            child: Row(
              children: List.generate(_tabDefs.length, _buildTabBtn)),
          ),
        ),
      ),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 280),
        child: KeyedSubtree(key: ValueKey(_tab), child: _tabs[_tab]),
      ),
    );
  }

  Widget _buildTabBtn(int i) {
    final active = _tab == i;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _tab = i),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(
              color: active ? AppColors.primary : Colors.transparent,
              width: 2.5))),
          child: Column(children: [
            Icon(_tabDefs[i].icon, size: 18,
              color: active ? AppColors.primary : AppColors.slate400),
            const SizedBox(height: 3),
            Text(_tabDefs[i].label,
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600,
                color: active ? AppColors.primary : AppColors.slate400)),
          ]),
        ),
      ),
    );
  }
}

class _TabDef {
  final String label; final IconData icon;
  const _TabDef(this.label, this.icon);
}
