Tenant Vouchers
Tenant-scoped vouchers for gym operations (membership, products)

Create Tenant Voucher (Percentage)
post
{{base_url}}/vouchers
payload: 
{
  "code": "GYM2025DISC",
  "name": "New Year Discount 2025",
  "description": "Special discount for new year promotion",
  "type": "percentage",
  "value": 20,
  "maxDiscountAmount": 100000,
  "minPurchaseAmount": 500000,
  "applicableTo": "membership",
  "applicableItems": [],
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-01-31T23:59:59.999Z",
  "usageLimit": 100,
  "userUsageLimit": 1,
  "isActive": true,
  "isPublic": true
}
resp:
{
    "success": true,
    "message": "Voucher created successfully",
    "data": {
        "voucher": {
            "id": "bd116fea-582f-47cf-838d-c599bc0326db",
            "tenantId": "55288f84-7c8e-4951-8def-c181884eccd6",
            "scope": "tenant",
            "code": "GYM2025DISC",
            "name": "New Year Discount 2025",
            "description": "Special discount for new year promotion",
            "type": "percentage",
            "value": "20.00",
            "maxDiscountAmount": "100000.00",
            "minPurchaseAmount": "500000.00",
            "applicableTo": "membership",
            "applicableItems": [],
            "startDate": "2025-01-01T00:00:00.000Z",
            "endDate": "2025-01-31T23:59:59.999Z",
            "usageLimit": 100,
            "usageCount": 0,
            "userUsageLimit": 1,
            "isActive": true,
            "isPublic": true,
            "createdBy": "530a1da2-a84b-4612-b8df-f899a79637d0",
            "updatedBy": null,
            "version": 0,
            "createdAt": "2025-11-23T10:58:59.537Z",
            "updatedAt": "2025-11-23T10:58:59.537Z",
            "deletedAt": null,
            "tenant": {
                "id": "55288f84-7c8e-4951-8def-c181884eccd6",
                "name": "Tenant A"
            },
            "creator": {
                "id": "530a1da2-a84b-4612-b8df-f899a79637d0",
                "firstName": "Admin",
                "lastName": "User",
                "email": "admin@tenant-a.com"
            }
        }
    }
}

Create Tenant Voucher (Fixed Amount)
post
{{base_url}}/vouchers
Payload:
{
  "code": "FIRSTPURCHASE50K",
  "name": "First Purchase Discount",
  "description": "Discount Rp 50.000 for first purchase",
  "type": "fixed",
  "value": 50000,
  "minPurchaseAmount": 200000,
  "applicableTo": "all",
  "applicableItems": [],
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-12-31T23:59:59.999Z",
  "userUsageLimit": 1,
  "isActive": true,
  "isPublic": true
}
resp:
{
    "success": true,
    "message": "Voucher created successfully",
    "data": {
        "voucher": {
            "id": "001a4551-85f3-4be8-8545-0d0a482b2158",
            "tenantId": "55288f84-7c8e-4951-8def-c181884eccd6",
            "scope": "tenant",
            "code": "FIRSTPURCHASE50K",
            "name": "First Purchase Discount",
            "description": "Discount Rp 50.000 for first purchase",
            "type": "fixed",
            "value": "50000.00",
            "maxDiscountAmount": null,
            "minPurchaseAmount": "200000.00",
            "applicableTo": "all",
            "applicableItems": [],
            "startDate": "2025-01-01T00:00:00.000Z",
            "endDate": "2025-12-31T23:59:59.999Z",
            "usageLimit": null,
            "usageCount": 0,
            "userUsageLimit": 1,
            "isActive": true,
            "isPublic": true,
            "createdBy": "530a1da2-a84b-4612-b8df-f899a79637d0",
            "updatedBy": null,
            "version": 0,
            "createdAt": "2025-11-23T10:59:59.171Z",
            "updatedAt": "2025-11-23T10:59:59.171Z",
            "deletedAt": null,
            "tenant": {
                "id": "55288f84-7c8e-4951-8def-c181884eccd6",
                "name": "Tenant A"
            },
            "creator": {
                "id": "530a1da2-a84b-4612-b8df-f899a79637d0",
                "firstName": "Admin",
                "lastName": "User",
                "email": "admin@tenant-a.com"
            }
        }
    }
}

