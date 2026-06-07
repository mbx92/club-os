Active Service Management

1. Service Management List
Comprehensive list view of all services with interactive display
Get All Active Services
{{base_url}}/service/management/list?page=1&limit=20&sortBy=endDate&sortOrder=ASC
ASC or DESC, endDate or startDate
{
    "data": [
        {
            "id": "51be3928-a8e1-4ad5-95b8-0ef2c38fa278",
            "tenantId": "47203e10-7d65-4879-8c31-be7f32941741",
            "memberId": "33333333-3333-3333-3333-333333333333",
            "servicePlanId": "11111100-0000-0000-0000-000000000001",
            "serviceType": "class_package",
            "startDate": "2025-11-27",
            "endDate": "2026-01-26",
            "totalSessions": 8,
            "remainingSessions": 8,
            "status": "active",
            "autoRenew": false,
            "purchaseTransactionId": "3a91216e-fc0f-4389-93ca-b0b6597f7819",
            "purchaseDate": "2025-11-27T01:07:50.700Z",
            "assignedTrainerId": null,
            "pricePaid": "800000.00",
            "currency": "IDR",
            "voucherId": null,
            "voucherDiscount": "0.00",
            "metadata": {},
            "notes": null,
            "version": 0,
            "createdAt": "2025-11-27T01:07:50.701Z",
            "updatedAt": "2025-11-27T01:07:50.701Z",
            "deletedAt": null,
            "member": {
                "id": "33333333-3333-3333-3333-333333333333",
                "firstName": "Mike",
                "lastName": "Williams",
                "email": "member3@example.com",
                "phone": "081234500003"
            },
            "servicePlan": {
                "id": "11111100-0000-0000-0000-000000000001",
                "name": "8x Yoga Classes",
                "serviceType": "class_package",
                "durationType": "session_based",
                "price": "800000.00",
                "sessions": 8
            },
            "assignedTrainer": null,
            "purchaseTransaction": {
                "id": "3a91216e-fc0f-4389-93ca-b0b6597f7819",
                "transactionNumber": "TRX-202511-0002",
                "totalAmount": "800000.00",
                "createdAt": "2025-11-27T01:07:50.679Z"
            },
            "daysUntilExpiry": 60,
            "isExpiringSoon": false,
            "isExpired": false,
            "usagePercentage": "0.00",
            "isLowSessions": false,
            "alerts": {
                "expiryWarning": null,
                "lowSessionsWarning": null,
                "expiredMessage": null
            }
        },
        {
            "id": "9d0d421e-6960-42ed-851c-f71c7c030350",
            "tenantId": "47203e10-7d65-4879-8c31-be7f32941741",
            "memberId": "11111111-1111-1111-1111-111111111111",
            "servicePlanId": "11111100-0000-0000-0000-000000000002",
            "serviceType": "class_package",
            "startDate": "2025-11-27",
            "endDate": "2026-02-25",
            "totalSessions": 12,
            "remainingSessions": 12,
            "status": "active",
            "autoRenew": false,
            "purchaseTransactionId": "34476e84-2063-4d56-8397-39c340f569ee",
            "purchaseDate": "2025-11-27T00:51:52.462Z",
            "assignedTrainerId": null,
            "pricePaid": "1080000.00",
            "currency": "IDR",
            "voucherId": "37eae75f-023b-40d2-b2c7-0e6245adb68b",
            "voucherDiscount": "120000.00",
            "metadata": {},
            "notes": null,
            "version": 0,
            "createdAt": "2025-11-27T00:51:52.463Z",
            "updatedAt": "2025-11-27T00:51:52.463Z",
            "deletedAt": null,
            "member": {
                "id": "11111111-1111-1111-1111-111111111111",
                "firstName": "John",
                "lastName": "Smith",
                "email": "member1@example.com",
                "phone": "081234500001"
            },
            "servicePlan": {
                "id": "11111100-0000-0000-0000-000000000002",
                "name": "12x Spinning Classes",
                "serviceType": "class_package",
                "durationType": "session_based",
                "price": "1200000.00",
                "sessions": 12
            },
            "assignedTrainer": null,
            "purchaseTransaction": {
                "id": "34476e84-2063-4d56-8397-39c340f569ee",
                "transactionNumber": "TRX-202511-0001",
                "totalAmount": "1080000.00",
                "createdAt": "2025-11-27T00:51:52.408Z"
            },
            "daysUntilExpiry": 90,
            "isExpiringSoon": false,
            "isExpired": false,
            "usagePercentage": "0.00",
            "isLowSessions": false,
            "alerts": {
                "expiryWarning": null,
                "lowSessionsWarning": null,
                "expiredMessage": null
            }
        }
    ],
    "pagination": {
        "currentPage": 1,
        "totalPages": 1,
        "totalItems": 2,
        "itemsPerPage": 20
    }
}

