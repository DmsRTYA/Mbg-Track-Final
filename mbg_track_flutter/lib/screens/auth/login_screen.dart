import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';
import '../../services/auth_provider.dart';
import '../../theme/app_theme.dart';
import '../../widgets/shared_widgets.dart';
import '../admin/admin_home.dart';
import '../school/school_home.dart';
import '../courier/courier_home.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl    = TextEditingController();
  final _passCtrl     = TextEditingController();
  final _formKey      = GlobalKey<FormState>();
  bool  _obscure      = true;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final auth = context.read<AuthProvider>();
    final ok   = await auth.login(_emailCtrl.text.trim(), _passCtrl.text);
    if (!mounted) return;
    if (ok) {
      final role = auth.user?.role ?? '';
      Widget dest;
      if (role == 'admin')        dest = const AdminHome();
      else if (role == 'school')  dest = const SchoolHome();
      else                        dest = const CourierHome();

      Navigator.of(context).pushAndRemoveUntil(
        PageRouteBuilder(
          pageBuilder: (_, a, __) => dest,
          transitionsBuilder: (_, a, __, child) => FadeTransition(opacity: a, child: child),
          transitionDuration: const Duration(milliseconds: 350),
        ),
        (_) => false,
      );
    } else {
      _showError(auth.error ?? 'Login gagal. Coba lagi.');
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: AppColors.red,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      margin: const EdgeInsets.all(16),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Scaffold(
      body: Stack(children: [
        // Background gradient
        Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Color(0xFFEBF5FB), Color(0xFFF8FAFC), Color(0xFFF0F9FF)],
            ),
          ),
        ),
        // Decorative blobs — pakai warna const
        const Positioned(top: -80, right: -80, child: _DecorBlob(size: 280, opacity: 0x0F)),
        const Positioned(bottom: -100, left: -60, child: _DecorBlob(size: 240, opacity: 0x0A)),

        SafeArea(child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(children: [
              const SizedBox(height: 56),

              // Logo
              const MbgLogo(size: 48)
                .animate().fadeIn(delay: 100.ms, duration: 500.ms).slideY(begin: -0.3, end: 0),
              const SizedBox(height: 10),
              const Text(
                'Program Makan Bergizi Gratis',
                style: TextStyle(fontSize: 12, color: AppColors.slate400, fontWeight: FontWeight.w500),
              ).animate().fadeIn(delay: 200.ms),

              const SizedBox(height: 40),

              // Login Card
              Container(
                padding: const EdgeInsets.all(28),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: const [
                    BoxShadow(color: Color(0x1A5DADE2), blurRadius: 30, offset: Offset(0, 12)),
                  ],
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Masuk ke Sistem',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.slate900)),
                  const SizedBox(height: 4),
                  const Text('MBG-Track Supply Chain Management',
                    style: TextStyle(fontSize: 13, color: AppColors.slate400)),
                  const SizedBox(height: 28),

                  // Email field
                  const Text('Alamat Email',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.slate600)),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _emailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    autocorrect: false,
                    decoration: const InputDecoration(
                      hintText: 'email@mbg.go.id',
                      prefixIcon: Icon(Icons.email_outlined, size: 20, color: AppColors.slate400),
                    ),
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) return 'Email tidak boleh kosong';
                      if (!v.contains('@')) return 'Format email tidak valid';
                      return null;
                    },
                  ),

                  const SizedBox(height: 16),

                  // Password field
                  const Text('Password',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.slate600)),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _passCtrl,
                    obscureText: _obscure,
                    textInputAction: TextInputAction.done,
                    onFieldSubmitted: (_) => _login(),
                    decoration: InputDecoration(
                      hintText: 'Masukkan password',
                      prefixIcon: const Icon(Icons.lock_outline, size: 20, color: AppColors.slate400),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                          size: 20, color: AppColors.slate400,
                        ),
                        onPressed: () => setState(() => _obscure = !_obscure),
                      ),
                    ),
                    validator: (v) {
                      if (v == null || v.isEmpty) return 'Password tidak boleh kosong';
                      return null;
                    },
                  ),

                  const SizedBox(height: 28),
                  PrimaryButton(
                    text: 'Masuk ke Dashboard',
                    onPressed: _login,
                    loading: auth.loading,
                    icon: Icons.arrow_forward,
                  ),
                ]),
              ).animate().fadeIn(delay: 300.ms, duration: 500.ms).slideY(begin: 0.2, end: 0),

              const SizedBox(height: 32),
              const Text(
                'Sistem Informasi Rantai Pasokan Dapur Umum MBG',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 11, color: AppColors.slate400),
              ).animate().fadeIn(delay: 500.ms),
              const SizedBox(height: 32),
            ]),
          ),
        )),
      ]),
    );
  }
}

// Dekorasi blob — pakai const agar aman di release
class _DecorBlob extends StatelessWidget {
  final double size;
  final int opacity;
  const _DecorBlob({required this.size, required this.opacity});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size, height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Color.fromARGB(opacity, 93, 173, 226),
      ),
    );
  }
}
