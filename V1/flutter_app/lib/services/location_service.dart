import 'dart:math';
import 'package:flutter/foundation.dart' show defaultTargetPlatform, TargetPlatform;
import 'package:geolocator/geolocator.dart';
import '../config.dart';

enum TipoVerificacion { gps, ip }

class LocationService {
  /// En escritorio (Windows/Linux) usamos verificación por IP en el backend.
  /// En macOS/Android/iOS usamos GPS.
  static TipoVerificacion getTipoVerificacion() {
    final p = defaultTargetPlatform;
    if (p == TargetPlatform.windows || p == TargetPlatform.linux) {
      return TipoVerificacion.ip;
    }
    return TipoVerificacion.gps;
  }

  static bool esEscritorio() =>
      getTipoVerificacion() == TipoVerificacion.ip;

  /// Solo llamar si !esEscritorio()
  static Future<Position> obtenerPosicion() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw Exception('El servicio de ubicación está desactivado.');
    }

    LocationPermission permiso = await Geolocator.checkPermission();
    if (permiso == LocationPermission.denied) {
      permiso = await Geolocator.requestPermission();
    }
    if (permiso == LocationPermission.denied ||
        permiso == LocationPermission.deniedForever) {
      throw Exception('Permiso de ubicación denegado.');
    }

    return Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );
  }

  static bool estaEnEmpresa(double lat, double lon) {
    final d = _haversineMetros(
      lat, lon, AppConfig.empresaLat, AppConfig.empresaLon,
    );
    return d <= AppConfig.radioMetros;
  }

  static double _haversineMetros(
      double lat1, double lon1, double lat2, double lon2) {
    const R = 6371000.0;
    final dLat = _rad(lat2 - lat1);
    final dLon = _rad(lon2 - lon1);
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_rad(lat1)) * cos(_rad(lat2)) *
        sin(dLon / 2) * sin(dLon / 2);
    return R * 2 * atan2(sqrt(a), sqrt(1 - a));
  }

  static double _rad(double deg) => deg * pi / 180;
}