Create Product Voucher
post
{{base_url}}/vouchers
payload:
{
  "code": "PROTEIN10",
  "name": "10% OFF Protein Products",
  "description": "Discount for protein products",
  "type": "percentage",
  "value": 10,
  "applicableTo": "product",
  "applicableItems": [],
  "startDate": "2025-01-01T00:00:00.000Z",
  "endDate": "2025-12-31T23:59:59.999Z",
  "isActive": true,
  "isPublic": true
}

Resp:
{
    "success": true,
    "message": "Voucher created successfully",
    "data": {
        "voucher": {
            "id": "d15996f1-8fce-45ec-8e99-c266ac7a1b82",
            "tenantId": "55288f84-7c8e-4951-8def-c181884eccd6",
            "scope": "tenant",
            "code": "PROTEIN10",
            "name": "10% OFF Protein Products",
            "description": "Discount for protein products",
            "type": "percentage",
            "value": "10.00",
            "maxDiscountAmount": null,
            "minPurchaseAmount": "0.00",
            "applicableTo": "product",
            "applicableItems": [],
            "startDate": "2025-01-01T00:00:00.000Z",
            "endDate": "2025-12-31T23:59:59.999Z",
            "usageLimit": null,
            "usageCount": 0,
            "userUsageLimit": null,
            "isActive": true,
            "isPublic": true,
            "createdBy": "530a1da2-a84b-4612-b8df-f899a79637d0",
            "updatedBy": null,
            "version": 0,
            "createdAt": "2025-11-23T11:00:47.743Z",
            "updatedAt": "2025-11-23T11:00:47.743Z",
            "deletedAt": null,
            "tenant": {
                "id": "55288f84-7c8e-4951-8def-c181884eccd6",
                "name": "Tenant A"
            },
            "creator": {
                "id": "530a1da2-a84b-4612-b8df-f899a79637d0",
                "firstName": "Admin",
                "lastName": "User",
                "email": "admin@tenant-a.com"
            }
        }
    }
}

Validate Voucher
Post
{{base_url}}/vouchers/validate/{{voucher_code}}
Payload:
{
  "amount": 1000000,
  "applicableTo": "membership",
  "itemId": "{{membership_id}}"
}
Resp:
{
    "success": true,
    "data": {
        "voucher": {
            "id": "d15996f1-8fce-45ec-8e99-c266ac7a1b82",
            "code": "PROTEIN10",
            "name": "10% OFF Protein Products",
            "type": "percentage",
            "value": "10.00",
            "version": 0
        },
        "validation": {
            "isValid": true,
            "discountAmount": 100000,
            "originalAmount": 1000000,
            "finalAmount": 900000
        }
    }
}

Get All Tenant Vouchers
Get
{{base_url}}/vouchers?page=1&limit=10&status=all&type=&applicableTo=&search=&sortBy=createdAt&sortOrder=DESC
Status: all, active, inactive, expired, upcoming
Type: percentage or fixed

