import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'services/auth_provider.dart';
import 'services/notification_service.dart';
import 'services/websocket_service.dart';
import 'theme/app_theme.dart';
import 'screens/auth/login_screen.dart';
import 'screens/admin/admin_home.dart';
import 'screens/school/school_home.dart';
import 'screens/courier/courier_home.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await NotificationService.init();
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp, DeviceOrientation.portraitDown,
  ]);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
  ));
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => WebSocketService()),
      ],
      child: const MbgTrackApp(),
    ),
  );
}

class MbgTrackApp extends StatelessWidget {
  const MbgTrackApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'MBG-Track',
    debugShowCheckedModeBanner: false,
    theme: AppTheme.theme,
    home: const SplashScreen(),
    builder: (context, child) => child ?? const SizedBox(),
  );
}

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double>   _fade;
  late final Animation<double>   _scale;

  @override
  void initState() {
    super.initState();
    _ctrl  = AnimationController(vsync: this, duration: const Duration(milliseconds: 900));
    _fade  = CurvedAnimation(parent: _ctrl, curve: Curves.easeOut);
    _scale = Tween<double>(begin: 0.7, end: 1.0).animate(CurvedAnimation(parent: _ctrl, curve: Curves.elasticOut));
    _ctrl.forward();
    Future.delayed(const Duration(milliseconds: 2000), _navigate);
  }

  Future<void> _navigate() async {
    if (!mounted) return;
    try {
      final auth = context.read<AuthProvider>();
      await auth.loadSession();
      if (!mounted) return;

      Widget dest;
      if (!auth.isLoggedIn)             dest = const LoginScreen();
      else if (auth.user!.role == 'admin')  dest = const AdminHome();
      else if (auth.user!.role == 'school') dest = const SchoolHome();
      else                              dest = const CourierHome();

      if (!mounted) return;
      Navigator.of(context).pushReplacement(PageRouteBuilder(
        pageBuilder: (_, a, __) => dest,
        transitionsBuilder: (_, a, __, child) => FadeTransition(opacity: a, child: child),
        transitionDuration: const Duration(milliseconds: 400),
      ));
    } catch (_) {
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const LoginScreen()));
    }
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: const Color(0xFFEBF5FB),
    body: Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter,
          colors: [Color(0xFFEBF5FB), Color(0xFFF8FAFC), Color(0xFFF0F9FF)])),
      child: Stack(children: [
        const Positioned(top: -60, right: -60, child: _Blob(size: 220, alpha: 0x14)),
        const Positioned(bottom: -80, left: -40, child: _Blob(size: 200, alpha: 0x0A)),
        Center(child: FadeTransition(opacity: _fade, child: ScaleTransition(scale: _scale,
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(width: 96, height: 96,
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(28),
                boxShadow: const [BoxShadow(color: Color(0x595DADE2), blurRadius: 30, offset: Offset(0,12))]),
              child: Padding(
                padding: const EdgeInsets.all(12.0),
                child: Image.asset('assets/logo-bgn.png', fit: BoxFit.contain),
              )),
            const SizedBox(height: 20),
            RichText(text: const TextSpan(
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: -0.5),
              children: [
                TextSpan(text: 'MBG', style: TextStyle(color: AppColors.slate900)),
                TextSpan(text: '-Track', style: TextStyle(color: AppColors.primary)),
              ])),
            const SizedBox(height: 8),
            const Text('Program Makan Bergizi Gratis',
              style: TextStyle(fontSize: 13, color: AppColors.slate400, fontWeight: FontWeight.w500)),
            const SizedBox(height: 52),
            SizedBox(width: 24, height: 24,
              child: CircularProgressIndicator(strokeWidth: 2.5, color: AppColors.primary.withAlpha(128))),
          ])))),
      ]),
    ),
  );
}

class _Blob extends StatelessWidget {
  final double size; final int alpha;
  const _Blob({required this.size, required this.alpha});
  @override
  Widget build(BuildContext ctx) => Container(width: size, height: size,
    decoration: BoxDecoration(shape: BoxShape.circle, color: Color.fromARGB(alpha, 93, 173, 226)));
}
