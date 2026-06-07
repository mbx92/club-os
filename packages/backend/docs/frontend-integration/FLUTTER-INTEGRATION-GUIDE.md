# Flutter Integration Guide - Gym Membership SaaS Backend

Panduan lengkap untuk mengintegrasikan aplikasi Flutter dengan Gym Membership Multi-Tenant SaaS Backend.

## Table of Contents
- [Setup Project](#setup-project)
- [Dependencies](#dependencies)
- [API Configuration](#api-configuration)
- [Authentication](#authentication)
- [Multi-Tenancy](#multi-tenancy)
- [Feature Gating](#feature-gating)
- [API Services](#api-services)
- [Error Handling](#error-handling)
- [State Management](#state-management)
- [Best Practices](#best-practices)

---

## Setup Project

### 1. Buat Flutter Project Baru
```bash
flutter create gym_membership_app
cd gym_membership_app
```

### 2. Struktur Folder yang Disarankan
```
lib/
├── main.dart
├── config/
│   ├── api_config.dart
│   └── app_config.dart
├── models/
│   ├── user.dart
│   ├── tenant.dart
│   ├── member.dart
│   ├── transaction.dart
│   └── subscription.dart
├── services/
│   ├── api_service.dart
│   ├── auth_service.dart
│   ├── member_service.dart
│   ├── pos_service.dart
│   └── storage_service.dart
├── providers/
│   ├── auth_provider.dart
│   ├── tenant_provider.dart
│   └── feature_provider.dart
├── screens/
│   ├── auth/
│   │   ├── login_screen.dart
│   │   └── register_screen.dart
│   ├── dashboard/
│   │   └── dashboard_screen.dart
│   ├── members/
│   │   ├── member_list_screen.dart
│   │   └── member_detail_screen.dart
│   └── pos/
│       └── pos_screen.dart
├── widgets/
│   ├── feature_gate.dart
│   └── custom_app_bar.dart
└── utils/
    ├── constants.dart
    └── helpers.dart
```

---

## Dependencies

Tambahkan dependencies ke `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # HTTP & API
  http: ^1.1.0
  dio: ^5.4.0  # Alternative untuk HTTP dengan interceptor
  
  # State Management
  provider: ^6.1.1
  # atau riverpod: ^2.4.9
  # atau bloc: ^8.1.3
  
  # Storage & Cache
  shared_preferences: ^2.2.2
  flutter_secure_storage: ^9.0.0
  
  # JSON Serialization
  json_annotation: ^4.8.1
  
  # UI & Utils
  intl: ^0.18.1  # Format tanggal & angka
  cached_network_image: ^3.3.1
  flutter_svg: ^2.0.9
  
  # Printer (untuk thermal printing)
  esc_pos_printer: ^4.1.0
  esc_pos_utils: ^1.1.0
  
  # PDF
  pdf: ^3.10.7
  printing: ^5.12.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  build_runner: ^2.4.7
  json_serializable: ^6.7.1
```

Jalankan:
```bash
flutter pub get
```

---

## API Configuration

### 1. Create API Config (`lib/config/api_config.dart`)

```dart
class ApiConfig {
  // Base URL - Ganti dengan URL backend Anda
  static const String baseUrl = 'http://localhost:3000/api/v1';
  
  // Endpoints
  static const String auth = '/auth';
  static const String users = '/users';
  static const String tenants = '/tenants';
  static const String members = '/gym/members';
  static const String memberships = '/gym/memberships';
  static const String transactions = '/transactions';
  static const String products = '/pos/products';
  static const String pos = '/pos';
  static const String restaurant = '/restaurant';
  static const String reports = '/reports';
  static const String dashboard = '/dashboard';
  
  // Timeout
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  
  // Headers
  static Map<String, String> get headers => {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  static Map<String, String> authHeaders(String token) => {
    ...headers,
    'Authorization': 'Bearer $token',
  };
}
```

### 2. Environment Configuration (`lib/config/app_config.dart`)

```dart
enum Environment { development, staging, production }

class AppConfig {
  static Environment environment = Environment.development;
  
  static String get apiBaseUrl {
    switch (environment) {
      case Environment.development:
        return 'http://localhost:3000/api/v1';
      case Environment.staging:
        return 'https://staging-api.yourdomain.com/api/v1';
      case Environment.production:
        return 'https://api.yourdomain.com/api/v1';
    }
  }
  
  static bool get isProduction => environment == Environment.production;
  static bool get isDevelopment => environment == Environment.development;
}
```

---

## Authentication

### 1. Auth Service (`lib/services/auth_service.dart`)

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/user.dart';
import 'storage_service.dart';

class AuthService {
  final StorageService _storage = StorageService();
  
  // Login
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}${ApiConfig.auth}/login'),
        headers: ApiConfig.headers,
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        // Simpan token
        await _storage.saveToken(data['token']);
        await _storage.saveUser(jsonEncode(data['user']));
        
        return {
          'success': true,
          'token': data['token'],
          'user': User.fromJson(data['user']),
          'tenant': data['tenant'],
          'subscription': data['subscription'],
        };
      } else {
        final error = jsonDecode(response.body);
        return {
          'success': false,
          'message': error['message'] ?? 'Login failed',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Network error: ${e.toString()}',
      };
    }
  }
  
  // Register Tenant Baru
  Future<Map<String, dynamic>> register({
    required String tenantName,
    required String email,
    required String password,
    required String fullName,
    String? phone,
    String planId = 'basic', // basic, professional, enterprise
  }) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}${ApiConfig.auth}/register'),
        headers: ApiConfig.headers,
        body: jsonEncode({
          'tenantName': tenantName,
          'email': email,
          'password': password,
          'fullName': fullName,
          'phone': phone,
          'planId': planId,
        }),
      );
      
      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return {
          'success': true,
          'message': 'Registration successful',
          'data': data,
        };
      } else {
        final error = jsonDecode(response.body);
        return {
          'success': false,
          'message': error['message'] ?? 'Registration failed',
        };
      }
    } catch (e) {
      return {
        'success': false,
        'message': 'Network error: ${e.toString()}',
      };
    }
  }
  
  // Logout
  Future<void> logout() async {
    await _storage.clearAll();
  }
  
  // Check if logged in
  Future<bool> isLoggedIn() async {
    final token = await _storage.getToken();
    return token != null;
  }
  
  // Get current user
  Future<User?> getCurrentUser() async {
    final userJson = await _storage.getUser();
    if (userJson != null) {
      return User.fromJson(jsonDecode(userJson));
    }
    return null;
  }
  
  // Refresh token
  Future<bool> refreshToken() async {
    try {
      final token = await _storage.getToken();
      if (token == null) return false;
      
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}${ApiConfig.auth}/refresh'),
        headers: ApiConfig.authHeaders(token),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await _storage.saveToken(data['token']);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }
}
```

### 2. Storage Service (`lib/services/storage_service.dart`)

```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  final _secureStorage = const FlutterSecureStorage();
  
  // Keys
  static const String _tokenKey = 'auth_token';
  static const String _userKey = 'user_data';
  static const String _tenantKey = 'tenant_data';
  static const String _subscriptionKey = 'subscription_data';
  
  // Token (secure storage)
  Future<void> saveToken(String token) async {
    await _secureStorage.write(key: _tokenKey, value: token);
  }
  
  Future<String?> getToken() async {
    return await _secureStorage.read(key: _tokenKey);
  }
  
  // User data
  Future<void> saveUser(String userJson) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_userKey, userJson);
  }
  
  Future<String?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_userKey);
  }
  
  // Tenant data
  Future<void> saveTenant(String tenantJson) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tenantKey, tenantJson);
  }
  
  Future<String?> getTenant() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tenantKey);
  }
  
  // Subscription data
  Future<void> saveSubscription(String subscriptionJson) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_subscriptionKey, subscriptionJson);
  }
  
  Future<String?> getSubscription() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_subscriptionKey);
  }
  
  // Clear all
  Future<void> clearAll() async {
    await _secureStorage.deleteAll();
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }
}
```

### 3. User Model (`lib/models/user.dart`)

```dart
class User {
  final int id;
  final String email;
  final String fullName;
  final String? phone;
  final int tenantId;
  final int roleId;
  final String roleName;
  final bool isSuperAdmin;
  final bool isActive;
  final DateTime createdAt;
  
