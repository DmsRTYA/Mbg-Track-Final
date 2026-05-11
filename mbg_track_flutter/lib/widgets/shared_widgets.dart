// lib/widgets/shared_widgets.dart
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:shimmer/shimmer.dart';
import '../theme/app_theme.dart';

// ── MBG Logo ──────────────────────────────────────────────────────────────────
class MbgLogo extends StatelessWidget {
  final double size;
  final bool showText;
  const MbgLogo({super.key, this.size = 36, this.showText = true});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Image.asset(
          'assets/logo-bgn.png',
          width: size,
          height: size,
          fit: BoxFit.contain,
        ),
        if (showText) ...[
          const SizedBox(width: 10),
          RichText(
            text: TextSpan(
              style: TextStyle(
                fontSize: size * 0.5,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.5,
              ),
              children: const [
                TextSpan(text: 'MBG', style: TextStyle(color: AppColors.slate900)),
                TextSpan(text: '-Track', style: TextStyle(color: AppColors.primary)),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

// ── Status Badge ──────────────────────────────────────────────────────────────
class StatusBadge extends StatelessWidget {
  final String status;
  const StatusBadge(this.status, {super.key});

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    IconData icon;
    String label;

    switch (status) {
      case 'pending':
        bg = AppColors.slate100; fg = AppColors.slate500;
        icon = Icons.schedule_outlined; label = 'Menunggu Dapur';
        break;
      case 'cooking':
        bg = AppColors.amberLight; fg = const Color(0xFFB45309);
        icon = Icons.local_fire_department_outlined; label = 'Sedang Dimasak';
        break;
      case 'on_delivery':
        bg = AppColors.primaryPale; fg = AppColors.primaryDark;
        icon = Icons.local_shipping_outlined; label = 'Dalam Perjalanan';
        break;
      case 'delivered':
        bg = AppColors.greenLight; fg = const Color(0xFF166534);
        icon = Icons.check_circle_outline; label = 'Telah Diterima';
        break;
      default:
        bg = AppColors.slate100; fg = AppColors.slate500;
        icon = Icons.help_outline; label = status;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        Icon(icon, size: 12, color: fg),
        const SizedBox(width: 5),
        Text(label, style: TextStyle(color: fg, fontSize: 11, fontWeight: FontWeight.w600)),
      ]),
    );
  }
}

// ── Delivery Timeline ─────────────────────────────────────────────────────────
class DeliveryTimeline extends StatelessWidget {
  final String status;
  const DeliveryTimeline(this.status, {super.key});

  static const _steps = [
    _TimelineStep(Icons.schedule_outlined,       'Menunggu Dapur',    'Permintaan diterima'),
    _TimelineStep(Icons.local_fire_department_outlined, 'Sedang Dimasak', 'Dapur memproses'),
    _TimelineStep(Icons.local_shipping_outlined, 'Dalam Perjalanan',  'Kurir mengantar'),
    _TimelineStep(Icons.check_circle_outline,    'Telah Diterima',    'Selesai'),
  ];

  int get _currentIndex {
    switch (status) {
      case 'cooking':     return 1;
      case 'on_delivery': return 2;
      case 'delivered':   return 3;
      default:            return 0;
    }
  }

  @override
  Widget build(BuildContext context) {
    final current = _currentIndex;
    return Row(
      children: List.generate(_steps.length, (i) {
        final done   = i < current;
        final active = i == current;
        return Expanded(
          child: Column(children: [
            Row(children: [
              Expanded(child: Container(
                height: 2,
                color: i > 0 ? (i <= current ? AppColors.primary : AppColors.slate200) : Colors.transparent,
              )),
              AnimatedContainer(
                duration: const Duration(milliseconds: 400),
                width: 36, height: 36,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: done ? AppColors.primary : (active ? Colors.white : AppColors.slate100),
                  border: Border.all(
                    color: (done || active) ? AppColors.primary : AppColors.slate200,
                    width: active ? 2.5 : 1.5,
                  ),
                ),
                child: Icon(
                  _steps[i].icon,
                  size: 16,
                  color: done ? Colors.white : (active ? AppColors.primary : AppColors.slate400),
                ),
              ),
              Expanded(child: Container(
                height: 2,
                color: i < _steps.length - 1 ? (i < current ? AppColors.primary : AppColors.slate200) : Colors.transparent,
              )),
            ]),
            const SizedBox(height: 8),
            Text(
              _steps[i].label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: active ? AppColors.primary : (done ? AppColors.slate700 : AppColors.slate400),
              ),
            ),
          ]),
        );
      }),
    );
  }
}

