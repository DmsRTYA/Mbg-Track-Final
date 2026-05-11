import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';
import 'api_service.dart';

class AuthProvider extends ChangeNotifier {
  User? _user;
  bool _loading = false;
  String? _error;

  User? get user => _user;
  bool get loading => _loading;
  String? get error => _error;
  bool get isLoggedIn => _user != null;

  Future<void> loadSession() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = prefs.getString('mbg_session');
      if (json != null && json.isNotEmpty) {
        final decoded = jsonDecode(json);
        if (decoded is Map<String, dynamic>) {
          _user = User.fromJson(decoded);
          notifyListeners();
        }
      }
    } catch (e) {
      // Sesi rusak — hapus dan mulai dari awal
      try {
        final prefs = await SharedPreferences.getInstance();
        await prefs.remove('mbg_session');
      } catch (_) {}
      _user = null;
    }
  }

  Future<bool> login(String email, String password) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      _user = await ApiService.login(email, password);
      await _saveSession();
      _loading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceAll('Exception: ', '');
      _user = null;
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('mbg_session');
    } catch (_) {}
    _user = null;
    _error = null;
    notifyListeners();
  }

  Future<void> _saveSession() async {
    if (_user == null) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final sessionMap = <String, dynamic>{
        'id': _user!.id,
        'name': _user!.name,
        'email': _user!.email,
        'role': _user!.role,
      };
      if (_user!.school != null) {
        sessionMap['school'] = {
          'id': _user!.school!.id,
          'name': _user!.school!.name,
          'address': _user!.school!.address,
          'principalName': _user!.school!.principalName,
          'totalStudents': _user!.school!.totalStudents,
        };
      }
      if (_user!.courier != null) {
        sessionMap['courier'] = {
          'id': _user!.courier!.id,
          'name': _user!.courier!.name,
          'phone': _user!.courier!.phone,
        };
      }
      await prefs.setString('mbg_session', jsonEncode(sessionMap));
    } catch (_) {}
  }
}