  User({
    required this.id,
    required this.email,
    required this.fullName,
    this.phone,
    required this.tenantId,
    required this.roleId,
    required this.roleName,
    required this.isSuperAdmin,
    required this.isActive,
    required this.createdAt,
  });
  
  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      email: json['email'],
      fullName: json['fullName'],
      phone: json['phone'],
      tenantId: json['tenantId'],
      roleId: json['roleId'],
      roleName: json['role']?['name'] ?? 'User',
      isSuperAdmin: json['isSuperAdmin'] ?? false,
      isActive: json['isActive'] ?? true,
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'fullName': fullName,
      'phone': phone,
      'tenantId': tenantId,
      'roleId': roleId,
      'isSuperAdmin': isSuperAdmin,
      'isActive': isActive,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
```

---

## Multi-Tenancy

Backend menggunakan **multi-tenant architecture** dengan complete data isolation. Setiap tenant memiliki data yang terpisah.

### Tenant Model (`lib/models/tenant.dart`)

```dart
class Tenant {
  final int id;
  final String name;
  final String? logo;
  final Map<String, dynamic>? settings;
  final bool isActive;
  final DateTime createdAt;
  
  Tenant({
    required this.id,
    required this.name,
    this.logo,
    this.settings,
    required this.isActive,
    required this.createdAt,
  });
  