Get Services Expiring Soon (7 Days)
{{base_url}}/service/management/list?expiringInDays=7&status=active
{
    "data": [
        {
            "id": "610e71da-5784-4c60-b10f-d9b86cb54908",
            "tenantId": "47203e10-7d65-4879-8c31-be7f32941741",
            "memberId": "44444444-4444-4444-4444-444444444444",
            "servicePlanId": "2086b025-182a-4ee7-b168-dbb2ca08a9dc",
            "serviceType": "membership",
            "startDate": "2025-11-27",
            "endDate": "2025-12-03",
            "totalSessions": null,
            "remainingSessions": null,
            "status": "active",
            "autoRenew": false,
            "purchaseTransactionId": "f789af03-0718-4348-aeb6-914c9eedea24",
            "purchaseDate": "2025-11-27T01:17:56.805Z",
            "assignedTrainerId": null,
            "pricePaid": "500000.00",
            "currency": "IDR",
            "voucherId": null,
            "voucherDiscount": "0.00",
            "metadata": {},
            "notes": null,
            "version": 0,
            "createdAt": "2025-11-27T01:17:56.806Z",
            "updatedAt": "2025-11-27T01:17:56.806Z",
            "deletedAt": null,
            "member": {
                "id": "44444444-4444-4444-4444-444444444444",
                "firstName": "Sarah",
                "lastName": "Brown",
                "email": "member4@example.com",
                "phone": "081234500004"
            },
            "servicePlan": {
                "id": "2086b025-182a-4ee7-b168-dbb2ca08a9dc",
                "name": "6 Days Gym Membership",
                "serviceType": "membership",
                "durationType": "time_based",
                "price": "500000.00",
                "sessions": null
            },
            "assignedTrainer": null,
            "purchaseTransaction": {
                "id": "f789af03-0718-4348-aeb6-914c9eedea24",
                "transactionNumber": "TRX-202511-0003",
                "totalAmount": "500000.00",
                "createdAt": "2025-11-27T01:17:56.775Z"
            },
            "daysUntilExpiry": 6,
            "isExpiringSoon": true,
            "isExpired": false,
            "usagePercentage": 0,
            "isLowSessions": null,
            "alerts": {
                "expiryWarning": "Layanan akan berakhir dalam 6 hari",
                "lowSessionsWarning": null,
                "expiredMessage": null
            }
        }
    ],
    "pagination": {
        "currentPage": 1,
        "totalPages": 1,
        "totalItems": 1,
        "itemsPerPage": 20
    }
}

