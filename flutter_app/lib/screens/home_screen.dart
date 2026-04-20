import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../services/location_service.dart';
import '../services/fichaje_service.dart';
import 'login_screen.dart';
import 'key_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String? _nombre;
  bool    _cargando     = false;
  String? _mensaje;
  bool    _esError      = false;
  final bool _esEscritorio = LocationService.esEscritorio();

  @override
  void initState() {
    super.initState();
    AuthService.getNombre().then((n) => setState(() => _nombre = n));
    _verificarToken();
  }

  Future<void> _verificarToken() async {
    if (await AuthService.tokenExpirado()) _irALogin();
  }

  Future<void> _fichar(String tipo) async {
    setState(() { _cargando = true; _mensaje = null; });
    try {
      Map<String, dynamic> resultado;

      if (_esEscritorio) {
        resultado = await FichajeService.fichar(tipo);
      } else {
        final pos = await LocationService.obtenerPosicion();
        if (!LocationService.estaEnEmpresa(pos.latitude, pos.longitude)) {
          setState(() {
            _esError = true;
            _mensaje = 'No estás en la ubicación de la empresa.';
          });
          return;
        }
        resultado = await FichajeService.fichar(
          tipo, lat: pos.latitude, lon: pos.longitude,
        );
      }

      setState(() {
        _esError = false;
        _mensaje =
            '${tipo == "entrada" ? "Entrada" : "Salida"} registrada\n'
            '${resultado['timestamp']}';
      });
    } on TokenExpiradoException {
      await AuthService.logout();
      _irALogin();
    } catch (e) {
      setState(() {
        _esError = true;
        _mensaje = e.toString().replaceAll('Exception: ', '');
      });
    } finally {
      setState(() => _cargando = false);
    }
  }

  void _irALogin() {
    if (!mounted) return;
    Navigator.pushReplacement(
        context, MaterialPageRoute(builder: (_) => const LoginScreen()));
  }

  Future<void> _logout() async {
    await AuthService.logout();
    _irALogin();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Hola, ${_nombre ?? ''}'),
        actions: [
          IconButton(
            onPressed: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => const KeyScreen())),
            icon: const Icon(Icons.key),
            tooltip: 'Mi clave pública',
          ),
          IconButton(
            onPressed: _logout,
            icon: const Icon(Icons.logout),
            tooltip: 'Cerrar sesión',
          ),
        ],
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (_esEscritorio)
                Container(
                  margin: const EdgeInsets.only(bottom: 20),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.indigo.shade50,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    '🖥️  Modo escritorio: verificación por red de empresa',
                    style: TextStyle(fontSize: 13, color: Colors.indigo),
                  ),
                ),
              if (_cargando) const CircularProgressIndicator(),
              if (_mensaje != null && !_cargando) ...[
                Icon(
                  _esError ? Icons.error_outline : Icons.check_circle_outline,
                  color: _esError ? Colors.red : Colors.green,
                  size: 64,
                ),
                const SizedBox(height: 12),
                Text(_mensaje!,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        fontSize: 16,
                        color: _esError ? Colors.red : Colors.green)),
                const SizedBox(height: 32),
              ],
              if (!_cargando) ...[
                FilledButton.icon(
                  onPressed: () => _fichar('entrada'),
                  icon: const Icon(Icons.login),
                  label: const Text('Registrar Entrada'),
                  style: FilledButton.styleFrom(
                      backgroundColor: Colors.green,
                      minimumSize: const Size(220, 52)),
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: () => _fichar('salida'),
                  icon: const Icon(Icons.logout),
                  label: const Text('Registrar Salida'),
                  style: FilledButton.styleFrom(
                      backgroundColor: Colors.red,
                      minimumSize: const Size(220, 52)),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
