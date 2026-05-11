import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/shared_widgets.dart';

class AdminInboundTab extends StatefulWidget {
  const AdminInboundTab({super.key});
  @override
  State<AdminInboundTab> createState() => _AdminInboundTabState();
}

class _AdminInboundTabState extends State<AdminInboundTab> {
  final _nameCtrl = TextEditingController();
  final _qtyCtrl  = TextEditingController();
  final _noteCtrl = TextEditingController();
  String _unit    = 'kg';
  bool   _loading = false;
  String? _success;

  static const _units = ['kg', 'liter', 'pack', 'karung', 'buah', 'ikat', 'gram'];

  @override
  void dispose() {
    _nameCtrl.dispose();
    _qtyCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final name = _nameCtrl.text.trim();
    final qty  = double.tryParse(_qtyCtrl.text.trim());

    if (name.isEmpty) {
      _snack('Nama bahan tidak boleh kosong', isError: true); return;
    }
    if (qty == null || qty <= 0) {
      _snack('Jumlah harus angka positif', isError: true); return;
    }

    setState(() { _loading = true; _success = null; });
    try {
      await ApiService.addStock(name, qty, _unit, _noteCtrl.text.trim());
      if (!mounted) return;
      setState(() => _success = 'Stok "$name" berhasil ditambahkan.');
      _nameCtrl.clear();
      _qtyCtrl.clear();
      _noteCtrl.clear();
      Future.delayed(const Duration(seconds: 4), () {
        if (mounted) setState(() => _success = null);
      });
    } catch (e) {
      if (!mounted) return;
      _snack(e.toString().replaceAll('Exception: ', ''), isError: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _snack(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: isError ? AppColors.red : AppColors.green,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      margin: const EdgeInsets.all(16),
    ));
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const SectionHeader('Catat Stok Bahan Masuk'),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.slate100),
            boxShadow: const [BoxShadow(color: Color(0x0A000000), blurRadius: 12)],
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            // Success banner
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 300),
              child: _success != null
                ? Container(
                    key: const ValueKey('success'),
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.greenLight,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0x4D27AE60)),
                    ),
                    child: Row(children: [
                      const Icon(Icons.check_circle, color: AppColors.green, size: 16),
                      const SizedBox(width: 8),
                      Expanded(child: Text(_success!,
                        style: const TextStyle(color: AppColors.green, fontSize: 13, fontWeight: FontWeight.w500))),
                    ]),
                  )
                : const SizedBox.shrink(key: ValueKey('empty')),
            ),

            _Label('Nama Bahan'),
            const SizedBox(height: 8),
            TextField(
              controller: _nameCtrl,
              decoration: const InputDecoration(
                hintText: 'cth: Beras, Ayam Potong, Sayuran',
                prefixIcon: Icon(Icons.inventory_outlined, size: 18, color: AppColors.slate400),
              ),
            ),
            const SizedBox(height: 16),

            Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                _Label('Jumlah'),
                const SizedBox(height: 8),
                TextField(
                  controller: _qtyCtrl,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(hintText: '0'),
                ),
              ])),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                _Label('Satuan'),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(color: AppColors.slate200),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _unit,
                      isExpanded: true,
                      items: _units.map((u) => DropdownMenuItem(
                        value: u, child: Text(u, style: const TextStyle(fontSize: 14)))).toList(),
                      onChanged: (v) { if (v != null) setState(() => _unit = v); },
                    ),
                  ),
                ),
              ])),
            ]),

            const SizedBox(height: 16),
            _Label('Catatan (opsional)'),
            const SizedBox(height: 8),
            TextField(
              controller: _noteCtrl,
              decoration: const InputDecoration(
                hintText: 'cth: Pengiriman dari Bulog',
                prefixIcon: Icon(Icons.notes_outlined, size: 18, color: AppColors.slate400),
              ),
            ),
            const SizedBox(height: 24),
            PrimaryButton(
              text: 'Tambahkan Stok',
              onPressed: _submit,
              loading: _loading,
              icon: Icons.add,
            ),
          ]),
        ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.1, end: 0),
      ]),
    );
  }
}

class _Label extends StatelessWidget {
  final String text;
  const _Label(this.text);
  @override
  Widget build(BuildContext context) => Text(text,
    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.slate600));
}
