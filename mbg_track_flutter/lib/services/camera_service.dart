// lib/services/camera_service.dart
import 'dart:convert';
import 'dart:io';
import 'package:image_picker/image_picker.dart';
import 'package:flutter/material.dart';

class CameraService {
  static final _picker = ImagePicker();

  /// Ambil foto dari kamera
  static Future<File?> takePhoto({int quality = 85}) async {
    try {
      final XFile? xfile = await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: quality,
        preferredCameraDevice: CameraDevice.rear,
        maxWidth: 1280,
        maxHeight: 960,
      );
      if (xfile == null) return null;
      return File(xfile.path);
    } catch (e) {
      debugPrint('[Camera] Error: $e');
      return null;
    }
  }

  /// Ambil foto dari galeri
  static Future<File?> pickFromGallery({int quality = 85}) async {
    try {
      final XFile? xfile = await _picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: quality,
        maxWidth: 1280,
        maxHeight: 960,
      );
      if (xfile == null) return null;
      return File(xfile.path);
    } catch (e) {
      debugPrint('[Gallery] Error: $e');
      return null;
    }
  }

  /// Konversi file ke base64
  static Future<String?> fileToBase64(File file) async {
    try {
      final bytes = await file.readAsBytes();
      return 'data:image/jpeg;base64,${base64Encode(bytes)}';
    } catch (_) {
      return null;
    }
  }

  /// Ukuran file dalam KB
  static Future<int> fileSizeKB(File file) async {
    try {
      final stat = await file.stat();
      return (stat.size / 1024).round();
    } catch (_) {
      return 0;
    }
  }
}