  factory Tenant.fromJson(Map<String, dynamic> json) {
    return Tenant(
      id: json['id'],
      name: json['name'],
      logo: json['logo'],
      settings: json['settings'],
      isActive: json['isActive'] ?? true,
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}
```

### Penting!
- Backend secara otomatis memfilter data berdasarkan `tenantId` dari JWT token
- Frontend **tidak perlu** menambahkan `tenantId` ke request body/params
- Token JWT sudah mengandung informasi tenant user

---

## Feature Gating

Backend memiliki subscription-based feature gating. Tidak semua fitur tersedia untuk semua plan.

### Subscription Model (`lib/models/subscription.dart`)

```dart
class Subscription {
  final int id;
  final int tenantId;
  final String planId;
  final String planName;
  final String status; // active, trial, suspended, cancelled
  final DateTime? trialEndsAt;
  final DateTime? billingDate;
  final Map<String, dynamic> features;
  
  Subscription({
    required this.id,
    required this.tenantId,
    required this.planId,
    required this.planName,
    required this.status,
    this.trialEndsAt,
    this.billingDate,
    required this.features,
  });
  
  factory Subscription.fromJson(Map<String, dynamic> json) {
    return Subscription(
      id: json['id'],
      tenantId: json['tenantId'],
      planId: json['planId'],
      planName: json['plan']?['name'] ?? json['planId'],
      status: json['status'],
      trialEndsAt: json['trialEndsAt'] != null 
          ? DateTime.parse(json['trialEndsAt']) 
          : null,
      billingDate: json['billingDate'] != null 
          ? DateTime.parse(json['billingDate']) 
          : null,
      features: json['plan']?['features'] ?? {},
    );
  }
  
  // Feature checks
  bool hasModule(String moduleName) {
    return features['modules']?[moduleName] ?? false;
  }
  
  bool hasFeature(String featureName) {
    return features['features']?[featureName] ?? false;
  }
  
  int? getLimit(String limitName) {
    return features['limits']?[limitName];
  }
  
  bool get isActive => status == 'active' || status == 'trial';
  bool get isTrial => status == 'trial';
}
```

### Feature Gate Widget (`lib/widgets/feature_gate.dart`)

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/feature_provider.dart';

class FeatureGate extends StatelessWidget {
  final String? module;
  final String? feature;
  final Widget child;
  final Widget? fallback;
  
  const FeatureGate({
    Key? key,
    this.module,
    this.feature,
    required this.child,
    this.fallback,
  }) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    final featureProvider = Provider.of<FeatureProvider>(context);
    
    bool hasAccess = true;
    
    if (module != null) {
      hasAccess = featureProvider.hasModule(module!);
    }
    
    if (feature != null && hasAccess) {
      hasAccess = featureProvider.hasFeature(feature!);
    }
    
    if (hasAccess) {
      return child;
    }
    
    return fallback ?? const SizedBox.shrink();
  }
}

// Usage:
// FeatureGate(
//   module: 'pos',
//   child: POSButton(),
//   fallback: UpgradePromptWidget(),
// )
```

### Feature Provider (`lib/providers/feature_provider.dart`)

```dart
import 'package:flutter/foundation.dart';
import '../models/subscription.dart';

class FeatureProvider with ChangeNotifier {
  Subscription? _subscription;
  
  Subscription? get subscription => _subscription;
  
  void setSubscription(Subscription subscription) {
    _subscription = subscription;
    notifyListeners();
  }
  
  bool hasModule(String moduleName) {
    if (_subscription == null) return false;
    return _subscription!.hasModule(moduleName);
  }
  
  bool hasFeature(String featureName) {
    if (_subscription == null) return false;
    return _subscription!.hasFeature(featureName);
  }
  
  int? getLimit(String limitName) {
    return _subscription?.getLimit(limitName);
  }
  
  // Available modules based on subscription
  bool get hasGymModule => hasModule('gym');
  bool get hasPOSModule => hasModule('pos');
  bool get hasRestaurantModule => hasModule('restaurant');
  bool get hasClassesModule => hasModule('classes');
  bool get hasPsychologyModule => hasModule('psychology');
  bool get hasAdvancedReports => hasModule('advancedReports');
  
  // Available features
  bool get hasCombinedBilling => hasFeature('combinedBilling');
  bool get hasThermalPrinting => hasFeature('thermalPrinting');
  bool get hasCreditCard => hasFeature('creditCard');
  bool get hasCustomReports => hasFeature('customReports');
  bool get hasWhatsappNotification => hasFeature('whatsappNotification');
  
  void clear() {
    _subscription = null;
    notifyListeners();
  }
}
```

---

## API Services

### 1. Base API Service (`lib/services/api_service.dart`)

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'storage_service.dart';

class ApiService {
  final StorageService _storage = StorageService();
  
  Future<Map<String, String>> _getHeaders() async {
    final token = await _storage.getToken();
    if (token != null) {
      return ApiConfig.authHeaders(token);
    }
    return ApiConfig.headers;
  }
  
  // GET Request
  Future<Map<String, dynamic>> get(String endpoint) async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}$endpoint'),
        headers: headers,
      );
      
