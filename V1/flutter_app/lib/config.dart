class AppConfig {
  // ← Cambia por la IP/dominio real del servidor
  static const String apiUrl = 'http://192.168.1.100:3000';

  // Deben coincidir exactamente con los valores en .env del backend
  static const double empresaLat  = 40.416775;
  static const double empresaLon  = -3.703790;
  static const double radioMetros = 100;
}
