import 'dart:convert';
import 'package:flutter/foundation.dart' show defaultTargetPlatform, TargetPlatform;
import 'package:http/http.dart' as http;
import 'auth_service.dart';
import 'key_service.dart';
import '../config.dart';

class FichajeService {
  static String _getPlataforma() {
    switch (defaultTargetPlatform) {
      case TargetPlatform.android: return 'android';
      case TargetPlatform.iOS:     return 'ios';
      case TargetPlatform.windows: return 'desktop';
      case TargetPlatform.linux:   return 'desktop';
      case TargetPlatform.macOS:   return 'macos';
      default:                     return 'mobile';
    }
  }

  static Future<Map<String, dynamic>> fichar(
      String tipo, {double? lat, double? lon}) async {
    final token      = await AuthService.getToken();
    final empleadoId = await AuthService.getEmpleadoId();

    // Timestamp generado por el cliente (se incluye en la firma)
    final timestamp = DateTime.now().toUtc().toIso8601String();

    // Firmar el fichaje con la clave privada del dispositivo
    String? firma;
    if (empleadoId != null) {
      try {
        firma = await KeyService.firmarFichaje(
          empleadoId: empleadoId,
          tipo:       tipo,
          timestamp:  timestamp,
          lat:        lat,
          lon:        lon,
        );
      } catch (_) {
        // Si falla la firma se envía sin ella; el backend lo registra con firma_valida = null
      }
    }

    final body = <String, dynamic>{
      'tipo':       tipo,
      'timestamp':  timestamp,
      'plataforma': _getPlataforma(),
      if (lat  != null) 'lat':  lat,
      if (lon  != null) 'lon':  lon,
      if (firma != null) 'firma': firma,
    };

    final res = await http.post(
      Uri.parse('${AppConfig.apiUrl}/fichajes'),
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(body),
    );

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode == 201) return data;
    if (res.statusCode == 401) throw TokenExpiradoException();
    throw Exception(data['error'] ?? 'Error al fichar');
  }
}

class TokenExpiradoException implements Exception {}
