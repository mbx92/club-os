# Member Portal - Flutter Integration Notes

## Important Security Notice

### ⚠️ DO NOT Send `customerId` in API Payloads

**Why?**
Backend **automatically** extracts member/user information from the **JWT token** for security reasons. Sending `customerId` in payload creates a security vulnerability where malicious users could impersonate other members.

**What happens if you send it?**
- Backend will **ignore** the `customerId` from payload
- Backend will **log a warning** in security logs
- Backend will **use** `userId` from JWT token instead

**Correct Implementation:**

❌ **WRONG - Do NOT do this:**
```dart
// BAD - Sending customerId in payload
final response = await http.post(
  Uri.parse('$baseUrl/member/services/subscribe'),
  headers: _getHeaders(),
  body: json.encode({
    'servicePlanId': servicePlanId,
    'paymentMethod': paymentMethod,
    'customerId': memberId,  // ❌ DO NOT SEND THIS
  }),
);
```

✅ **CORRECT - Only send required fields:**
```dart
// GOOD - Only servicePlanId and paymentMethod
final response = await http.post(
  Uri.parse('$baseUrl/member/services/subscribe'),
  headers: _getHeaders(),
  body: json.encode({
    'servicePlanId': servicePlanId,
    'paymentMethod': paymentMethod,
  }),
);
```

---

## How Backend Identifies Member

**Flow:**

1. **Frontend sends JWT token** in `Authorization` header
   ```dart
   headers: {
     'Authorization': 'Bearer $token',
   }
   ```

2. **Backend decodes token** to get `userId` and `tenantId`
   ```javascript
   const userId = req.user.id;        // From JWT
   const tenantId = req.user.tenantId; // From JWT
   ```

3. **Backend finds Member** using `userId`
   ```javascript
   const member = await Member.findOne({
     where: { userId, tenantId }
   });
   ```

4. **Backend creates Transaction** with `customerId = userId`
   ```javascript
   const transaction = await Transaction.create({
     customerId: userId,  // NOT memberId!
     customerType: 'member',
     customerName: member.fullName
   });
   ```

**Key Points:**
- `Transaction.customerId` contains **`userId`** (User table ID)
- `Transaction.customerType` indicates this is a `'member'` transaction
- `Transaction.customerName` stores member's full name for display
- Member info retrieved via `Member.userId` relationship

---

## Debug Logging - What You're Seeing

When you see this in Flutter logs:
```
I/flutter (13545): Member ID from dashboard: a7efc196-34ec-4e07-8072-3f95aeb78aa1
I/flutter (13545): Subscribe payload: {
  servicePlanId: 33333300-0000-0000-0000-000000000005, 
  paymentMethod: cash, 
  customerId: a7efc196-34ec-4e07-8072-3f95aeb78aa1  // ⚠️ This is ignored
}
```

**What happens on backend:**
```
[WARN] Ignored customerId from payload - using JWT token userId instead
{
  sentCustomerId: "a7efc196-34ec-4e07-8072-3f95aeb78aa1",  // From Flutter
  actualUserId: "12345678-abcd-efgh-ijkl-123456789012"     // From JWT token
}
```

Backend will **always use** the `userId` from JWT token, not the one you sent.

---

## Recommended Flutter Implementation

### 1. Remove `customerId` from Payloads

Update your Flutter service to NOT send `customerId`:

```dart
// member_service.dart
class MemberService {
  // Subscribe to service
  Future<Map<String, dynamic>> subscribeToService(
    String servicePlanId,
    String paymentMethod,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/member/services/subscribe'),
      headers: _getHeaders(),
      body: json.encode({
        'servicePlanId': servicePlanId,
        'paymentMethod': paymentMethod,
        // ✅ NO customerId needed - backend gets it from token
      }),
    );

    if (response.statusCode == 201) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to subscribe');
    }
  }

  // Place restaurant order
  Future<Map<String, dynamic>> placeRestaurantOrder(
    List<Map<String, dynamic>> items,
    String? notes,
    String paymentMethod,
  ) async {
    final response = await http.post(
      Uri.parse('$baseUrl/member/restaurant/order'),
      headers: _getHeaders(),
      body: json.encode({
        'items': items,
        'notes': notes,
        'paymentMethod': paymentMethod,
        // ✅ NO customerId needed
      }),
    );

    if (response.statusCode == 201) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to place order');
    }
  }
}
```

