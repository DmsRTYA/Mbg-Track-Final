import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../models/models.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/shared_widgets.dart';

class AdminInventoryTab extends StatefulWidget {
  const AdminInventoryTab({super.key});
  @override
  State<AdminInventoryTab> createState() => _AdminInventoryTabState();
}

class _AdminInventoryTabState extends State<AdminInventoryTab> {
  List<InventoryItem> _items   = [];
  bool                _loading = true;

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final items = await ApiService.getInventory();
      if (!mounted) return;
      setState(() { _items = items; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _load,
      color: AppColors.primary,
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          const SliverToBoxAdapter(child: Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: SectionHeader('Inventaris Bahan Baku'),
          )),
          if (_loading)
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverToBoxAdapter(child: const ShimmerList()),
            ),
          if (!_loading && _items.isEmpty)
            const SliverFillRemaining(child: EmptyState(
              icon: Icons.inventory_2_outlined,
              title: 'Inventaris kosong',
              subtitle: 'Tambahkan stok melalui tab Stok Masuk',
            )),
          if (!_loading && _items.isNotEmpty)
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
              sliver: SliverList(delegate: SliverChildBuilderDelegate(
                (ctx, i) => _InventoryCard(item: _items[i])
                  .animate()
                  .fadeIn(delay: (i * 45).ms, duration: 280.ms)
                  .slideX(begin: 0.04, end: 0),
                childCount: _items.length,
              )),
            ),
        ],
      ),
    );
  }
}

class _InventoryCard extends StatelessWidget {
  final InventoryItem item;
  const _InventoryCard({required this.item});

  @override
  Widget build(BuildContext context) {
    // Hitung progress bar — max display 300 unit sebagai "penuh"
    final displayMax = item.quantity < 300 ? 300.0 : item.quantity * 1.2;
    final pct = (item.quantity / displayMax).clamp(0.0, 1.0);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: item.isLow
            ? const Color(0x66F39C12)
            : AppColors.slate100,
        ),
        boxShadow: const [
          BoxShadow(color: Color(0x08000000), blurRadius: 6, offset: Offset(0, 2)),
        ],
      ),
      child: Column(children: [
        Row(children: [
          // Icon
          Container(
            width: 42, height: 42,
            decoration: BoxDecoration(
              color: item.isLow ? AppColors.amberLight : AppColors.primaryPale,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              Icons.inventory_outlined,
              color: item.isLow ? AppColors.amber : AppColors.primary,
              size: 20,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(item.name,
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: AppColors.slate900)),
            const SizedBox(height: 4),
            Row(children: [
              Text(
                '${item.quantity.toStringAsFixed(1)} ${item.unit}',
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.slate700),
              ),
              const SizedBox(width: 8),
              // Status badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: item.isLow ? AppColors.amberLight : AppColors.greenLight,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  item.isLow ? 'Stok Menipis' : 'Aman',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: item.isLow ? AppColors.amber : AppColors.green,
                  ),
                ),
              ),
            ]),
          ])),
        ]),
        const SizedBox(height: 12),
        // Progress bar
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: pct,
            minHeight: 5,
            backgroundColor: AppColors.slate100,
            valueColor: AlwaysStoppedAnimation<Color>(
              item.isLow ? AppColors.amber : AppColors.primary,
            ),
          ),
        ),
      ]),
    );
  }
}