      return _handleResponse(response);
    } catch (e) {
      return _handleError(e);
    }
  }
  
  // POST Request
  Future<Map<String, dynamic>> post(
    String endpoint,
    Map<String, dynamic> data,
  ) async {
    try {
      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}$endpoint'),
        headers: headers,
        body: jsonEncode(data),
      );
      
      return _handleResponse(response);
    } catch (e) {
      return _handleError(e);
    }
  }
  
  // PUT Request
  Future<Map<String, dynamic>> put(
    String endpoint,
    Map<String, dynamic> data,
  ) async {
    try {
      final headers = await _getHeaders();
      final response = await http.put(
        Uri.parse('${ApiConfig.baseUrl}$endpoint'),
        headers: headers,
        body: jsonEncode(data),
      );
      
      return _handleResponse(response);
    } catch (e) {
      return _handleError(e);
    }
  }
  
  // DELETE Request
  Future<Map<String, dynamic>> delete(String endpoint) async {
    try {
      final headers = await _getHeaders();
      final response = await http.delete(
        Uri.parse('${ApiConfig.baseUrl}$endpoint'),
        headers: headers,
      );
      
      return _handleResponse(response);
    } catch (e) {
      return _handleError(e);
    }
  }
  
  // Handle response
  Map<String, dynamic> _handleResponse(http.Response response) {
    final statusCode = response.statusCode;
    
    if (statusCode >= 200 && statusCode < 300) {
      return {
        'success': true,
        'statusCode': statusCode,
        'data': jsonDecode(response.body),
      };
    } else {
      final error = jsonDecode(response.body);
      return {
        'success': false,
        'statusCode': statusCode,
        'message': error['message'] ?? 'Request failed',
        'error': error,
      };
    }
  }
  
  // Handle error
  Map<String, dynamic> _handleError(dynamic error) {
    return {
      'success': false,
      'message': 'Network error: ${error.toString()}',
    };
  }
}
```

### 2. Member Service (`lib/services/member_service.dart`)

```dart
import 'api_service.dart';
import '../config/api_config.dart';

class MemberService {
  final ApiService _api = ApiService();
  
  // Get all members
  Future<Map<String, dynamic>> getMembers({
    int page = 1,
    int limit = 20,
    String? search,
    String? status,
  }) async {
    String endpoint = '${ApiConfig.members}?page=$page&limit=$limit';
    
    if (search != null) {
      endpoint += '&search=$search';
    }
    if (status != null) {
      endpoint += '&status=$status';
    }
    
    return await _api.get(endpoint);
  }
  