### 2. Trust Backend Response for Member Info

After subscribe, backend returns member info in the response:

```dart
// Example response
{
  "status": "success",
  "data": {
    "activeService": {...},
    "transaction": {
      "id": "uuid",
      "transactionNumber": "GYM-20241223-001",
      "amount": 500000,
      "customerName": "Wira Andika",  // ✅ From backend
      "customerType": "member",        // ✅ Verified by backend
      "member": {                      // ✅ Member info from JWT token
        "id": "a7efc196-34ec-4e07-8072-3f95aeb78aa1",
        "fullName": "Wira Andika",
        "email": "wira@gmail.com"
      }
    }
  }
}
```

Use this member info from response, don't send it in payload.

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Sending Member ID as customerId
```dart
// WRONG
body: json.encode({
  'servicePlanId': planId,
  'paymentMethod': 'cash',
  'customerId': memberId,  // Backend ignores this
})
```

### ❌ Mistake 2: Trusting Member ID from Dashboard for Transactions
```dart
// WRONG - Don't use member ID from dashboard for transaction creation
final memberId = dashboardData['member']['id'];
subscribeToService(planId, 'cash', memberId);  // Backend ignores 3rd param
```

### ✅ Correct: Only Send Required Fields
```dart
// CORRECT
body: json.encode({
  'servicePlanId': planId,
  'paymentMethod': 'cash',
})
```

---

## Why This Design?

**Security Benefits:**

1. **Prevents impersonation**: User A cannot create transactions for User B
2. **Single source of truth**: JWT token is cryptographically signed, payload is not
3. **Audit trail**: All actions traced to authenticated user from token
4. **Multi-tenant isolation**: `tenantId` from token ensures data isolation

**Example Attack Scenario (Prevented):**

❌ **If backend trusted `customerId` from payload:**
```dart
// Malicious user could do:
body: json.encode({
  'servicePlanId': planId,
  'paymentMethod': 'cash',
  'customerId': 'someone-else-member-id',  // Impersonation!
})
```

✅ **With current design:**
```javascript
// Backend:
const userId = req.user.id;  // Always from JWT - can't be faked
```

---

## Testing Checklist

- [ ] Remove `customerId` from all POST request payloads
- [ ] Verify JWT token is sent in `Authorization` header
- [ ] Check backend logs for security warnings about ignored `customerId`
- [ ] Confirm transaction response contains correct member info
- [ ] Test with multiple members to ensure proper isolation
- [ ] Verify transaction history shows correct member data

---

## Backend Logs to Monitor

When debugging, check backend logs for:

```
[INFO] Member service subscription created
{
  userId: "12345678-abcd-efgh-ijkl-123456789012",
  memberId: "a7efc196-34ec-4e07-8072-3f95aeb78aa1",
  servicePlanId: "33333300-0000-0000-0000-000000000005"
}
```

If you see this warning:
```
[WARN] Ignored customerId from payload - using JWT token userId instead
{
  sentCustomerId: "a7efc196-34ec-4e07-8072-3f95aeb78aa1",
  actualUserId: "12345678-abcd-efgh-ijkl-123456789012"
}
```

**Action:** Remove `customerId` from Flutter payload.

---

## Summary

**What to remember:**

1. ✅ Backend gets member info from **JWT token** (secure)
2. ✅ Only send `servicePlanId` and `paymentMethod` in payload
3. ✅ Backend response contains verified member info
4. ❌ Never send `customerId` in payload (security risk)
5. ❌ Don't trust user input for identity (use JWT)

**Updated Flutter code:**
```dart
// ✅ Correct minimal payload
await memberService.subscribeToService(
  servicePlanId: plan.id,
  paymentMethod: 'cash',
  // No customerId needed!
);
```

---

*Last updated: December 23, 2024*