class _TimelineStep {
  final IconData icon;
  final String label;
  final String sub;
  const _TimelineStep(this.icon, this.label, this.sub);
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
class StatCard extends StatelessWidget {
  final String label;
  final String value;
  final String? sub;
  final IconData icon;
  final Color color;

  const StatCard({
    super.key,
    required this.label,
    required this.value,
    this.sub,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.slate100),
        boxShadow: const [
          BoxShadow(color: Color(0x0A000000), blurRadius: 8, offset: Offset(0, 2)),
        ],
      ),
      child: Row(children: [
        Container(
          width: 44, height: 44,
          decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(12)),
          child: Icon(icon, color: Colors.white, size: 22),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.slate900, height: 1.1)),
          Text(label, style: const TextStyle(fontSize: 11, color: AppColors.slate500, fontWeight: FontWeight.w500)),
          if (sub != null)
            Text(sub!, style: const TextStyle(fontSize: 10, color: AppColors.slate400)),
        ])),
      ]),
    );
  }
}

// ── Shimmer Loading ───────────────────────────────────────────────────────────
class ShimmerCard extends StatelessWidget {
  const ShimmerCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: AppColors.slate100,
      highlightColor: AppColors.slate50,
      child: Container(
        height: 84,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
      ),
    );
  }
}

class ShimmerList extends StatelessWidget {
  final int count;
  const ShimmerList({super.key, this.count = 4});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(count, (i) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: const ShimmerCard(),
      )),
    );
  }
}

// ── Primary Button ────────────────────────────────────────────────────────────
class PrimaryButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool loading;
  final IconData? icon;
  final Color? color;

  const PrimaryButton({
    super.key,
    required this.text,
    this.onPressed,
    this.loading = false,
    this.icon,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 52,
      child: ElevatedButton(
        onPressed: (loading || onPressed == null) ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: color ?? AppColors.primary,
          disabledBackgroundColor: (color ?? AppColors.primary).withAlpha(153),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          elevation: 0,
        ),
        child: loading
            ? const SizedBox(
                width: 22, height: 22,
                child: CircularProgressIndicator(
                  color: Colors.white, strokeWidth: 2.5),
              )
            : Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                if (icon != null) ...[
                  Icon(icon, size: 18, color: Colors.white),
                  const SizedBox(width: 8),
                ],
                Text(
                  text,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ]),
      ),
    );
  }
}

// ── Empty State ───────────────────────────────────────────────────────────────
class EmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          Container(
            width: 72, height: 72,
            decoration: const BoxDecoration(color: AppColors.slate100, shape: BoxShape.circle),
            child: Icon(icon, color: AppColors.slate300, size: 32),
          ),
          const SizedBox(height: 16),
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.slate500)),
          const SizedBox(height: 6),
          Text(subtitle, style: const TextStyle(fontSize: 13, color: AppColors.slate400), textAlign: TextAlign.center),
        ]),
      ),
    ).animate().fadeIn(duration: 400.ms);
  }
}

// ── Section Header ────────────────────────────────────────────────────────────
class SectionHeader extends StatelessWidget {
  final String title;
  final Widget? trailing;
  const SectionHeader(this.title, {super.key, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(children: [
        Expanded(child: Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.slate700))),
        if (trailing != null) trailing!,
      ]),
    );
  }
}

// ── Info Row ──────────────────────────────────────────────────────────────────
class InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final IconData? icon;

  const InfoRow({super.key, required this.label, required this.value, this.icon});

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      if (icon != null) ...[
        Icon(icon, size: 13, color: AppColors.slate400),
        const SizedBox(width: 6),
      ],
      Text(label, style: const TextStyle(fontSize: 12, color: AppColors.slate400)),
      const Spacer(),
      Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.slate700)),
    ]);
  }
}
