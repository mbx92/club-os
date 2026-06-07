Check-ins Management

Check-Ins
1. Create Check-In (General Membership)
Post: {{base_url}}/gym/check-ins
Payload: {
  "memberId": "{{member_id}}",
  "notes": "Morning workout session"
}
2. Create Check-In (PT Package - Auto Session Usage)
{{base_url}}/gym/check-ins
Payload: 
{
  "memberId": "{{member_id}}",
  "serviceType": "pt_package",
  "notes": "Upper body training - chest & triceps"
}
3. Create Check-In (Class Package)
{{base_url}}/gym/check-ins
Payload:
{
  "memberId": "{{member_id}}",
  "serviceType": "class_package",
  "notes": "Yoga class - morning session"
}

Resp:
{
    "message": "Check-in successful",
    "data": {
        "checkIn": {
            "id": "d1061ef5-390c-498f-9238-0f5a6645b5a9",
            "tenantId": "47203e10-7d65-4879-8c31-be7f32941741",
            "memberId": "11111111-1111-1111-1111-111111111111",
            "checkInTime": "2025-11-27T01:44:10.645Z",
            "checkOutTime": null,
            "checkedInBy": "f40195da-c3c9-4128-972e-da016593a3f6",
            "activeServiceId": "9d0d421e-6960-42ed-851c-f71c7c030350",
            "notes": "Yoga class - morning session",
            "createdAt": "2025-11-27T01:44:10.645Z",
            "updatedAt": "2025-11-27T01:44:10.645Z",
            "member": {
                "id": "11111111-1111-1111-1111-111111111111",
                "firstName": "John",
                "lastName": "Smith",
                "email": "member1@example.com",
                "phone": "081234500001"
            },
            "checkedBy": {
                "id": "f40195da-c3c9-4128-972e-da016593a3f6",
                "firstName": "Admin",
                "lastName": "User"
            }
        },
        "activeService": {
            "id": "9d0d421e-6960-42ed-851c-f71c7c030350",
            "serviceType": "class_package",
            "servicePlanName": "12x Spinning Classes",
            "remainingSessions": 11,
            "totalSessions": 12,
            "endDate": "2026-02-25",
            "status": "active"
        },
        "sessionUsed": true
    }
}

4. Get All Check-Ins
{{base_url}}/gym/check-ins?page=1&limit=20&sortBy=checkInTime&sortOrder=DESC
{
    "data": [
        {
            "id": "d1061ef5-390c-498f-9238-0f5a6645b5a9",
            "tenantId": "47203e10-7d65-4879-8c31-be7f32941741",
            "memberId": "11111111-1111-1111-1111-111111111111",
            "checkInTime": "2025-11-27T01:44:10.645Z",
            "checkOutTime": null,
            "checkedInBy": "f40195da-c3c9-4128-972e-da016593a3f6",
            "activeServiceId": "9d0d421e-6960-42ed-851c-f71c7c030350",
            "notes": "Yoga class - morning session",
            "createdAt": "2025-11-27T01:44:10.645Z",
            "updatedAt": "2025-11-27T01:44:10.645Z",
            "member": {
                "id": "11111111-1111-1111-1111-111111111111",
                "firstName": "John",
                "lastName": "Smith",
                "email": "member1@example.com",
                "phone": "081234500001"
            },
            "checkedBy": {
                "id": "f40195da-c3c9-4128-972e-da016593a3f6",
                "firstName": "Admin",
                "lastName": "User"
            }
        }
    ],
    "pagination": {
        "currentPage": 1,
        "totalPages": 1,
        "totalRecords": 1,
        "limit": 20,
        "hasNextPage": false,
        "hasPrevPage": false
    },
    "filters": {
        "sortBy": "checkInTime",
        "sortOrder": "DESC"
    }
}