  // Get member by ID
  Future<Map<String, dynamic>> getMember(int id) async {
    return await _api.get('${ApiConfig.members}/$id');
  }
  
  // Create member
  Future<Map<String, dynamic>> createMember(Map<String, dynamic> data) async {
    return await _api.post(ApiConfig.members, data);
  }
  
  // Update member
  Future<Map<String, dynamic>> updateMember(
    int id,
    Map<String, dynamic> data,
  ) async {
    return await _api.put('${ApiConfig.members}/$id', data);
  }
  
  // Delete member
  Future<Map<String, dynamic>> deleteMember(int id) async {
    return await _api.delete('${ApiConfig.members}/$id');
  }
  
  // Get member statistics
  Future<Map<String, dynamic>> getMemberStats() async {
    return await _api.get('${ApiConfig.members}/stats');
  }
  
  // Check-in member
  Future<Map<String, dynamic>> checkIn(int memberId) async {
    return await _api.post('${ApiConfig.members}/$memberId/checkin', {});
  }
}
```

### 3. POS Service (`lib/services/pos_service.dart`)

```dart
import 'api_service.dart';
import '../config/api_config.dart';

class POSService {
  final ApiService _api = ApiService();
  
  // Get products
  Future<Map<String, dynamic>> getProducts({
    int page = 1,
    int limit = 50,
    String? category,
    String? search,
  }) async {
    String endpoint = '${ApiConfig.products}?page=$page&limit=$limit';
    
    if (category != null) {
      endpoint += '&category=$category';
    }
    if (search != null) {
      endpoint += '&search=$search';
    }
    
    return await _api.get(endpoint);
  }
  
  // Create transaction
  Future<Map<String, dynamic>> createTransaction({
    required List<Map<String, dynamic>> items,
    required List<Map<String, dynamic>> payments,
    int? memberId,
    String? notes,
  }) async {
    return await _api.post('${ApiConfig.pos}/transactions', {
      'items': items,
      'payments': payments,
      'memberId': memberId,
      'notes': notes,
    });
  }
  
  // Get transaction history
  Future<Map<String, dynamic>> getTransactions({
    int page = 1,
    int limit = 20,
    String? startDate,
    String? endDate,
  }) async {
    String endpoint = '${ApiConfig.pos}/transactions?page=$page&limit=$limit';
    
    if (startDate != null) {
      endpoint += '&startDate=$startDate';
    }
    if (endDate != null) {
      endpoint += '&endDate=$endDate';
    }
    
    return await _api.get(endpoint);
  }
}
```

### 4. Dashboard Service (`lib/services/dashboard_service.dart`)

```dart
import 'api_service.dart';
import '../config/api_config.dart';

class DashboardService {
  final ApiService _api = ApiService();
  
  // Get main dashboard
  Future<Map<String, dynamic>> getMainDashboard({
    String period = 'today', // today, week, month, year
  }) async {
    return await _api.get('${ApiConfig.dashboard}/main?period=$period');
  }
  
  // Get gym dashboard
  Future<Map<String, dynamic>> getGymDashboard({
    String? startDate,
    String? endDate,
  }) async {
    String endpoint = '${ApiConfig.dashboard}/gym';
    
    if (startDate != null && endDate != null) {
      endpoint += '?startDate=$startDate&endDate=$endDate';
    }
    
    return await _api.get(endpoint);
  }
  
  // Get revenue chart data
  Future<Map<String, dynamic>> getRevenueChart({
    required String period, // daily, weekly, monthly
    String? startDate,
    String? endDate,
  }) async {
    String endpoint = '${ApiConfig.dashboard}/revenue?period=$period';
    
    if (startDate != null && endDate != null) {
      endpoint += '&startDate=$startDate&endDate=$endDate';
    }
    
    return await _api.get(endpoint);
  }
}
```

---

## Error Handling

### Error Handler Utility (`lib/utils/error_handler.dart`)

```dart
import 'package:flutter/material.dart';

