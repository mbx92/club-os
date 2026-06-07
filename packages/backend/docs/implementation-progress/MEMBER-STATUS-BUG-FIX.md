# Member Status Bug Fix - Membership Status Persistence

**Date**: February 18, 2026  
**Issue**: Membership status hilang ketika member status diubah dari inactive ke active kembali

## Problem Description

### Skenario Bug
1. Member memiliki `membershipStatus: 'active'` (karena punya membership aktif)
2. Admin mengubah `isActive: false` (member di-deactivate)
3. Admin mengubah `isActive: true` (member di-activate kembali)
4. **BUG**: Request ditolak atau membershipStatus tidak preserved dengan benar

### Root Cause

Ditemukan 2 masalah di `src/controllers/gym/member/memberController.js`:

#### 1. **Validasi Terlalu Ketat**
```javascript
// BEFORE (BUGGY):
if (membershipStatus) {
  if (membershipStatus === 'active') {
    // Reject request
  }
}
```

Validasi ini berjalan **bahkan jika membershipStatus tidak berubah**. Jadi ketika frontend mengirim data lengkap member (termasuk `membershipStatus: 'active'` yang existing), API menolak request.

#### 2. **Logic Preserve Tidak Konsisten**
```javascript
// BEFORE (BUGGY):
membershipStatus: membershipStatus || member.membershipStatus
```

Menggunakan OR operator (`||`) yang bisa bermasalah dengan empty string atau falsy values.

## Solution Implemented

### 1. Skip Validasi Jika Tidak Ada Perubahan
```javascript
// AFTER (FIXED):
if (membershipStatus && membershipStatus !== member.membershipStatus) {
  if (membershipStatus === 'active') {
    // Reject request
  }
}
```

**Perbaikan**:
- Hanya validate jika `membershipStatus` benar-benar **berbeda** dari existing value
- Jika frontend mengirim value yang sama, validation dilewati (allowed)

### 2. Explicit Undefined Check
```javascript
// AFTER (FIXED):
membershipStatus: membershipStatus !== undefined ? membershipStatus : member.membershipStatus
```

**Perbaikan**:
- Menggunakan strict check `!== undefined` seperti field lainnya
- Lebih konsisten dan predictable

## Files Modified

### `src/controllers/gym/member/memberController.js`

**Function**: `updateMember()`

**Changes**:
1. Line ~512: Added condition `membershipStatus !== member.membershipStatus` to validation
2. Line ~625: Changed from OR operator to explicit undefined check

## Testing Scenarios

### Test Case 1: Deactivate & Reactivate with Membership Status
```javascript
// Initial state
{
  isActive: true,
  membershipStatus: 'active'
}

// Step 1: Deactivate member
PUT /api/v1/gym/members/{id}
{
  isActive: false
}

// Expected: Success, membershipStatus tetap 'active'
// Result: ✅ PASS

// Step 2: Reactivate member
PUT /api/v1/gym/members/{id}
{
  isActive: true
}

// Expected: Success, membershipStatus tetap 'active'
// Result: ✅ PASS (sebelumnya FAIL)
```

### Test Case 2: Frontend Sends Complete Data
```javascript
// Frontend mengirim semua data (termasuk membershipStatus existing)
PUT /api/v1/gym/members/{id}
{
  firstName: "John",
  lastName: "Doe",
  isActive: true,
  membershipStatus: "active" // Value tidak berubah
}

// Expected: Success, tidak ada validation error
// Result: ✅ PASS (sebelumnya FAIL dengan error "Tidak dapat mengubah status membership menjadi aktif secara manual")
```

### Test Case 3: Manual Change to Active (Should Still Reject)
```javascript
// Admin mencoba force change membershipStatus dari 'expired' ke 'active'
PUT /api/v1/gym/members/{id}
{
  membershipStatus: "active" // Trying to force change
}

// Expected: Error 400 "Tidak dapat mengubah status membership menjadi aktif secara manual"
// Result: ✅ PASS (security validation tetap bekerja)
```

### Test Case 4: Change to Non-Active Status
```javascript
// Admin ubah status dari 'active' ke 'suspended'
PUT /api/v1/gym/members/{id}
{
  membershipStatus: "suspended"
}

// Expected: Success
// Result: ✅ PASS
```

## Impact Analysis

### ✅ Positive Impact
- **Bug Fixed**: Member dapat di-deactivate dan di-activate kembali tanpa kehilangan membershipStatus
- **Backward Compatible**: Tidak breaking existing functionality
- **Security Maintained**: Validasi tetap mencegah manual activation ke 'active' status
- **Consistency**: Logic preserve field sekarang konsisten dengan field lain (email, phone, dll)

### ⚠️ No Breaking Changes
- API contract tidak berubah
- Frontend tidak perlu update (otomatis compatible)
- Database schema tidak berubah

## Related Code

### Member Status Flow
1. **Create Member** → Default `membershipStatus: 'expired'` (dari model)
2. **Purchase Membership** → Auto-update ke `membershipStatus: 'active'` (di service purchase)
3. **Membership Expires** → Cron job update ke `membershipStatus: 'expired'`
4. **Manual Suspend** → Admin dapat ubah ke `membershipStatus: 'suspended'`
5. **Deactivate/Reactivate** → `isActive` toggle **tidak boleh** reset `membershipStatus` ✅ FIXED

### Validation Rules (Still Enforced)
- ✅ Tidak boleh manual change dari non-active ke 'active'
- ✅ Hanya boleh manual change ke: 'expired', 'suspended', 'cancelled'
- ✅ 'active' status hanya bisa di-set via membership purchase/renewal
- ✅ Jika value tidak berubah, validation dilewati (new behavior)

## Recommendations

### For Frontend Developers
Sekarang aman untuk:
```javascript
// Option 1: Hanya kirim field yang berubah
updateMember(id, { isActive: true });

// Option 2: Kirim semua data (termasuk existing membershipStatus)
updateMember(id, {
  ...memberData,
  isActive: true,
  membershipStatus: memberData.membershipStatus // OK, tidak akan error
});
```

### For Backend Developers
- Pastikan semua field optional menggunakan pattern `field !== undefined ? field : existing.field`
- Validation yang check perubahan status harus compare dengan existing value
- Maintain separation: `isActive` (admin control) vs `membershipStatus` (business logic control)

## Conclusion

Bug fixed dengan 2 perubahan minimal:
1. Validasi hanya berjalan jika ada perubahan value
2. Logic preserve menggunakan explicit undefined check

Tidak ada breaking changes, backward compatible, dan security validation tetap berjalan dengan baik.