5. Get Check-Ins by Member
{{base_url}}/gym/check-ins?memberId={{member_id}}&page=1&limit=10
{
    "data": [
        {
            "id": "d1061ef5-390c-498f-9238-0f5a6645b5a9",
            "tenantId": "47203e10-7d65-4879-8c31-be7f32941741",
            "memberId": "11111111-1111-1111-1111-111111111111",
            "checkInTime": "2025-11-27T01:44:10.645Z",
            "checkOutTime": null,
            "checkedInBy": "f40195da-c3c9-4128-972e-da016593a3f6",
            "activeServiceId": "9d0d421e-6960-42ed-851c-f71c7c030350",
            "notes": "Yoga class - morning session",
            "createdAt": "2025-11-27T01:44:10.645Z",
            "updatedAt": "2025-11-27T01:44:10.645Z",
            "member": {
                "id": "11111111-1111-1111-1111-111111111111",
                "firstName": "John",
                "lastName": "Smith",
                "email": "member1@example.com",
                "phone": "081234500001"
            },
            "checkedBy": {
                "id": "f40195da-c3c9-4128-972e-da016593a3f6",
                "firstName": "Admin",
                "lastName": "User"
            }
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
        "memberId": "11111111-1111-1111-1111-111111111111",
        "sortBy": "checkInTime",
        "sortOrder": "DESC"
    }
}
6. Get Check-Ins by Date Range
{{base_url}}/gym/check-ins?startDate=2025-11-01T00:00:00Z&endDate=2025-11-30T23:59:59Z
7. Get Check-Ins by Service Type
{{base_url}}/gym/check-ins?serviceType=pt_package
8. Get Check-In by ID
{{base_url}}/gym/check-ins/{{checkin_id}}
{
    "data": {
        "id": "d1061ef5-390c-498f-9238-0f5a6645b5a9",
        "tenantId": "47203e10-7d65-4879-8c31-be7f32941741",
        "memberId": "11111111-1111-1111-1111-111111111111",
        "checkInTime": "2025-11-27T01:44:10.645Z",
        "checkOutTime": null,
        "checkedInBy": "f40195da-c3c9-4128-972e-da016593a3f6",
        "activeServiceId": "9d0d421e-6960-42ed-851c-f71c7c030350",
        "notes": "Yoga class - morning session",
        "createdAt": "2025-11-27T01:44:10.645Z",
        "updatedAt": "2025-11-27T01:44:10.645Z",
        "member": {
            "id": "11111111-1111-1111-1111-111111111111",
            "firstName": "John",
            "lastName": "Smith",
            "email": "member1@example.com",
            "phone": "081234500001"
        },
        "checkedBy": {
            "id": "f40195da-c3c9-4128-972e-da016593a3f6",
            "firstName": "Admin",
            "lastName": "User"
        }
    }
}

9. Update Check-In (Add Checkout)
put
{{base_url}}/gym/check-ins/{{checkin_id}}
Payload:
{
  "checkOutTime": "2025-11-26T10:30:00.000Z",
  "notes": "Completed full workout session"
}
Resp:

{
    "message": "Check-in updated successfully",
    "data": {
        "id": "d1061ef5-390c-498f-9238-0f5a6645b5a9",
        "tenantId": "47203e10-7d65-4879-8c31-be7f32941741",
        "memberId": "11111111-1111-1111-1111-111111111111",
        "checkInTime": "2025-11-27T01:44:10.645Z",
        "checkOutTime": "2025-11-26T10:30:00.000Z",
        "checkedInBy": "f40195da-c3c9-4128-972e-da016593a3f6",
        "activeServiceId": "9d0d421e-6960-42ed-851c-f71c7c030350",
        "notes": "Completed full workout session",
        "createdAt": "2025-11-27T01:44:10.645Z",
        "updatedAt": "2025-11-27T01:47:12.530Z"
    }
}
10. Delete Check-In
Delete: {{base_url}}/gym/check-ins/{{checkin_id}}

Check-In Statistics
1. Get Overall Statistics
{{base_url}}/gym/check-ins/stats
{
    "data": {
        "total": 1,
        "today": 1,
        "thisWeek": 1,
        "thisMonth": 1,
        "uniqueMembersToday": 1,
        "filters": {}
    }
}

2. Get Statistics by Date Range
{{base_url}}/gym/check-ins/stats?startDate=2025-11-01&endDate=2025-11-30
{
    "data": {
        "total": 1,
        "today": 1,
        "thisWeek": 1,
        "thisMonth": 1,
        "uniqueMembersToday": 1,
        "filters": {
            "startDate": "2025-11-01",
            "endDate": "2025-11-30"
        }
    }
}

3. Get Statistics by Member
{{base_url}}/gym/check-ins/stats?memberId={{member_id}}
{
    "data": {
        "total": 1,
        "today": 1,
        "thisWeek": 1,
        "thisMonth": 1,
        "uniqueMembersToday": 1,
        "filters": {
            "memberId": "11111111-1111-1111-1111-111111111111"
        }
    }
}

Integration Scenarios
Scenario 1: Member Morning Check-In
Step 1: Verify Active Membership
Get : {{base_url}}/service/active/{{member_id}}?status=active
Step 2: Create Check-In
{{base_url}}/gym/check-ins

Scenario 2: PT Session with Trainer
Step 1: Check PT Package Sessions
{{base_url}}/service/active/{{member_id}}?status=active&serviceType=pt_package
Step 2: Check-In for PT Session
{{base_url}}/gym/check-ins
Step 3: Add Checkout Time
{{base_url}}/gym/check-ins/{{checkin_id}}

Scenario 3: Dashboard Statistics
Get Today's Check-Ins
{{base_url}}/gym/check-ins?startDate={{$isoTimestamp}}&limit=100
Get Overall Stats
{{base_url}}/gym/check-ins/stats