Get Services with Low Sessions
{{base_url}}/service/management/list?lowSessionsThreshold=15&status=active
{
    "data": [
        {
            "id": "51be3928-a8e1-4ad5-95b8-0ef2c38fa278",
            "tenantId": "47203e10-7d65-4879-8c31-be7f32941741",
            "memberId": "33333333-3333-3333-3333-333333333333",
            "servicePlanId": "11111100-0000-0000-0000-000000000001",
            "serviceType": "class_package",
            "startDate": "2025-11-27",
            "endDate": "2026-01-26",
            "totalSessions": 8,
            "remainingSessions": 8,
            "status": "active",
            "autoRenew": false,
            "purchaseTransactionId": "3a91216e-fc0f-4389-93ca-b0b6597f7819",
            "purchaseDate": "2025-11-27T01:07:50.700Z",
            "assignedTrainerId": null,
            "pricePaid": "800000.00",
            "currency": "IDR",
            "voucherId": null,
            "voucherDiscount": "0.00",
            "metadata": {},
            "notes": null,
            "version": 0,
            "createdAt": "2025-11-27T01:07:50.701Z",
            "updatedAt": "2025-11-27T01:07:50.701Z",
            "deletedAt": null,
            "member": {
                "id": "33333333-3333-3333-3333-333333333333",
                "firstName": "Mike",
                "lastName": "Williams",
                "email": "member3@example.com",
                "phone": "081234500003"
            },
            "servicePlan": {
                "id": "11111100-0000-0000-0000-000000000001",
                "name": "8x Yoga Classes",
                "serviceType": "class_package",
                "durationType": "session_based",
                "price": "800000.00",
                "sessions": 8
            },
            "assignedTrainer": null,
            "purchaseTransaction": {
                "id": "3a91216e-fc0f-4389-93ca-b0b6597f7819",
                "transactionNumber": "TRX-202511-0002",
                "totalAmount": "800000.00",
                "createdAt": "2025-11-27T01:07:50.679Z"
            },
            "daysUntilExpiry": 60,
            "isExpiringSoon": false,
            "isExpired": false,
            "usagePercentage": "0.00",
            "isLowSessions": false,
            "alerts": {
                "expiryWarning": null,
                "lowSessionsWarning": null,
                "expiredMessage": null
            }
        },
        {
            "id": "9d0d421e-6960-42ed-851c-f71c7c030350",
            "tenantId": "47203e10-7d65-4879-8c31-be7f32941741",
            "memberId": "11111111-1111-1111-1111-111111111111",
            "servicePlanId": "11111100-0000-0000-0000-000000000002",
            "serviceType": "class_package",
            "startDate": "2025-11-27",
            "endDate": "2026-02-25",
            "totalSessions": 12,
            "remainingSessions": 12,
            "status": "active",
            "autoRenew": false,
            "purchaseTransactionId": "34476e84-2063-4d56-8397-39c340f569ee",
            "purchaseDate": "2025-11-27T00:51:52.462Z",
            "assignedTrainerId": null,
            "pricePaid": "1080000.00",
            "currency": "IDR",
            "voucherId": "37eae75f-023b-40d2-b2c7-0e6245adb68b",
            "voucherDiscount": "120000.00",
            "metadata": {},
            "notes": null,
            "version": 0,
            "createdAt": "2025-11-27T00:51:52.463Z",
            "updatedAt": "2025-11-27T00:51:52.463Z",
            "deletedAt": null,
            "member": {
                "id": "11111111-1111-1111-1111-111111111111",
                "firstName": "John",
                "lastName": "Smith",
                "email": "member1@example.com",
                "phone": "081234500001"
            },
            "servicePlan": {
                "id": "11111100-0000-0000-0000-000000000002",
                "name": "12x Spinning Classes",
                "serviceType": "class_package",
                "durationType": "session_based",
                "price": "1200000.00",
                "sessions": 12
            },
            "assignedTrainer": null,
            "purchaseTransaction": {
                "id": "34476e84-2063-4d56-8397-39c340f569ee",
                "transactionNumber": "TRX-202511-0001",
                "totalAmount": "1080000.00",
                "createdAt": "2025-11-27T00:51:52.408Z"
            },
            "daysUntilExpiry": 90,
            "isExpiringSoon": false,
            "isExpired": false,
            "usagePercentage": "0.00",
            "isLowSessions": false,
            "alerts": {
                "expiryWarning": null,
                "lowSessionsWarning": null,
                "expiredMessage": null
            }
        }
    ],
    "pagination": {
        "currentPage": 1,
        "totalPages": 1,
        "totalItems": 2,
        "itemsPerPage": 20
    }
}

Filter by Service Type
{{base_url}}/service/management/list?serviceType=membership&status=active
serviceType: membership, class_package, pt_package, spa_package, 

{
    "data": [
        {
            "id": "610e71da-5784-4c60-b10f-d9b86cb54908",
            "tenantId": "47203e10-7d65-4879-8c31-be7f32941741",
            "memberId": "44444444-4444-4444-4444-444444444444",
            "servicePlanId": "2086b025-182a-4ee7-b168-dbb2ca08a9dc",
            "serviceType": "membership",
            "startDate": "2025-11-27",
            "endDate": "2025-12-03",
            "totalSessions": null,
            "remainingSessions": null,
            "status": "active",
            "autoRenew": false,
            "purchaseTransactionId": "f789af03-0718-4348-aeb6-914c9eedea24",
            "purchaseDate": "2025-11-27T01:17:56.805Z",
            "assignedTrainerId": null,
            "pricePaid": "500000.00",
            "currency": "IDR",
            "voucherId": null,
            "voucherDiscount": "0.00",
            "metadata": {},
            "notes": null,
            "version": 0,
            "createdAt": "2025-11-27T01:17:56.806Z",
            "updatedAt": "2025-11-27T01:17:56.806Z",
            "deletedAt": null,
            "member": {
                "id": "44444444-4444-4444-4444-444444444444",
                "firstName": "Sarah",
                "lastName": "Brown",
                "email": "member4@example.com",
                "phone": "081234500004"
            },
            "servicePlan": {
                "id": "2086b025-182a-4ee7-b168-dbb2ca08a9dc",
                "name": "6 Days Gym Membership",
                "serviceType": "membership",
                "durationType": "time_based",
                "price": "500000.00",
                "sessions": null
            },
            "assignedTrainer": null,
            "purchaseTransaction": {
                "id": "f789af03-0718-4348-aeb6-914c9eedea24",
                "transactionNumber": "TRX-202511-0003",
                "totalAmount": "500000.00",
                "createdAt": "2025-11-27T01:17:56.775Z"
            },
            "daysUntilExpiry": 6,
            "isExpiringSoon": true,
            "isExpired": false,
            "usagePercentage": 0,
            "isLowSessions": null,
            "alerts": {
                "expiryWarning": "Layanan akan berakhir dalam 6 hari",
                "lowSessionsWarning": null,
                "expiredMessage": null
            }
        }
    ],
    "pagination": {
        "currentPage": 1,
        "totalPages": 1,
        "totalItems": 1,
        "itemsPerPage": 20
    }
}


