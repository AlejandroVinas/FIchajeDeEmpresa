import 'package:flutter/material.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'services/auth_service.dart';
import 'services/key_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await KeyService.inicializar(); // genera claves Ed25519 si no existen
  runApp(const FichajeApp());
}

class FichajeApp extends StatelessWidget {
  const FichajeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Fichaje',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
          useMaterial3: true),
      home: const _AuthGate(),
    );
  }
}

class _AuthGate extends StatelessWidget {
  const _AuthGate();

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<String?>(
      future: AuthService.getToken(),
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting)
          return const Scaffold(
              body: Center(child: CircularProgressIndicator()));
        return snap.data != null ? const HomeScreen() : const LoginScreen();
      },
    );
  }
}