class ErrorHandler {
  static void showError(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        duration: const Duration(seconds: 3),
      ),
    );
  }
  
  static void showSuccess(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
        duration: const Duration(seconds: 2),
      ),
    );
  }
  
  static String parseApiError(Map<String, dynamic> response) {
    if (response['message'] != null) {
      return response['message'];
    }
    
    if (response['error'] != null) {
      final error = response['error'];
      if (error is Map && error['message'] != null) {
        return error['message'];
      }
    }
    
    return 'An error occurred';
  }
  
  static void handleApiError(BuildContext context, Map<String, dynamic> response) {
    final message = parseApiError(response);
    showError(context, message);
  }
}
```

---

## State Management

### Auth Provider Example (`lib/providers/auth_provider.dart`)

```dart
import 'package:flutter/foundation.dart';
import '../models/user.dart';
import '../models/tenant.dart';
import '../models/subscription.dart';
import '../services/auth_service.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();
  
  User? _user;
  Tenant? _tenant;
  Subscription? _subscription;
  bool _isLoading = false;
  String? _error;
  
  User? get user => _user;
  Tenant? get tenant => _tenant;
  Subscription? get subscription => _subscription;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null;
  
  // Login
  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    
    final result = await _authService.login(
      email: email,
      password: password,
    );
    
    _isLoading = false;
    
    if (result['success']) {
      _user = result['user'];
      _tenant = Tenant.fromJson(result['tenant']);
      _subscription = Subscription.fromJson(result['subscription']);
      notifyListeners();
      return true;
    } else {
      _error = result['message'];
      notifyListeners();
      return false;
    }
  }
  
  // Logout
  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    _tenant = null;
    _subscription = null;
    notifyListeners();
  }
  
  // Check login status
  Future<void> checkAuth() async {
    final isLoggedIn = await _authService.isLoggedIn();
    if (isLoggedIn) {
      _user = await _authService.getCurrentUser();
      notifyListeners();
    }
  }
}
```

### Main App Setup (`lib/main.dart`)

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/feature_provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/dashboard/dashboard_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => FeatureProvider()),
      ],
      child: MaterialApp(
        title: 'Gym Membership App',
        theme: ThemeData(
          primarySwatch: Colors.blue,
          useMaterial3: true,
        ),
        home: const SplashScreen(),
      ),
    );
  }
}

class SplashScreen extends StatefulWidget {
  const SplashScreen({Key? key}) : super(key: key);

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkAuth();
  }
  
  Future<void> _checkAuth() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    await authProvider.checkAuth();
    
    if (mounted) {
      if (authProvider.isAuthenticated) {
        // Setup feature provider
        final featureProvider = Provider.of<FeatureProvider>(context, listen: false);
        if (authProvider.subscription != null) {
          featureProvider.setSubscription(authProvider.subscription!);
        }
        
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const DashboardScreen()),
        );
      } else {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
        );
      }
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}
```

---

## Best Practices

### 1. **Security**
- Simpan token di `flutter_secure_storage`, bukan di `SharedPreferences`
- Jangan simpan password di local storage
- Validasi semua input sebelum dikirim ke API
- Implementasikan timeout untuk semua request

### 2. **Performance**
- Gunakan pagination untuk list data
- Implementasikan caching untuk data yang jarang berubah
- Gunakan `const` constructor untuk widget yang tidak berubah
- Lazy load image menggunakan `cached_network_image`

### 3. **Error Handling**
- Selalu handle network errors
- Tampilkan error message yang user-friendly
- Implementasikan retry mechanism untuk failed requests
- Log errors untuk debugging

### 4. **User Experience**
- Tampilkan loading indicator saat fetching data
- Implementasikan pull-to-refresh
- Offline mode dengan local caching
- Konfirmasi untuk operasi destructive (delete, etc.)

### 5. **Code Organization**
- Pisahkan business logic dari UI (gunakan provider/bloc)
- Satu file untuk satu model
- Gunakan constants untuk string & magic numbers
- Comment untuk logic yang kompleks

### 6. **Testing**
```dart
// Unit test untuk service
test('Login should return user data', () async {
  final authService = AuthService();
  final result = await authService.login(
    email: 'test@example.com',
    password: 'password123',
  );
  
  expect(result['success'], true);
  expect(result['user'], isNotNull);
});

// Widget test
testWidgets('Login button should be disabled when fields are empty', 
  (WidgetTester tester) async {
  await tester.pumpWidget(const LoginScreen());
  
  final loginButton = find.byType(ElevatedButton);
  expect(loginButton, findsOneWidget);
  
  final button = tester.widget<ElevatedButton>(loginButton);
  expect(button.enabled, false);
});
```