Get Filter by Trainer
{{base_url}}/service/management/list?trainerId={{trainer_id}}&status=active

Search by Member Name
{{base_url}}/service/management/list?search=john&page=1&limit=20

Get Active Service by MemberId
{{base_url}}/service/management/member/:memberId
{
    "data": {
        "member": {
            "id": "11111111-1111-1111-1111-111111111111",
            "fullName": "John Smith",
            "email": "member1@example.com",
            "phone": "081234500001",
            "membershipStatus": "active"
        },
        "services": [
            {
                "id": "9d0d421e-6960-42ed-851c-f71c7c030350",
                "tenantId": "47203e10-7d65-4879-8c31-be7f32941741",
                "memberId": "11111111-1111-1111-1111-111111111111",
                "servicePlanId": "11111100-0000-0000-0000-000000000002",
                "serviceType": "class_package",
                "startDate": "2025-11-27",
                "endDate": "2026-02-25",
                "totalSessions": 12,
                "remainingSessions": 12,
                "status": "active",
                "autoRenew": false,
                "purchaseTransactionId": "34476e84-2063-4d56-8397-39c340f569ee",
                "purchaseDate": "2025-11-27T00:51:52.462Z",
                "assignedTrainerId": null,
                "pricePaid": "1080000.00",
                "currency": "IDR",
                "voucherId": "37eae75f-023b-40d2-b2c7-0e6245adb68b",
                "voucherDiscount": "120000.00",
                "metadata": {},
                "notes": null,
                "version": 0,
                "createdAt": "2025-11-27T00:51:52.463Z",
                "updatedAt": "2025-11-27T00:51:52.463Z",
                "deletedAt": null,
                "servicePlan": {
                    "id": "11111100-0000-0000-0000-000000000002",
                    "name": "12x Spinning Classes",
                    "serviceType": "class_package",
                    "durationType": "session_based",
                    "price": "1200000.00",
                    "sessions": 12,
                    "validityDays": 90
                },
                "assignedTrainer": null,
                "purchaseTransaction": {
                    "id": "34476e84-2063-4d56-8397-39c340f569ee",
                    "transactionNumber": "TRX-202511-0001",
                    "totalAmount": "1080000.00",
                    "createdAt": "2025-11-27T00:51:52.408Z"
                },
                "daysRemaining": 90,
                "isExpiringSoon": false,
                "hasLowSessions": false,
                "usagePercentage": "0.00",
                "pricePerSession": "90000.00"
            }
        ],
        "summary": {
            "totalServices": 1,
            "activeCount": 1,
            "expiredCount": 0,
            "depletedCount": 0,
            "suspendedCount": 0,
            "totalRemainingSessions": 12
        }
    }
}


2. Calendar View
Calendar view for monthly service tracking


