import 'dart:convert';
import 'dart:typed_data';
import 'package:cryptography/cryptography.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class KeyService {
  static const _storage = FlutterSecureStorage();
  static const _kSeed   = 'ed25519_seed';
  static const _kPubKey = 'ed25519_pub';

  static final _algo = Ed25519();

  /// Genera el par de claves si aún no existe. Llamar al arranque de la app.
  static Future<void> inicializar() async {
    final existente = await _storage.read(key: _kSeed);
    if (existente != null) return;

    final keyPair   = await _algo.newKeyPair();
    final pubKey    = await keyPair.extractPublicKey();
    final seedBytes = await keyPair.extractPrivateKeyBytes();

    await _storage.write(key: _kSeed,   value: base64Encode(seedBytes));
    await _storage.write(key: _kPubKey, value: base64Encode(pubKey.bytes));
  }

  static Future<bool> tieneClaves() async =>
      (await _storage.read(key: _kSeed)) != null;

  /// Clave pública en base64 (32 bytes Ed25519). Para compartir con el admin.
  static Future<String> getPublicKeyBase64() async {
    final pub = await _storage.read(key: _kPubKey);
    if (pub == null) throw Exception('Claves no inicializadas');
    return pub;
  }

  /// Firma el payload de un fichaje.
  /// Formato del payload (idéntico al backend):
  ///   "empleadoId|tipo|timestamp|lat|lon"
  static Future<String> firmarFichaje({
    required int    empleadoId,
    required String tipo,
    required String timestamp,
    double? lat,
    double? lon,
  }) async {
    final seedB64 = await _storage.read(key: _kSeed);
    if (seedB64 == null) throw Exception('Claves no inicializadas');

    final seedBytes = base64Decode(seedB64);
    final keyPair   = await _algo.newKeyPairFromSeed(seedBytes);

    final payload = '$empleadoId|$tipo|$timestamp|${lat ?? ''}|${lon ?? ''}';
    final sig     = await _algo.sign(
      Uint8List.fromList(utf8.encode(payload)),
      keyPair: keyPair,
    );

    return base64Encode(sig.bytes);
  }

  /// Borra las claves locales. El admin deberá subir la nueva clave pública.
  static Future<void> resetearClaves() async {
    await _storage.delete(key: _kSeed);
    await _storage.delete(key: _kPubKey);
  }
}