Resp:
{
    "success": true,
    "message": "Vouchers retrieved successfully",
    "data": {
        "vouchers": [
            {
                "id": "d15996f1-8fce-45ec-8e99-c266ac7a1b82",
                "tenantId": "55288f84-7c8e-4951-8def-c181884eccd6",
                "scope": "tenant",
                "code": "PROTEIN10",
                "name": "10% OFF Protein Products",
                "description": "Discount for protein products",
                "type": "percentage",
                "value": "10.00",
                "maxDiscountAmount": null,
                "minPurchaseAmount": "0.00",
                "applicableTo": "product",
                "applicableItems": [],
                "startDate": "2025-01-01T00:00:00.000Z",
                "endDate": "2025-12-31T23:59:59.999Z",
                "usageLimit": null,
                "usageCount": 0,
                "userUsageLimit": null,
                "isActive": true,
                "isPublic": true,
                "createdBy": "530a1da2-a84b-4612-b8df-f899a79637d0",
                "updatedBy": null,
                "version": 0,
                "createdAt": "2025-11-23T11:00:47.743Z",
                "updatedAt": "2025-11-23T11:00:47.743Z",
                "deletedAt": null,
                "tenant": {
                    "id": "55288f84-7c8e-4951-8def-c181884eccd6",
                    "name": "Tenant A"
                },
                "creator": {
                    "id": "530a1da2-a84b-4612-b8df-f899a79637d0",
                    "firstName": "Admin",
                    "lastName": "User",
                    "email": "admin@tenant-a.com"
                },
                "voucherUsages": []
            },
            {
                "id": "001a4551-85f3-4be8-8545-0d0a482b2158",
                "tenantId": "55288f84-7c8e-4951-8def-c181884eccd6",
                "scope": "tenant",
                "code": "FIRSTPURCHASE50K",
                "name": "First Purchase Discount",
                "description": "Discount Rp 50.000 for first purchase",
                "type": "fixed",
                "value": "50000.00",
                "maxDiscountAmount": null,
                "minPurchaseAmount": "200000.00",
                "applicableTo": "all",
                "applicableItems": [],
                "startDate": "2025-01-01T00:00:00.000Z",
                "endDate": "2025-12-31T23:59:59.999Z",
                "usageLimit": null,
                "usageCount": 0,
                "userUsageLimit": 1,
                "isActive": true,
                "isPublic": true,
                "createdBy": "530a1da2-a84b-4612-b8df-f899a79637d0",
                "updatedBy": null,
                "version": 0,
                "createdAt": "2025-11-23T10:59:59.171Z",
                "updatedAt": "2025-11-23T10:59:59.171Z",
                "deletedAt": null,
                "tenant": {
                    "id": "55288f84-7c8e-4951-8def-c181884eccd6",
                    "name": "Tenant A"
                },
                "creator": {
                    "id": "530a1da2-a84b-4612-b8df-f899a79637d0",
                    "firstName": "Admin",
                    "lastName": "User",
                    "email": "admin@tenant-a.com"
                },
                "voucherUsages": []
            },
            {
                "id": "bd116fea-582f-47cf-838d-c599bc0326db",
                "tenantId": "55288f84-7c8e-4951-8def-c181884eccd6",
                "scope": "tenant",
                "code": "GYM2025DISC",
                "name": "New Year Discount 2025",
                "description": "Special discount for new year promotion",
                "type": "percentage",
                "value": "20.00",
                "maxDiscountAmount": "100000.00",
                "minPurchaseAmount": "500000.00",
                "applicableTo": "membership",
                "applicableItems": [],
                "startDate": "2025-01-01T00:00:00.000Z",
                "endDate": "2025-01-31T23:59:59.999Z",
                "usageLimit": 100,
                "usageCount": 0,
                "userUsageLimit": 1,
                "isActive": true,
                "isPublic": true,
                "createdBy": "530a1da2-a84b-4612-b8df-f899a79637d0",
                "updatedBy": null,
                "version": 0,
                "createdAt": "2025-11-23T10:58:59.537Z",
                "updatedAt": "2025-11-23T10:58:59.537Z",
                "deletedAt": null,
                "tenant": {
                    "id": "55288f84-7c8e-4951-8def-c181884eccd6",
                    "name": "Tenant A"
                },
                "creator": {
                    "id": "530a1da2-a84b-4612-b8df-f899a79637d0",
                    "firstName": "Admin",
                    "lastName": "User",
                    "email": "admin@tenant-a.com"
                },
                "voucherUsages": []
            }
        ],
        "pagination": {
            "total": 3,
            "page": 1,
            "limit": 10,
            "totalPages": 1
        }
    }
}

