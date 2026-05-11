// lib/models/models.dart
class User {
  final String id, name, email, role;
  final School? school;
  final Courier? courier;

  const User({
    required this.id, required this.name,
    required this.email, required this.role,
    this.school, this.courier,
  });

  factory User.fromJson(Map<String, dynamic> j) => User(
    id: (j['id'] as String?) ?? '',
    name: (j['name'] as String?) ?? '',
    email: (j['email'] as String?) ?? '',
    role: (j['role'] as String?) ?? '',
    school: j['school'] != null ? School.fromJson(j['school'] as Map<String, dynamic>) : null,
    courier: j['courier'] != null ? Courier.fromJson(j['courier'] as Map<String, dynamic>) : null,
  );
}

class School {
  final String id, name, address, principalName;
  final int totalStudents;

  const School({
    required this.id, required this.name,
    required this.address, required this.principalName,
    required this.totalStudents,
  });

  factory School.fromJson(Map<String, dynamic> j) => School(
    id: (j['id'] as String?) ?? '',
    name: (j['name'] as String?) ?? '',
    address: (j['address'] as String?) ?? '',
    principalName: (j['principalName'] as String?) ?? '',
    totalStudents: (j['totalStudents'] as int?) ?? 0,
  );
}

class Courier {
  final String id, name, phone;

  const Courier({required this.id, required this.name, required this.phone});

  factory Courier.fromJson(Map<String, dynamic> j) => Courier(
    id: (j['id'] as String?) ?? '',
    name: (j['name'] as String?) ?? '',
    phone: (j['phone'] as String?) ?? '',
  );
}

class DeliveryProof {
  final String id;
  final String photoUrl;
  final double? latitude, longitude;
  final String? address, note;
  final DateTime submittedAt;

  const DeliveryProof({
    required this.id, required this.photoUrl, required this.submittedAt,
    this.latitude, this.longitude, this.address, this.note,
  });

  factory DeliveryProof.fromJson(Map<String, dynamic> j) {
    DateTime parseDate(dynamic v) {
      try { return DateTime.parse(v as String); } catch (_) { return DateTime.now(); }
    }
    return DeliveryProof(
      id: (j['id'] as String?) ?? '',
      photoUrl: (j['photoUrl'] as String?) ?? '',
      latitude: (j['latitude'] as num?)?.toDouble(),
      longitude: (j['longitude'] as num?)?.toDouble(),
      address: j['address'] as String?,
      note: j['note'] as String?,
      submittedAt: parseDate(j['submittedAt']),
    );
  }
}

class Order {
  final String id, date, status, schoolId;
  final int portions;
  final String? courierId;
  final School? school;
  final Courier? courier;
  final DeliveryProof? deliveryProof;
  final DateTime createdAt, updatedAt;

  const Order({
    required this.id, required this.date, required this.status,
    required this.schoolId, required this.portions, required this.createdAt,
    required this.updatedAt, this.courierId, this.school, this.courier,
    this.deliveryProof,
  });

  factory Order.fromJson(Map<String, dynamic> j) {
    DateTime parseDate(dynamic v) {
      try { return DateTime.parse(v as String); } catch (_) { return DateTime.now(); }
    }
    return Order(
      id: (j['id'] as String?) ?? '',
      date: (j['date'] as String?) ?? '',
      status: (j['status'] as String?) ?? 'pending',
      schoolId: (j['schoolId'] as String?) ?? '',
      portions: (j['portions'] as int?) ?? 0,
      courierId: j['courierId'] as String?,
      school: j['school'] != null ? School.fromJson(j['school'] as Map<String, dynamic>) : null,
      courier: j['courier'] != null ? Courier.fromJson(j['courier'] as Map<String, dynamic>) : null,
      deliveryProof: j['deliveryProof'] != null ? DeliveryProof.fromJson(j['deliveryProof'] as Map<String, dynamic>) : null,
      createdAt: parseDate(j['createdAt']),
      updatedAt: parseDate(j['updatedAt']),
    );
  }

  String get statusLabel {
    switch (status) {
      case 'pending': return 'Menunggu Dapur';
      case 'cooking': return 'Sedang Dimasak';
      case 'on_delivery': return 'Dalam Perjalanan';
      case 'delivered': return 'Telah Diterima';
      default: return status;
    }
  }

  int get statusIndex {
    switch (status) {
      case 'pending': return 0;
      case 'cooking': return 1;
      case 'on_delivery': return 2;
      case 'delivered': return 3;
      default: return 0;
    }
  }

  bool get isActive => status != 'delivered';
  bool get hasProof => deliveryProof != null;
}

class InventoryItem {
  final String id, name, unit;
  final double quantity;

  const InventoryItem({required this.id, required this.name, required this.unit, required this.quantity});

  factory InventoryItem.fromJson(Map<String, dynamic> j) => InventoryItem(
    id: (j['id'] as String?) ?? '',
    name: (j['name'] as String?) ?? '',
    unit: (j['unit'] as String?) ?? '',
    quantity: ((j['quantity'] as num?) ?? 0).toDouble(),
  );

  bool get isLow => quantity < 50;
}

class DashboardStats {
  final int totalPortionsToday, totalOrdersToday, deliveredCount, schoolsServed, totalSchools;
  final double riceStock;

  const DashboardStats({
    required this.totalPortionsToday, required this.totalOrdersToday,
    required this.deliveredCount, required this.riceStock,
    required this.schoolsServed, required this.totalSchools,
  });

  factory DashboardStats.fromJson(Map<String, dynamic> j) => DashboardStats(
    totalPortionsToday: (j['totalPortionsToday'] as int?) ?? 0,
    totalOrdersToday: (j['totalOrdersToday'] as int?) ?? 0,
    deliveredCount: (j['deliveredCount'] as int?) ?? 0,
    riceStock: ((j['riceStock'] as num?) ?? 0).toDouble(),
    schoolsServed: (j['schoolsServed'] as int?) ?? 0,
    totalSchools: (j['totalSchools'] as int?) ?? 0,
  );
}
