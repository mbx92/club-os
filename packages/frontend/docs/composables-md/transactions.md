Transactions

Create Transactions
Post
{{base_url}}/services/purchase
Payload:
{
  "memberId": "{{memberId}}",
  "servicePlans": [
    {
      "servicePlanId": "{{membershipPlanId}}",
      "startDate": "2025-11-25"
    }
  ],
  "paymentMethods": [
    {
      "method": "cash",
      "amount": 1000000
    }
  ],
  "voucherCode": "TEST25",
  "notes": "Bundle with voucher and tax"
}
Resp:
{
    "message": "1 service plan(s) purchased successfully",
    "data": {
        "activeServices": [
            {
                "id": "23e2e93f-a8dd-499b-9eda-f535e4789063",
                "tenantId": "4cca86dc-c449-4641-a8e3-97b6d22ba489",
                "memberId": "bb3476cd-0d5d-464d-b9e8-64fae8eb2131",
                "servicePlanId": "3c19e349-76e9-412a-9c56-5c67683cc2b1",
                "serviceType": "membership",
                "startDate": "2025-11-25",
                "endDate": "2025-12-25",
                "totalSessions": null,
                "remainingSessions": null,
                "status": "active",
                "autoRenew": false,
                "purchaseTransactionId": "ff20b6bd-7857-447a-8211-0e19f3f77051",
                "purchaseDate": "2025-11-26T02:09:52.339Z",
                "assignedTrainerId": null,
                "pricePaid": "450000.00",
                "currency": "IDR",
                "voucherId": "e2a2f482-0449-415b-8bb6-5d8a9e915b55",
                "voucherDiscount": "50000.00",
                "metadata": {},
                "notes": "Bundle with voucher and tax",
                "version": 0,
                "createdAt": "2025-11-26T02:09:52.340Z",
                "updatedAt": "2025-11-26T02:09:52.340Z",
                "deletedAt": null,
                "servicePlan": {
                    "id": "3c19e349-76e9-412a-9c56-5c67683cc2b1",
                    "tenantId": "4cca86dc-c449-4641-a8e3-97b6d22ba489",
                    "serviceType": "membership",
                    "name": "90 Days Gym Membership",
                    "description": "Full gym access for 30 days including all facilities",
                    "price": "500000.00",
                    "currency": "IDR",
                    "durationType": "time_based",
                    "duration": 30,
                    "sessions": null,
                    "validityDays": null,
                    "accessControl": {
                        "facilities": [
                            "gym",
                            "pool",
                            "sauna"
                        ],
                        "accessHours": {
                            "monday": [
                                "06:00",
                                "22:00"
                            ],
                            "tuesday": [
                                "06:00",
                                "22:00"
                            ],
                            "wednesday": [
                                "06:00",
                                "22:00"
                            ],
                            "thursday": [
                                "06:00",
                                "22:00"
                            ],
                            "friday": [
                                "06:00",
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
                        "maxCheckIns": 30
                    },
                    "isActive": true,
                    "isPopular": true,
                    "displayOrder": 1,
                    "isBundle": false,
                    "bundledServices": null,
                    "version": 0,
                    "createdAt": "2025-11-26T01:05:18.846Z",
                    "updatedAt": "2025-11-26T01:05:18.846Z",
                    "deletedAt": null
                },
                "assignedTrainer": null
            }
        ],
        "transaction": {
            "id": "ff20b6bd-7857-447a-8211-0e19f3f77051",
            "transactionNumber": "TRX-202511-0001",
            "subtotal": 500000,
            "voucherDiscount": 50000,
            "taxAmount": 0,
            "totalAmount": 450000,
            "paidAmount": 1000000,
            "changeAmount": 550000
        }
    }
}

Get All Transactions
Get
{{base_url}}/transactions
{
    "success": true,
    "message": "Transactions retrieved successfully",
    "data": {
        "transactions": [
            {
                "id": "259bc8ba-1933-491c-bbbb-5a50faa24d66",
                "tenantId": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
                "transactionNumber": "GYM/20251125/0009",
                "transactionDate": "2025-11-25T03:09:28.622Z",
                "customerId": "1eafe1d3-146e-49bd-8f2a-1262f9842a26",
                "customerType": "member",
                "subtotal": "0.00",
                "tax": "0.00",
                "discount": "0.00",
                "voucherId": null,
                "voucherDiscount": "0.00",
                "totalAmount": "1750000.00",
                "status": "completed",
                "notes": "Bundle with voucher and tax",
                "createdBy": "e60f6f4f-1218-4019-a319-57852a44cc69",
                "version": 0,
                "createdAt": "2025-11-25T03:09:28.622Z",
                "updatedAt": "2025-11-25T03:09:28.622Z",
                "deletedAt": null,
                "transactionItems": [
                    {
                        "id": "2316d5a2-31a1-43fe-bb12-f71adef01e6a",
                        "itemType": "service_plan",
                        "itemId": "b16bcc04-0e7e-4ec8-92d9-987e5ca1998a",
                        "itemName": "90 Days Gym Membership Test",
                        "quantity": 1,
                        "unitPrice": "550000.00",
                        "subtotal": "550000.00",
                        "total": "550000.00",
                        "tax": "0.00",
                        "discount": "0.00",
                        "startDate": "2025-11-24",
                        "endDate": "2025-12-24",
                        "totalSessions": null,
                        "remainingSessions": null,
                        "serviceStatus": "active"
                    },
                    {
                        "id": "27e82c9b-8914-4318-94ee-bf5b73e1330d",
                        "itemType": "service_plan",
                        "itemId": "fd1a120e-f056-4ff4-a130-232e96a0de45",
                        "itemName": "12x Yoga Class Package",
                        "quantity": 1,
                        "unitPrice": "1200000.00",
                        "subtotal": "1200000.00",
                        "total": "1200000.00",
                        "tax": "0.00",
                        "discount": "0.00",
                        "startDate": "2025-11-24",
                        "endDate": "2025-12-24",
                        "totalSessions": 12,
                        "remainingSessions": 12,
                        "serviceStatus": "active"
                    }
                ],
                "payments": [
                    {
                        "id": "c0aacdb4-ee7c-4a47-a3b6-a2856af767d1",
                        "paymentMethod": "cash",
                        "amount": "1900000.00",
                        "paymentDate": "2025-11-25T03:09:28.656Z",
                        "status": "completed"
                    }
                ],
                "member": {
                    "id": "1eafe1d3-146e-49bd-8f2a-1262f9842a26",
                    "firstName": "Ardi",
                    "lastName": "Kontol",
                    "email": "ardi.k@example.com",
                    "phone": "081298765444"
                }
            },
            {
                "id": "41dd4dff-f4f5-482e-bd0f-bbb15bf04b2a",
                "tenantId": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
                "transactionNumber": "GYM/20251125/0008",
                "transactionDate": "2025-11-25T03:08:36.719Z",
                "customerId": "06421783-a8b6-4e13-bf62-925a672607a7",
                "customerType": "member",
                "subtotal": "0.00",
                "tax": "0.00",
                "discount": "0.00",
                "voucherId": null,
                "voucherDiscount": "0.00",
                "totalAmount": "550000.00",
                "status": "completed",
                "notes": "Bundle with voucher and tax",
                "createdBy": "e60f6f4f-1218-4019-a319-57852a44cc69",
                "version": 0,
                "createdAt": "2025-11-25T03:08:36.719Z",
                "updatedAt": "2025-11-25T03:08:36.719Z",
                "deletedAt": null,
                "transactionItems": [
                    {
                        "id": "2396205b-0874-4665-8678-27472be5d856",
                        "itemType": "service_plan",
                        "itemId": "c52b357f-6f85-444b-af1c-9de729db8989",
                        "itemName": "30 Days Gym Membership",
                        "quantity": 1,
                        "unitPrice": "550000.00",
                        "subtotal": "550000.00",
                        "total": "550000.00",
                        "tax": "0.00",
                        "discount": "0.00",
                        "startDate": "2025-11-25",
                        "endDate": "2025-12-25",
                        "totalSessions": null,
                        "remainingSessions": null,
                        "serviceStatus": "active"
                    }
                ],
                "payments": [
                    {
                        "id": "d7afe9fd-c90a-4923-a2ca-9f4fa999a130",
                        "paymentMethod": "cash",
                        "amount": "1000000.00",
                        "paymentDate": "2025-11-25T03:08:36.736Z",
                        "status": "completed"
                    }
                ],
                "member": {
                    "id": "06421783-a8b6-4e13-bf62-925a672607a7",
                    "firstName": "Michael",
                    "lastName": "Johnson",
                    "email": "michael.j@example.com",
                    "phone": "+6281298765432"
                }
            },
            {
                "id": "151653f2-992c-4aac-8ebd-d22f9a8e6907",
                "tenantId": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
                "transactionNumber": "GYM/20251125/0007",
                "transactionDate": "2025-11-25T03:04:44.028Z",
                "customerId": "2caeecb8-a145-455d-af0c-10dea317797d",
                "customerType": "member",
                "subtotal": "0.00",
                "tax": "0.00",
                "discount": "0.00",
                "voucherId": null,
                "voucherDiscount": "0.00",
                "totalAmount": "1750000.00",
                "status": "completed",
                "notes": "Bundle with voucher and tax",
                "createdBy": "e60f6f4f-1218-4019-a319-57852a44cc69",
                "version": 0,
                "createdAt": "2025-11-25T03:04:44.028Z",
                "updatedAt": "2025-11-25T03:04:44.028Z",
                "deletedAt": null,
                "transactionItems": [
                    {
                        "id": "dd58a5bc-274d-4a2a-aa15-deb447987274",
                        "itemType": "service_plan",
                        "itemId": "b16bcc04-0e7e-4ec8-92d9-987e5ca1998a",
                        "itemName": "90 Days Gym Membership Test",
                        "quantity": 1,
                        "unitPrice": "550000.00",
                        "subtotal": "550000.00",
                        "total": "550000.00",
                        "tax": "0.00",
                        "discount": "0.00",
                        "startDate": "2025-11-24",
                        "endDate": "2025-12-24",
                        "totalSessions": null,
                        "remainingSessions": null,
                        "serviceStatus": "active"
                    },
                    {
                        "id": "26148f64-4b86-42b8-a332-b06c2b20a076",
                        "itemType": "service_plan",
                        "itemId": "fd1a120e-f056-4ff4-a130-232e96a0de45",
                        "itemName": "12x Yoga Class Package",
                        "quantity": 1,
                        "unitPrice": "1200000.00",
                        "subtotal": "1200000.00",
                        "total": "1200000.00",
                        "tax": "0.00",
                        "discount": "0.00",
                        "startDate": "2025-11-24",
                        "endDate": "2025-12-24",
                        "totalSessions": 12,
                        "remainingSessions": 12,
                        "serviceStatus": "active"
                    }
                ],
                "payments": [
                    {
                        "id": "c416d66f-2885-4a0a-a23b-1daa822385de",
                        "paymentMethod": "cash",
                        "amount": "1900000.00",
                        "paymentDate": "2025-11-25T03:04:44.044Z",
                        "status": "completed"
                    }
                ],
                "member": {
                    "id": "2caeecb8-a145-455d-af0c-10dea317797d",
                    "firstName": "Ardi",
                    "lastName": "Memek",
                    "email": "ardi.5@example.com",
                    "phone": "081298765454"
                }
            },
            {
                "id": "7243aac8-04c7-4e69-bb2d-b734f8e7e3a5",
                "tenantId": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
                "transactionNumber": "GYM/20251125/0006",
                "transactionDate": "2025-11-25T02:57:01.978Z",
                "customerId": "2caeecb8-a145-455d-af0c-10dea317797d",
                "customerType": "member",
                "subtotal": "0.00",
                "tax": "0.00",
                "discount": "0.00",
                "voucherId": null,
                "voucherDiscount": "0.00",
                "totalAmount": "1750000.00",
                "status": "completed",
                "notes": "Bundle with voucher and tax",
                "createdBy": "e60f6f4f-1218-4019-a319-57852a44cc69",
                "version": 0,
                "createdAt": "2025-11-25T02:57:01.978Z",
                "updatedAt": "2025-11-25T02:57:01.978Z",
                "deletedAt": null,
                "transactionItems": [
                    {
                        "id": "3e124b02-bbcb-46a0-b8ab-65003207504d",
                        "itemType": "service_plan",
                        "itemId": "b16bcc04-0e7e-4ec8-92d9-987e5ca1998a",
                        "itemName": "90 Days Gym Membership Test",
                        "quantity": 1,
                        "unitPrice": "550000.00",
                        "subtotal": "550000.00",
                        "total": "550000.00",
                        "tax": "0.00",
                        "discount": "0.00",
                        "startDate": "2025-11-24",
                        "endDate": "2025-12-24",
                        "totalSessions": null,
                        "remainingSessions": null,
                        "serviceStatus": "active"
                    },
                    {
                        "id": "c25be527-6032-4251-903d-4d2c4639828e",
                        "itemType": "service_plan",
                        "itemId": "fd1a120e-f056-4ff4-a130-232e96a0de45",
                        "itemName": "12x Yoga Class Package",
                        "quantity": 1,
                        "unitPrice": "1200000.00",
                        "subtotal": "1200000.00",
                        "total": "1200000.00",
                        "tax": "0.00",
                        "discount": "0.00",
                        "startDate": "2025-11-24",
                        "endDate": "2025-12-24",
                        "totalSessions": 12,
                        "remainingSessions": 12,
                        "serviceStatus": "active"
                    }
                ],
                "payments": [
                    {
                        "id": "c510dfcf-a0aa-4d55-b35d-1a659a1af878",
                        "paymentMethod": "cash",
                        "amount": "1900000.00",
                        "paymentDate": "2025-11-25T02:57:01.993Z",
                        "status": "completed"
                    }
                ],
                "member": {
                    "id": "2caeecb8-a145-455d-af0c-10dea317797d",
                    "firstName": "Ardi",
                    "lastName": "Memek",
                    "email": "ardi.5@example.com",
                    "phone": "081298765454"
                }
            },
            {
                "id": "9b6945a4-c719-4c0c-b4ed-d4d84e38dfff",
                "tenantId": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
                "transactionNumber": "GYM/20251125/0005",
                "transactionDate": "2025-11-25T02:52:06.076Z",
                "customerId": "2caeecb8-a145-455d-af0c-10dea317797d",
                "customerType": "member",
                "subtotal": "0.00",
                "tax": "0.00",
                "discount": "0.00",
                "voucherId": null,
                "voucherDiscount": "0.00",
                "totalAmount": "1750000.00",
                "status": "completed",
                "notes": "Bundle with voucher and tax",
                "createdBy": "e60f6f4f-1218-4019-a319-57852a44cc69",
                "version": 0,
                "createdAt": "2025-11-25T02:52:06.076Z",
                "updatedAt": "2025-11-25T02:52:06.076Z",
                "deletedAt": null,
                "transactionItems": [
                    {
                        "id": "3e8ae2db-999d-4c80-8fb6-82dbe414f53e",
                        "itemType": "service_plan",
                        "itemId": "b16bcc04-0e7e-4ec8-92d9-987e5ca1998a",
                        "itemName": "90 Days Gym Membership Test",
                        "quantity": 1,
                        "unitPrice": "550000.00",
                        "subtotal": "550000.00",
                        "total": "550000.00",
                        "tax": "0.00",
                        "discount": "0.00",
                        "startDate": "2025-11-24",
                        "endDate": "2025-12-24",
                        "totalSessions": null,
                        "remainingSessions": null,
                        "serviceStatus": "active"
                    },
                    {
                        "id": "f4c6c852-e170-42cf-8674-7cd68a5d36ab",
                        "itemType": "service_plan",
                        "itemId": "fd1a120e-f056-4ff4-a130-232e96a0de45",
                        "itemName": "12x Yoga Class Package",
                        "quantity": 1,
                        "unitPrice": "1200000.00",
                        "subtotal": "1200000.00",
                        "total": "1200000.00",
                        "tax": "0.00",
                        "discount": "0.00",
                        "startDate": "2025-11-24",
                        "endDate": "2025-12-24",
                        "totalSessions": 12,
                        "remainingSessions": 12,
                        "serviceStatus": "active"
                    }
                ],
                "payments": [
                    {
                        "id": "dbb7c410-1a50-4c02-89cb-cc5e4f0bec06",
                        "paymentMethod": "cash",
                        "amount": "1900000.00",
                        "paymentDate": "2025-11-25T02:52:06.095Z",
                        "status": "completed"
                    }
                ],
                "member": {
                    "id": "2caeecb8-a145-455d-af0c-10dea317797d",
                    "firstName": "Ardi",
                    "lastName": "Memek",
                    "email": "ardi.5@example.com",
                    "phone": "081298765454"
                }
            },
            {
                "id": "51e8b554-0ec8-46fe-b354-4c7fca7a541d",
                "tenantId": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
                "transactionNumber": "GYM/20251125/0004",
                "transactionDate": "2025-11-25T02:47:24.534Z",
                "customerId": "06421783-a8b6-4e13-bf62-925a672607a7",
                "customerType": "member",
                "subtotal": "0.00",
                "tax": "0.00",
                "discount": "0.00",
                "voucherId": null,
                "voucherDiscount": "0.00",
                "totalAmount": "550000.00",
                "status": "completed",
                "notes": "Bundle with voucher and tax",
                "createdBy": "e60f6f4f-1218-4019-a319-57852a44cc69",
                "version": 0,
                "createdAt": "2025-11-25T02:47:24.534Z",
                "updatedAt": "2025-11-25T02:47:24.534Z",
                "deletedAt": null,
                "transactionItems": [
                    {
                        "id": "34b59173-12c0-49d7-9fc4-5affad15670c",
                        "itemType": "service_plan",
                        "itemId": "c52b357f-6f85-444b-af1c-9de729db8989",
                        "itemName": "30 Days Gym Membership",
                        "quantity": 1,
                        "unitPrice": "550000.00",
                        "subtotal": "550000.00",
                        "total": "550000.00",
                        "tax": "0.00",
                        "discount": "0.00",
                        "startDate": "2025-11-25",
                        "endDate": "2025-12-25",
                        "totalSessions": null,
                        "remainingSessions": null,
                        "serviceStatus": "active"
                    }
                ],
                "payments": [
                    {
                        "id": "4cbd1084-1a56-412b-bb2a-65d2bed88574",
                        "paymentMethod": "cash",
                        "amount": "1000000.00",
                        "paymentDate": "2025-11-25T02:47:24.552Z",
                        "status": "completed"
                    }
                ],
                "member": {
                    "id": "06421783-a8b6-4e13-bf62-925a672607a7",
                    "firstName": "Michael",
                    "lastName": "Johnson",
                    "email": "michael.j@example.com",
                    "phone": "+6281298765432"
                }
            },
            {
                "id": "ea3773f3-9030-4b83-b242-8a738f585074",
                "tenantId": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
                "transactionNumber": "GYM/20251125/0003",
                "transactionDate": "2025-11-25T02:37:44.844Z",
                "customerId": "06421783-a8b6-4e13-bf62-925a672607a7",
                "customerType": "member",
                "subtotal": "0.00",
                "tax": "0.00",
                "discount": "0.00",
                "voucherId": null,
                "voucherDiscount": "0.00",
                "totalAmount": "550000.00",
                "status": "completed",
                "notes": "Bundle with voucher and tax",
                "createdBy": "e60f6f4f-1218-4019-a319-57852a44cc69",
                "version": 0,
                "createdAt": "2025-11-25T02:37:44.845Z",
                "updatedAt": "2025-11-25T02:37:44.845Z",
                "deletedAt": null,
                "transactionItems": [
                    {
                        "id": "d34c85c3-1537-4772-9abe-f96a260cf090",
                        "itemType": "service_plan",
                        "itemId": "c52b357f-6f85-444b-af1c-9de729db8989",
                        "itemName": "30 Days Gym Membership",
                        "quantity": 1,
                        "unitPrice": "550000.00",
                        "subtotal": "550000.00",
                        "total": "550000.00",
                        "tax": "0.00",
                        "discount": "0.00",
                        "startDate": "2025-11-24",
                        "endDate": "2025-12-24",
                        "totalSessions": null,
                        "remainingSessions": null,
                        "serviceStatus": "active"
                    }
                ],
                "payments": [
                    {
                        "id": "52cef69c-731e-4e12-a5fb-edd1bced1852",
                        "paymentMethod": "cash",
                        "amount": "1000000.00",
                        "paymentDate": "2025-11-25T02:37:44.862Z",
                        "status": "completed"
                    }
                ],
                "member": {
                    "id": "06421783-a8b6-4e13-bf62-925a672607a7",
                    "firstName": "Michael",
                    "lastName": "Johnson",
                    "email": "michael.j@example.com",
                    "phone": "+6281298765432"
                }
            },
            {
                "id": "e0a94e5b-0e08-495d-b2e8-84c5a470b91e",
                "tenantId": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
                "transactionNumber": "GYM/20251125/0002",
                "transactionDate": "2025-11-25T02:04:53.470Z",
                "customerId": "2caeecb8-a145-455d-af0c-10dea317797d",
                "customerType": "member",
                "subtotal": "0.00",
                "tax": "0.00",
                "discount": "0.00",
                "voucherId": null,
                "voucherDiscount": "0.00",
                "totalAmount": "1750000.00",
                "status": "completed",
                "notes": "Bundle with voucher and tax",
                "createdBy": "e60f6f4f-1218-4019-a319-57852a44cc69",
                "version": 0,
                "createdAt": "2025-11-25T02:04:53.470Z",
                "updatedAt": "2025-11-25T02:04:53.470Z",
                "deletedAt": null,
                "transactionItems": [
                    {
                        "id": "e3b94ad8-21cf-4d2a-88ad-451503760307",
                        "itemType": "service_plan",
                        "itemId": "c52b357f-6f85-444b-af1c-9de729db8989",
                        "itemName": "30 Days Gym Membership",
                        "quantity": 1,
                        "unitPrice": "550000.00",
                        "subtotal": "550000.00",
                        "total": "550000.00",
                        "tax": "0.00",
                        "discount": "0.00",
                        "startDate": "2025-11-24",
                        "endDate": "2025-12-24",
                        "totalSessions": null,
                        "remainingSessions": null,
                        "serviceStatus": "active"
                    },
                    {
                        "id": "ab8a700d-3c49-4b23-8384-09296cb13cc7",
                        "itemType": "service_plan",
                        "itemId": "ccf98a7f-ceda-4f00-9a37-1170bad77c7a",
                        "itemName": "12x Yoga Class Package",
                        "quantity": 1,
                        "unitPrice": "1200000.00",
                        "subtotal": "1200000.00",
                        "total": "1200000.00",
                        "tax": "0.00",
                        "discount": "0.00",
                        "startDate": "2025-11-24",
                        "endDate": "2025-12-24",
                        "totalSessions": 12,
                        "remainingSessions": 12,
                        "serviceStatus": "active"
                    }
                ],
                "payments": [
                    {
                        "id": "04b98dcb-7b01-4be3-8fac-07ea4a5bd1df",
                        "paymentMethod": "cash",
                        "amount": "1900000.00",
                        "paymentDate": "2025-11-25T02:04:53.560Z",
                        "status": "completed"
                    }
                ],
                "member": {
                    "id": "2caeecb8-a145-455d-af0c-10dea317797d",
                    "firstName": "Ardi",
                    "lastName": "Memek",
                    "email": "ardi.5@example.com",
                    "phone": "081298765454"
                }
            },
            {
                "id": "338099ee-76ea-45a4-8223-cfffe5717046",
                "tenantId": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
                "transactionNumber": "GYM/20251125/0001",
                "transactionDate": "2025-11-25T02:00:03.318Z",
                "customerId": "2caeecb8-a145-455d-af0c-10dea317797d",
                "customerType": "member",
                "subtotal": "0.00",
                "tax": "0.00",
                "discount": "0.00",
                "voucherId": null,
                "voucherDiscount": "0.00",
                "totalAmount": "1750000.00",
                "status": "completed",
                "notes": "Bundle with voucher and tax",
                "createdBy": "e60f6f4f-1218-4019-a319-57852a44cc69",
                "version": 0,
                "createdAt": "2025-11-25T02:00:03.319Z",
                "updatedAt": "2025-11-25T02:00:03.319Z",
                "deletedAt": null,
                "transactionItems": [
                    {
                        "id": "0a066bf7-5e8c-47be-9148-846a85f7d93c",
                        "itemType": "service_plan",
                        "itemId": "c52b357f-6f85-444b-af1c-9de729db8989",
                        "itemName": "30 Days Gym Membership",
                        "quantity": 1,
                        "unitPrice": "550000.00",
                        "subtotal": "550000.00",
                        "total": "550000.00",
                        "tax": "0.00",
                        "discount": "0.00",
                        "startDate": "2025-11-24",
                        "endDate": "2025-12-24",
                        "totalSessions": null,
                        "remainingSessions": null,
                        "serviceStatus": "active"
                    },
                    {
                        "id": "d7808b26-70ae-43df-9f6c-80aa32c56064",
                        "itemType": "service_plan",
                        "itemId": "ccf98a7f-ceda-4f00-9a37-1170bad77c7a",
                        "itemName": "12x Yoga Class Package",
                        "quantity": 1,
                        "unitPrice": "1200000.00",
                        "subtotal": "1200000.00",
                        "total": "1200000.00",
                        "tax": "0.00",
                        "discount": "0.00",
                        "startDate": "2025-11-24",
                        "endDate": "2025-12-24",
                        "totalSessions": 12,
                        "remainingSessions": 12,
                        "serviceStatus": "active"
                    }
                ],
                "payments": [
                    {
                        "id": "ce9f7e9b-0c37-460f-b54b-f2d076b2f2c5",
                        "paymentMethod": "cash",
                        "amount": "1900000.00",
                        "paymentDate": "2025-11-25T02:00:03.337Z",
                        "status": "completed"
                    }
                ],
                "member": {
                    "id": "2caeecb8-a145-455d-af0c-10dea317797d",
                    "firstName": "Ardi",
                    "lastName": "Memek",
                    "email": "ardi.5@example.com",
                    "phone": "081298765454"
                }
            },
            {
                "id": "9199e05f-1beb-47b7-8a7f-8c3005a7b70e",
                "tenantId": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
                "transactionNumber": "TRX-202511-0002",
                "transactionDate": "2025-11-25T00:44:30.393Z",
                "customerId": "1eafe1d3-146e-49bd-8f2a-1262f9842a26",
                "customerType": "member",
                "subtotal": "0.00",
                "tax": "0.00",
                "discount": "0.00",
                "voucherId": null,
                "voucherDiscount": "0.00",
                "totalAmount": "1887000.00",
                "status": "completed",
                "notes": "Bundle with voucher and tax",
                "createdBy": "e60f6f4f-1218-4019-a319-57852a44cc69",
                "version": 0,
                "createdAt": "2025-11-25T00:44:30.393Z",
                "updatedAt": "2025-11-25T00:44:30.393Z",
                "deletedAt": null,
                "transactionItems": [
                    {
                        "id": "1b01ab9f-31fc-4049-aa86-d8869edbb227",
                        "itemType": "service_plan",
                        "itemId": "c52b357f-6f85-444b-af1c-9de729db8989",
                        "itemName": "30 Days Gym Membership",
                        "quantity": 1,
                        "unitPrice": "500000.00",
                        "subtotal": "500000.00",
                        "total": "500000.00",
                        "tax": "0.00",
                        "discount": "0.00",
                        "startDate": "2025-11-24",
                        "endDate": "2025-12-24",
                        "totalSessions": null,
                        "remainingSessions": null,
                        "serviceStatus": "active"
                    },
                    {
                        "id": "2d45e0ca-7f82-46a6-abf4-0efb2d4466f0",
                        "itemType": "service_plan",
                        "itemId": "ccf98a7f-ceda-4f00-9a37-1170bad77c7a",
                        "itemName": "12x Yoga Class Package",
                        "quantity": 1,
                        "unitPrice": "1200000.00",
                        "subtotal": "1200000.00",
                        "total": "1200000.00",
                        "tax": "0.00",
                        "discount": "0.00",
                        "startDate": "2025-11-24",
                        "endDate": "2025-12-24",
                        "totalSessions": 12,
                        "remainingSessions": 12,
                        "serviceStatus": "active"
                    },
                    {
                        "id": "4721d593-88eb-4cd9-921f-cb262cfe8b38",
                        "itemType": "tax",
                        "itemId": null,
                        "itemName": "Tax (11%)",
                        "quantity": 1,
                        "unitPrice": "187000.00",
                        "subtotal": "187000.00",
                        "total": "187000.00",
                        "tax": "187000.00",
                        "discount": "0.00"
                    }
                ],
                "payments": [
                    {
                        "id": "8d34ac06-9a6e-4b5b-beea-b1aeb52e8d03",
                        "paymentMethod": "cash",
                        "amount": "1900000.00",
                        "paymentDate": "2025-11-25T00:44:30.419Z",
                        "status": "completed"
                    }
                ],
                "member": {
                    "id": "1eafe1d3-146e-49bd-8f2a-1262f9842a26",
                    "firstName": "Ardi",
                    "lastName": "Kontol",
                    "email": "ardi.k@example.com",
                    "phone": "081298765444"
                }
            }
        ],
        "pagination": {
            "totalItems": 11,
            "totalPages": 2,
            "currentPage": 1,
            "itemsPerPage": 10
        }
    }
}

Get Transaction Statistics
Get
{{base_url}}/transactions/statistics
{
    "success": true,
    "message": "Transaction statistics retrieved successfully",
    "data": {
        "overall": {
            "totalRevenue": "15737000.00",
            "totalTransactions": "11",
            "averageAmount": "1430636.363636363636"
        },
        "byStatusAndCustomerType": [
            {
                "status": "completed",
                "customerType": "member",
                "totalAmount": "12237000.00",
                "count": "9"
            },
            {
                "status": "refunded",
                "customerType": "member",
                "totalAmount": "3500000.00",
                "count": "2"
            }
        ],
        "daily": [
            {
                "date": "2025-11-25",
                "totalAmount": "15737000.00",
                "count": "11"
            }
        ],
        "topProducts": [
            {
                "itemType": "service_plan",
                "itemId": "ccf98a7f-ceda-4f00-9a37-1170bad77c7a",
                "itemName": "12x Yoga Class Package",
                "totalQuantity": "4",
                "totalAmount": "4800000.00"
            },
            {
                "itemType": "service_plan",
                "itemId": "c52b357f-6f85-444b-af1c-9de729db8989",
                "itemName": "30 Days Gym Membership",
                "totalQuantity": "7",
                "totalAmount": "3750000.00"
            },
            {
                "itemType": "service_plan",
                "itemId": "fd1a120e-f056-4ff4-a130-232e96a0de45",
                "itemName": "12x Yoga Class Package",
                "totalQuantity": "2",
                "totalAmount": "2400000.00"
            },
            {
                "itemType": "service_plan",
                "itemId": "b16bcc04-0e7e-4ec8-92d9-987e5ca1998a",
                "itemName": "90 Days Gym Membership Test",
                "totalQuantity": "2",
                "totalAmount": "1100000.00"
            }
        ]
    }
}


Get Transaction by ID
Get
{{base_url}}/transactions/{{transaction_id}}

{
    "success": true,
    "message": "Transaction retrieved successfully",
    "data": {
        "id": "259bc8ba-1933-491c-bbbb-5a50faa24d66",
        "tenantId": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
        "transactionNumber": "GYM/20251125/0009",
        "transactionDate": "2025-11-25T03:09:28.622Z",
        "customerId": "1eafe1d3-146e-49bd-8f2a-1262f9842a26",
        "customerType": "member",
        "subtotal": "0.00",
        "tax": "0.00",
        "discount": "0.00",
        "voucherId": null,
        "voucherDiscount": "0.00",
        "totalAmount": "1750000.00",
        "status": "refunded",
        "notes": "Bundle with voucher and tax\n[REFUNDED 2025-11-25T03:38:30.182Z] Customer request / Product issue / etc",
        "createdBy": "e60f6f4f-1218-4019-a319-57852a44cc69",
        "version": 1,
        "createdAt": "2025-11-25T03:09:28.622Z",
        "updatedAt": "2025-11-25T03:38:30.183Z",
        "deletedAt": null,
        "member": {
            "id": "1eafe1d3-146e-49bd-8f2a-1262f9842a26",
            "firstName": "Ardi",
            "lastName": "Kontol",
            "email": "ardi.k@example.com",
            "phone": "081298765444"
        },
        "transactionItems": [
            {
                "id": "2316d5a2-31a1-43fe-bb12-f71adef01e6a",
                "transactionId": "259bc8ba-1933-491c-bbbb-5a50faa24d66",
                "itemType": "service_plan",
                "itemId": "b16bcc04-0e7e-4ec8-92d9-987e5ca1998a",
                "itemName": "90 Days Gym Membership Test",
                "quantity": 1,
                "unitPrice": "550000.00",
                "subtotal": "550000.00",
                "discount": "0.00",
                "tax": "0.00",
                "total": "550000.00",
                "notes": null,
                "itemDetails": {},
                "createdAt": "2025-11-25T03:09:28.635Z",
                "updatedAt": "2025-11-25T03:09:28.635Z",
                "deletedAt": null,
                "product": null
            },
            {
                "id": "27e82c9b-8914-4318-94ee-bf5b73e1330d",
                "transactionId": "259bc8ba-1933-491c-bbbb-5a50faa24d66",
                "itemType": "service_plan",
                "itemId": "fd1a120e-f056-4ff4-a130-232e96a0de45",
                "itemName": "12x Yoga Class Package",
                "quantity": 1,
                "unitPrice": "1200000.00",
                "subtotal": "1200000.00",
                "discount": "0.00",
                "tax": "0.00",
                "total": "1200000.00",
                "notes": null,
                "itemDetails": {},
                "createdAt": "2025-11-25T03:09:28.635Z",
                "updatedAt": "2025-11-25T03:09:28.635Z",
                "deletedAt": null,
                "product": null
            }
        ],
        "payments": [
            {
                "id": "c0aacdb4-ee7c-4a47-a3b6-a2856af767d1",
                "transactionId": "259bc8ba-1933-491c-bbbb-5a50faa24d66",
                "paymentMethod": "cash",
                "amount": "1900000.00",
                "currency": "IDR",
                "paymentDate": "2025-11-25T03:09:28.656Z",
                "status": "completed",
                "receiptNumber": "RCP-202511-0011",
                "notes": null,
                "paymentDetails": {},
                "createdBy": null,
                "createdAt": "2025-11-25T03:09:28.656Z",
                "updatedAt": "2025-11-25T03:09:28.656Z",
                "deletedAt": null
            }
        ],
        "creator": {
            "id": "e60f6f4f-1218-4019-a319-57852a44cc69",
            "firstName": "Admin",
            "lastName": "User",
            "email": "admin@tenant-a.com"
        }
    }
}

Refund Transaction
Post
{{base_url}}/transactions/:id/refund
payload:
{
  "notes": "Customer request / Product issue / etc"
}
resp:
{
    "success": true,
    "message": "Transaction refunded successfully",
    "data": {
        "transaction": {
            "id": "ff20b6bd-7857-447a-8211-0e19f3f77051",
            "tenantId": "4cca86dc-c449-4641-a8e3-97b6d22ba489",
            "transactionNumber": "TRX-202511-0001",
            "transactionDate": "2025-11-26T02:09:52.276Z",
            "customerId": "bb3476cd-0d5d-464d-b9e8-64fae8eb2131",
            "customerType": "member",
            "subtotal": "500000.00",
            "tax": "0.00",
            "discount": "50000.00",
            "voucherId": "e2a2f482-0449-415b-8bb6-5d8a9e915b55",
            "voucherDiscount": "50000.00",
            "totalAmount": "450000.00",
            "status": "refunded",
            "notes": "Bundle with voucher and tax\n[REFUNDED 2025-11-26T02:13:00.968Z] Customer request / Product issue / etc",
            "createdBy": "78ec923c-0371-494a-96f0-35056a6f3c34",
            "version": 1,
            "createdAt": "2025-11-26T02:09:52.277Z",
            "updatedAt": "2025-11-26T02:13:00.968Z",
            "deletedAt": null,
            "member": {
                "id": "bb3476cd-0d5d-464d-b9e8-64fae8eb2131",
                "firstName": "Ardi",
                "lastName": "Memek",
                "email": "ardi.5@example.com",
                "phone": "081298765454"
            },
            "transactionItems": [
                {
                    "id": "3b078aef-fe37-4d15-9c82-c5639cac1c9f",
                    "transactionId": "ff20b6bd-7857-447a-8211-0e19f3f77051",
                    "itemType": "service_plan",
                    "itemId": "3c19e349-76e9-412a-9c56-5c67683cc2b1",
                    "itemName": "90 Days Gym Membership",
                    "quantity": 1,
                    "unitPrice": "500000.00",
                    "subtotal": "500000.00",
                    "discount": "0.00",
                    "tax": "0.00",
                    "total": "500000.00",
                    "notes": null,
                    "itemDetails": {},
                    "createdAt": "2025-11-26T02:09:52.298Z",
                    "updatedAt": "2025-11-26T02:09:52.298Z",
                    "deletedAt": null
                },
                {
                    "id": "b685f736-3ace-4d80-8201-d33113bd722a",
                    "transactionId": "ff20b6bd-7857-447a-8211-0e19f3f77051",
                    "itemType": "discount",
                    "itemId": "e2a2f482-0449-415b-8bb6-5d8a9e915b55",
                    "itemName": "Voucher: TEST25",
                    "quantity": 1,
                    "unitPrice": "-50000.00",
                    "subtotal": "-50000.00",
                    "discount": "0.00",
                    "tax": "0.00",
                    "total": "-50000.00",
                    "notes": null,
                    "itemDetails": {},
                    "createdAt": "2025-11-26T02:09:52.308Z",
                    "updatedAt": "2025-11-26T02:09:52.308Z",
                    "deletedAt": null
                }
            ],
            "payments": [
                {
                    "id": "eb5ac372-ef7d-46af-b724-19f9734d5874",
                    "transactionId": "ff20b6bd-7857-447a-8211-0e19f3f77051",
                    "paymentMethod": "cash",
                    "amount": "1000000.00",
                    "currency": "IDR",
                    "paymentDate": "2025-11-26T02:09:52.310Z",
                    "status": "completed",
                    "receiptNumber": "RCP-202511-0001",
                    "notes": null,
                    "paymentDetails": {},
                    "createdBy": null,
                    "createdAt": "2025-11-26T02:09:52.310Z",
                    "updatedAt": "2025-11-26T02:09:52.310Z",
                    "deletedAt": null
                }
            ]
        },
        "cancelledServices": [
            {
                "id": "23e2e93f-a8dd-499b-9eda-f535e4789063",
                "servicePlanId": "3c19e349-76e9-412a-9c56-5c67683cc2b1",
                "status": "cancelled",
                "startDate": "2025-11-25",
                "endDate": "2025-12-25"
            }
        ]
    }
}