---

## API Endpoints Reference

### Authentication
- `POST /api/v1/auth/register` - Register tenant baru
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Get current user

### Members (Gym Module)
- `GET /api/v1/gym/members` - Get all members
- `POST /api/v1/gym/members` - Create member
- `GET /api/v1/gym/members/:id` - Get member detail
- `PUT /api/v1/gym/members/:id` - Update member
- `DELETE /api/v1/gym/members/:id` - Delete member
- `POST /api/v1/gym/members/:id/checkin` - Check-in member

### POS (POS Module)
- `GET /api/v1/pos/products` - Get products
- `POST /api/v1/pos/products` - Create product
- `POST /api/v1/pos/transactions` - Create transaction
- `GET /api/v1/pos/transactions` - Get transaction history

### Dashboard
- `GET /api/v1/dashboard/main` - Main dashboard
- `GET /api/v1/dashboard/gym` - Gym dashboard
- `GET /api/v1/dashboard/revenue` - Revenue chart

### Subscription
- `GET /api/v1/subscription/plans` - Get available plans
- `POST /api/v1/subscription/upgrade` - Upgrade plan
- `GET /api/v1/subscription/usage` - Get usage statistics

**Detail lengkap**: Lihat file dokumentasi di folder `docs/frontend-integration/`

---

## Sample Screens

### Login Screen Example

```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../utils/error_handler.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  
  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }
  
  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    
    final success = await authProvider.login(
      _emailController.text.trim(),
      _passwordController.text,
    );
    
    if (mounted) {
      if (success) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const DashboardScreen()),
        );
      } else {
        ErrorHandler.showError(context, authProvider.error ?? 'Login failed');
      }
    }
  }
  
  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.fitness_center,
                    size: 80,
                    color: Theme.of(context).primaryColor,
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Gym Membership',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 48),
                  TextFormField(
                    controller: _emailController,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      prefixIcon: Icon(Icons.email),
                      border: OutlineInputBorder(),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Email required';
                      }
                      if (!value.contains('@')) {
                        return 'Invalid email';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    decoration: InputDecoration(
                      labelText: 'Password',
                      prefixIcon: const Icon(Icons.lock),
                      border: const OutlineInputBorder(),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword 
                              ? Icons.visibility 
                              : Icons.visibility_off,
                        ),
                        onPressed: () {
                          setState(() {
                            _obscurePassword = !_obscurePassword;
                          });
                        },
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Password required';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: authProvider.isLoading ? null : _login,
                      child: authProvider.isLoading
                          ? const CircularProgressIndicator()
                          : const Text('Login'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
```

---

## Troubleshooting

### 1. **CORS Error**
Jika mengalami CORS error saat development:
- Backend sudah mengatur CORS, pastikan menggunakan URL yang benar
- Untuk development, gunakan IP address atau localhost sesuai konfigurasi backend

### 2. **Authentication Error**
- Pastikan token tersimpan dengan benar
- Check token expiration
- Implementasikan refresh token mechanism

### 3. **Feature Not Available**
- Check subscription plan features
- Verifikasi feature gate di backend logs
- Pastikan subscription status adalah `active` atau `trial`

### 4. **Network Error**
- Check internet connection
- Verify API base URL
- Check backend server status
- Implementasikan retry mechanism

---

## Resources

### Backend Documentation
- [Quick Start Guide](./QUICK-START.md)
- [API Testing Examples](./API-TESTING-EXAMPLES.md)
- [Feature Gating Guide](./FEATURE-GATING-GUIDE.md)
- [Subscription API Endpoints](./SUBSCRIPTION-API-ENDPOINTS.md)

### Flutter Resources
- [Flutter Documentation](https://flutter.dev/docs)
- [Provider Package](https://pub.dev/packages/provider)
- [HTTP Package](https://pub.dev/packages/http)
- [Dio Package](https://pub.dev/packages/dio)

---

## Support

Untuk pertanyaan atau issue, silakan:
1. Check dokumentasi di folder `docs/frontend-integration/`
2. Review backend logs di folder `logs/`
3. Test API menggunakan Postman (collection tersedia di `docs/postman/`)

---

**Last Updated**: December 2024
**Backend Version**: 1.0.0
**Minimum Flutter Version**: 3.10.0
