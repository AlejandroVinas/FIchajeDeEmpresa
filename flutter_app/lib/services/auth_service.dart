import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import '../config.dart';

class AuthService {
  static const _storage = FlutterSecureStorage();

  static Future<Map<String, dynamic>> login(
      String email, String password) async {
    final res = await http.post(
      Uri.parse('${AppConfig.apiUrl}/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode == 200) {
      await _storage.write(key: 'token',  value: data['token']);
      await _storage.write(key: 'nombre', value: data['nombre']);
      return data;
    }
    throw Exception(data['error'] ?? 'Error de autenticación');
  }

  static Future<String?> getToken()  => _storage.read(key: 'token');
  static Future<String?> getNombre() => _storage.read(key: 'nombre');

  /// Extrae el empleado_id del payload del JWT sin verificar la firma.
  static Future<int?> getEmpleadoId() async {
    final token = await getToken();
    if (token == null) return null;
    try {
      final parts   = token.split('.');
      if (parts.length != 3) return null;
      final payload = utf8.decode(
        base64Url.decode(base64Url.normalize(parts[1])),
      );
      final map = jsonDecode(payload) as Map<String, dynamic>;
      return map['id'] as int?;
    } catch (_) {
      return null;
    }
  }

  /// Devuelve true si el JWT guardado ha expirado o no existe.
  static Future<bool> tokenExpirado() async {
    final token = await getToken();
    if (token == null) return true;
    try {
      final parts   = token.split('.');
      if (parts.length != 3) return true;
      final payload = utf8.decode(
        base64Url.decode(base64Url.normalize(parts[1])),
      );
      final map = jsonDecode(payload) as Map<String, dynamic>;
      final exp = map['exp'] as int?;
      if (exp == null) return false;
      return DateTime.now().isAfter(
        DateTime.fromMillisecondsSinceEpoch(exp * 1000),
      );
    } catch (_) {
      return true;
    }
  }

  static Future<void> logout() => _storage.deleteAll();
}
