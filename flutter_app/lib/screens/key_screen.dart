import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/key_service.dart';

class KeyScreen extends StatefulWidget {
  const KeyScreen({super.key});
  @override
  State<KeyScreen> createState() => _KeyScreenState();
}

class _KeyScreenState extends State<KeyScreen> {
  String? _pubKey;
  bool    _copiado = false;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    final key = await KeyService.getPublicKeyBase64();
    setState(() => _pubKey = key);
  }

  Future<void> _copiar() async {
    if (_pubKey == null) return;
    await Clipboard.setData(ClipboardData(text: _pubKey!));
    setState(() => _copiado = true);
    await Future.delayed(const Duration(seconds: 2));
    if (mounted) setState(() => _copiado = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mi clave pública')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Comparte esta clave con el administrador.\n'
              'Deberá pegarla al crear tu cuenta de empleado.',
              style: TextStyle(fontSize: 14, color: Colors.black54),
            ),
            const SizedBox(height: 24),
            if (_pubKey == null)
              const Center(child: CircularProgressIndicator())
            else ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: SelectableText(
                  _pubKey!,
                  style: const TextStyle(fontFamily: 'monospace', fontSize: 13),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _copiar,
                  icon: Icon(_copiado ? Icons.check : Icons.copy),
                  label: Text(_copiado ? 'Copiada' : 'Copiar clave'),
                  style: FilledButton.styleFrom(
                    backgroundColor: _copiado ? Colors.green : null,
                  ),
                ),
              ),
            ],
            const Spacer(),
            const Divider(),
            const SizedBox(height: 8),
            const Text('¿Cambiaste de dispositivo?',
                style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            const Text(
              'Si cambias de móvil deberás generar nuevas claves '
              'y comunicarle la nueva clave pública al administrador.',
              style: TextStyle(fontSize: 13, color: Colors.black54),
            ),
          ],
        ),
      ),
    );
  }
}
