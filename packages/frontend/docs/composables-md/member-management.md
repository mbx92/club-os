Member Management

Get All Members
get
{{base_url}}/gym/members?page=1&limit=10&sortBy=createdAt&sortOrder=DESC&search=&membershipStatus=all&isActive=all

param :
sortBy : Sort field: firstName, lastName, joinDate, membershipStatus, createdAt
sortOrder : Sort order: ASC or DESC
membershipStatus : Filter: active, inactive, suspended, expired, all
isActive: Filter: true, false, all

resp:
{
    "data": [
        {
            "id": "7a059f0c-7099-4d22-96b1-cfd5b4c44d6a",
            "tenantId": "1a5c8c84-b7e4-491f-862c-b23618e4774b",
            "userId": "9a7f6f08-4d64-4269-80ee-80d33661d5e0",
            "firstName": "Michael",
            "lastName": "Johnson",
            "email": "michael.j@example.com",
            "phone": "+6281298765432",
            "dateOfBirth": "1988-03-10",
            "gender": "male",
            "address": "789 Beach Road, Bali",
            "emergencyContactName": null,
            "emergencyContactPhone": null,
            "notes": null,
            "photoUrl": "https://example.com/photos/michael.jpg",
            "joinDate": "2025-11-23",
            "isActive": true,
            "membershipStatus": "expired",
            "createdAt": "2025-11-23T07:10:26.174Z",
            "updatedAt": "2025-11-23T07:10:26.174Z",
            "deletedAt": null,
            "user": {
                "id": "9a7f6f08-4d64-4269-80ee-80d33661d5e0",
                "email": "michael.j@example.com",
                "phone": "+6281298765432",
                "isActive": true,
                "lastLogin": null
            },
            "memberships": []
        }
    ],
    "pagination": {
        "currentPage": 1,
        "totalPages": 1,
        "totalRecords": 1,
        "limit": 10,
        "hasNextPage": false,
        "hasPrevPage": false
    },
    "filters": {
        "search": "",
        "status": "all",
        "membershipStatus": "all",
        "sortBy": "createdAt",
        "sortOrder": "DESC"
    }
}

Get Member by ID
get
{{base_url}}/gym/members/:memberId
resp:
{
    "id": "7a059f0c-7099-4d22-96b1-cfd5b4c44d6a",
    "tenantId": "1a5c8c84-b7e4-491f-862c-b23618e4774b",
    "userId": "9a7f6f08-4d64-4269-80ee-80d33661d5e0",
    "firstName": "Michael",
    "lastName": "Johnson",
    "email": "michael.j@example.com",
    "phone": "+6281298765432",
    "dateOfBirth": "1988-03-10",
    "gender": "male",
    "address": "789 Beach Road, Bali",
    "emergencyContactName": null,
    "emergencyContactPhone": null,
    "notes": null,
    "photoUrl": "https://example.com/photos/michael.jpg",
    "joinDate": "2025-11-23",
    "isActive": true,
    "membershipStatus": "expired",
    "createdAt": "2025-11-23T07:10:26.174Z",
    "updatedAt": "2025-11-23T07:10:26.174Z",
    "deletedAt": null,
    "user": {
        "id": "9a7f6f08-4d64-4269-80ee-80d33661d5e0",
        "email": "michael.j@example.com",
        "phone": "+6281298765432",
        "isActive": true,
        "lastLogin": null
    },
    "memberships": [],
    "tenant": {
        "id": "1a5c8c84-b7e4-491f-862c-b23618e4774b",
        "name": "Tenant A"
    }
}

Create Member - Both Email & Phone
post
{{base_url}}/gym/members
bisa tanpa phone atau email tapi harus ada salah satu (opsional), wajib firstName, lastName, email or phone
payload:
{
  "firstName": "Michael",
  "lastName": "Johnson",
  "email": "michael.j@example.com",
  "phone": "+6281298765432",
  "dateOfBirth": "1988-03-10",
  "gender": "male",
  "address": "789 Beach Road, Bali",
  "photoUrl": "https://example.com/photos/michael.jpg",
  "emergencyContact": "Sarah Johnson",
  "emergencyPhone": "+628123456789",
  "membershipStatus": "active"
}
Resp:
{
    "message": "Member created successfully",
    "member": {
        "id": "7a059f0c-7099-4d22-96b1-cfd5b4c44d6a",
        "firstName": "Michael",
        "lastName": "Johnson",
        "fullName": "Michael Johnson",
        "email": "michael.j@example.com",
        "phone": "+6281298765432",
        "membershipStatus": "expired",
        "createdAt": "2025-11-23T07:10:26.174Z"
    },
    "credentials": {
        "tempPassword": "password123"
    }
}

Update Member
put
{{base_url}}/gym/members/:memberId
payload:
{
  "firstName": "John Updated",
  "lastName": "Doe",
  "email": "john.doe.updated@example.com",
  "phone": "+6281234567899",
  "address": "123 Main Street, Updated Address",
  "isActive": true,
  "notes": "Member information updated"
}
Tidak dapat mengubah status membership menjadi aktif secara manual. Harus ketika buat atau perpanjang membership.
resp:
{
    "message": "Member updated successfully",
    "member": {
        "id": "7a059f0c-7099-4d22-96b1-cfd5b4c44d6a",
        "tenantId": "1a5c8c84-b7e4-491f-862c-b23618e4774b",
        "userId": "9a7f6f08-4d64-4269-80ee-80d33661d5e0",
        "firstName": "John Updated",
        "lastName": "Doe",
        "email": "john.doe.updated@example.com",
        "phone": "+6281234567899",
        "dateOfBirth": "1988-03-10",
        "gender": "male",
        "address": "123 Main Street, Updated Address",
        "emergencyContactName": null,
        "emergencyContactPhone": null,
        "notes": "Member information updated",
        "photoUrl": "https://example.com/photos/michael.jpg",
        "joinDate": "2025-11-23",
        "isActive": true,
        "membershipStatus": "expired",
        "createdAt": "2025-11-23T07:10:26.174Z",
        "updatedAt": "2025-11-23T07:31:10.274Z",
        "deletedAt": null
    }
}

Update Member - Change Status to suspended
put
{{base_url}}/gym/members/:memberId
payload:
{
  "membershipStatus": "suspended",
  "isActive": false,
  "notes": "Membership suspended due to payment issue"
}
resp:
{
    "message": "Member updated successfully",
    "member": {
        "id": "7a059f0c-7099-4d22-96b1-cfd5b4c44d6a",
        "tenantId": "1a5c8c84-b7e4-491f-862c-b23618e4774b",
        "userId": "9a7f6f08-4d64-4269-80ee-80d33661d5e0",
        "firstName": "John Updated",
        "lastName": "Doe",
        "email": "john.doe.updated@example.com",
        "phone": "+6281234567899",
        "dateOfBirth": "1988-03-10",
        "gender": "male",
        "address": "123 Main Street, Updated Address",
        "emergencyContactName": null,
        "emergencyContactPhone": null,
        "notes": "Membership suspended due to payment issue",
        "photoUrl": "https://example.com/photos/michael.jpg",
        "joinDate": "2025-11-23",
        "isActive": false,
        "membershipStatus": "suspended",
        "createdAt": "2025-11-23T07:10:26.174Z",
        "updatedAt": "2025-11-23T07:32:15.501Z",
        "deletedAt": null
    }
}

Reset Member Password
post
{{base_url}}}/gym/members/:memberId/reset-password

Delete Member (Soft Delete)
delete
{{base_url}}}/gym/members/:memberId