Get Services Calendar - Current Month
{{base_url}}/service/management/calendar?year={{current_year}}&month={{current_month}}
{
    "data": {
        "year": 2025,
        "month": 11,
        "events": [
            {
                "date": "2025-11-27",
                "type": "start",
                "eventType": "service_start",
                "title": "John Smith - 12x Spinning Classes",
                "serviceId": "9d0d421e-6960-42ed-851c-f71c7c030350",
                "memberId": "11111111-1111-1111-1111-111111111111",
                "memberName": "John Smith",
                "serviceName": "12x Spinning Classes",
                "serviceType": "class_package",
                "status": "active",
                "remainingSessions": 12,
                "trainerName": null
            },
            {
                "date": "2025-11-27",
                "type": "start",
                "eventType": "service_start",
                "title": "Mike Williams - 8x Yoga Classes",
                "serviceId": "51be3928-a8e1-4ad5-95b8-0ef2c38fa278",
                "memberId": "33333333-3333-3333-3333-333333333333",
                "memberName": "Mike Williams",
                "serviceName": "8x Yoga Classes",
                "serviceType": "class_package",
                "status": "active",
                "remainingSessions": 8,
                "trainerName": null
            },
            {
                "date": "2025-11-27",
                "type": "start",
                "eventType": "service_start",
                "title": "Sarah Brown - 6 Days Gym Membership",
                "serviceId": "610e71da-5784-4c60-b10f-d9b86cb54908",
                "memberId": "44444444-4444-4444-4444-444444444444",
                "memberName": "Sarah Brown",
                "serviceName": "6 Days Gym Membership",
                "serviceType": "membership",
                "status": "active",
                "remainingSessions": null,
                "trainerName": null
            }
        ],
        "summary": {
            "totalServices": 3,
            "activeServices": 3,
            "expiringThisMonth": 0
        }
    }
}

Get Calendar - Month Year
{{base_url}}/service/management/calendar?year=2025&month=11

Get Calendar - Filter by Service Type
{{base_url}}/service/management/calendar?year=2025&month=12&serviceType=pt_package

Get Calendar - Specific Member
{{base_url}}/service/management/calendar?year=2025&month=12&memberId={{member_id}}

3. Alerts & Notifications
Get Service Alerts (Default)
{{base_url}}/service/management/alerts
{
    "data": {
        "expiring": [
            {
                "type": "expiring",
                "severity": "medium",
                "serviceId": "610e71da-5784-4c60-b10f-d9b86cb54908",
                "memberId": "44444444-4444-4444-4444-444444444444",
                "memberName": "Sarah Brown",
                "memberPhone": "081234500004",
                "serviceName": "6 Days Gym Membership",
                "serviceType": "membership",
                "endDate": "2025-12-03",
                "daysUntilExpiry": 6,
                "message": "Layanan akan berakhir dalam 6 hari"
            }
        ],
        "lowSessions": []
    },
    "summary": {
        "totalAlerts": 1,
        "expiringServices": 1,
        "lowSessionServices": 0,
        "highSeverity": 0
    }
}

Get Alerts - Custom Thresholds
{{base_url}}/service/management/alerts?daysThreshold=35&lowSessionsThreshold=5
{
    "data": {
        "expiring": [
            {
                "type": "expiring",
                "severity": "medium",
                "serviceId": "610e71da-5784-4c60-b10f-d9b86cb54908",
                "memberId": "44444444-4444-4444-4444-444444444444",
                "memberName": "Sarah Brown",
                "memberPhone": "081234500004",
                "serviceName": "6 Days Gym Membership",
                "serviceType": "membership",
                "endDate": "2025-12-03",
                "daysUntilExpiry": 6,
                "message": "Layanan akan berakhir dalam 6 hari"
            }
        ],
        "lowSessions": []
    },
    "summary": {
        "totalAlerts": 1,
        "expiringServices": 1,
        "lowSessionServices": 0,
        "highSeverity": 0
    }
}

Get High Priority Alerts Only
{{base_url}}/service/management/alerts?daysThreshold=3&lowSessionsThreshold=1

4. Statistics
Get Service Statistics
{{base_url}}/service/management/stats
{
    "data": {
        "byStatus": [
            {
                "status": "active",
                "count": "3"
            }
        ],
        "byServiceType": [
            {
                "serviceType": "membership",
                "count": "1"
            },
            {
                "serviceType": "class_package",
                "count": "2"
            }
        ],
        "alerts": {
            "expiring": 1,
            "lowSessions": 0
        }
    }
}


5. Trainer Assignment
Assign Trainer to Service
{{base_url}}/service/management/{{service_id}}/assign-trainer
Payload:
{
  "trainerId": "{{trainer_id}}"
}

6. Real-World Scenarios
Scenario 1: Renewal Campaign (Expiring Services)
Get : {{base_url}}/service/management/list?expiringInDays=7&status=active
Scenario 2: Trainer Workload Analysis
Get : {{base_url}}/service/management/list?trainerId={{trainer_id}}&status=active
Scenario 3: Dashboard Overview
Get : {{base_url}}/service/management/stats