Get Voucher by ID
Get
{{base_url}}/vouchers/{{voucher_id}}
Resp:
{
    "success": true,
    "message": "Voucher retrieved successfully",
    "data": {
        "voucher": {
            "id": "001a4551-85f3-4be8-8545-0d0a482b2158",
            "tenantId": "55288f84-7c8e-4951-8def-c181884eccd6",
            "scope": "tenant",
            "code": "FIRSTPURCHASE50K",
            "name": "First Purchase Discount",
            "description": "Discount Rp 50.000 for first purchase",
            "type": "fixed",
            "value": "50000.00",
            "maxDiscountAmount": null,
            "minPurchaseAmount": "200000.00",
            "applicableTo": "all",
            "applicableItems": [],
            "startDate": "2025-01-01T00:00:00.000Z",
            "endDate": "2025-12-31T23:59:59.999Z",
            "usageLimit": null,
            "usageCount": 0,
            "userUsageLimit": 1,
            "isActive": true,
            "isPublic": true,
            "createdBy": "530a1da2-a84b-4612-b8df-f899a79637d0",
            "updatedBy": null,
            "version": 0,
            "createdAt": "2025-11-23T10:59:59.171Z",
            "updatedAt": "2025-11-23T10:59:59.171Z",
            "deletedAt": null,
            "tenant": {
                "id": "55288f84-7c8e-4951-8def-c181884eccd6",
                "name": "Tenant A",
                "settings": {
                    "workingHours": {
                        "monday": [
                            "08:00",
                            "22:00"
                        ],
                        "tuesday": [
                            "08:00",
                            "22:00"
                        ],
                        "wednesday": [
                            "08:00",
                            "22:00"
                        ],
                        "thursday": [
                            "08:00",
                            "22:00"
                        ],
                        "friday": [
                            "08:00",
                            "22:00"
                        ],
                        "saturday": [
                            "08:00",
                            "20:00"
                        ],
                        "sunday": [
                            "08:00",
                            "20:00"
                        ]
                    },
                    "currency": "USD",
                    "timezone": "Asia/Jakarta"
                }
            },
            "creator": {
                "id": "530a1da2-a84b-4612-b8df-f899a79637d0",
                "firstName": "Admin",
                "lastName": "User",
                "email": "admin@tenant-a.com"
            },
            "updater": null,
            "voucherUsages": []
        }
    }
}

Get Voucher Statistics
Get
{{base_url}}/vouchers/{{voucher_id}}/statistics?page=1&limit=10
{
    "success": true,
    "message": "Voucher statistics retrieved successfully",
    "data": {
        "voucher": {
            "id": "001a4551-85f3-4be8-8545-0d0a482b2158",
            "name": "First Purchase Discount",
            "code": "FIRSTPURCHASE50K",
            "type": "fixed",
            "value": "50000.00",
            "scope": "tenant",
            "usageLimit": null,
            "usageCount": 0
        },
        "statistics": {
            "totalUsage": 0,
            "totalDiscount": 0,
            "averageDiscount": 0,
            "remainingUsage": "Unlimited"
        },
        "usages": [],
        "pagination": {
            "total": 0,
            "page": 1,
            "limit": 10,
            "totalPages": 0
        }
    }
}

Update Tenant Voucher
Put
{{base_url}}/vouchers/{{voucher_id}}
Payload: 
{
  "name": "New Year Discount 2025 (Extended)",
  "description": "Extended until February",
  "value": 25,
  "maxDiscountAmount": 150000,
  "endDate": "2025-02-28T23:59:59.999Z",
  "isActive": true
}
Resp:
{
    "success": true,
    "message": "Voucher updated successfully",
    "data": {
        "voucher": {
            "id": "001a4551-85f3-4be8-8545-0d0a482b2158",
            "tenantId": "55288f84-7c8e-4951-8def-c181884eccd6",
            "scope": "tenant",
            "code": "FIRSTPURCHASE50K",
            "name": "New Year Discount 2025 (Extended)",
            "description": "Extended until February",
            "type": "fixed",
            "value": "25.00",
            "maxDiscountAmount": "150000.00",
            "minPurchaseAmount": "200000.00",
            "applicableTo": "all",
            "applicableItems": [],
            "startDate": "2025-01-01T00:00:00.000Z",
            "endDate": "2025-02-28T23:59:59.999Z",
            "usageLimit": null,
            "usageCount": 0,
            "userUsageLimit": 1,
            "isActive": true,
            "isPublic": true,
            "createdBy": "530a1da2-a84b-4612-b8df-f899a79637d0",
            "updatedBy": "530a1da2-a84b-4612-b8df-f899a79637d0",
            "version": 1,
            "createdAt": "2025-11-23T10:59:59.171Z",
            "updatedAt": "2025-11-23T11:05:42.215Z",
            "deletedAt": null,
            "tenant": {
                "id": "55288f84-7c8e-4951-8def-c181884eccd6",
                "name": "Tenant A"
            },
            "creator": {
                "id": "530a1da2-a84b-4612-b8df-f899a79637d0",
                "firstName": "Admin",
                "lastName": "User",
                "email": "admin@tenant-a.com"
            },
            "updater": {
                "id": "530a1da2-a84b-4612-b8df-f899a79637d0",
                "firstName": "Admin",
                "lastName": "User",
                "email": "admin@tenant-a.com"
            }
        }
    }
}

Delete Tenant Voucher
delete
{{base_url}}/vouchers/{{voucher_id}}

