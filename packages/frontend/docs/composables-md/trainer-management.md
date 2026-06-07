Trainer Management

Get All Trainers
get
{{base_url}}/gym/trainers?page=1&limit=10&search=&status=all&specialization=&sortBy=createdAt&sortOrder=DESC
resp :
{
    "success": true,
    "data": [
        {
            "specializations": [
                "yoga",
                "personal_training",
                "spinning"
            ],
            "certifications": [
                {
                    "name": "Certified Personal Trainer",
                    "issuer": "NASM",
                    "date": "2020-01-15",
                    "expiryDate": "2025-01-15"
                }
            ],
            "availability": {
                "monday": [
                    "09:00-12:00",
                    "14:00-18:00"
                ],
                "tuesday": [
                    "09:00-12:00",
                    "14:00-18:00"
                ],
                "wednesday": [
                    "09:00-12:00",
                    "14:00-18:00"
                ],
                "thursday": [
                    "09:00-12:00",
                    "14:00-18:00"
                ],
                "friday": [
                    "09:00-12:00",
                    "14:00-18:00"
                ]
            },
            "id": "a50ed45f-a9e0-41d2-99df-a914c137eb8b",
            "tenantId": "05285e75-df97-4d87-b469-5722d911bd69",
            "userId": "a4e2371b-f63f-4caa-b644-a3258353a11c",
            "firstName": "John",
            "lastName": "Smith",
            "email": "john.trainer@gym.com",
            "phone": "081234567890",
            "dateOfBirth": "1985-05-15",
            "gender": "male",
            "bio": "Experienced trainer with 10+ years in fitness industry",
            "photoUrl": "https://example.com/photos/john.jpg",
            "commissionType": "percentage",
            "commissionValue": "15.00",
            "commissionNotes": "15% of class fees",
            "isActive": true,
            "hireDate": "2024-01-01",
            "createdAt": "2025-11-23T08:12:08.077Z",
            "updatedAt": "2025-11-23T08:12:08.077Z",
            "deletedAt": null,
            "user": {
                "id": "a4e2371b-f63f-4caa-b644-a3258353a11c",
                "email": "john.trainer@gym.com",
                "phone": "081234567890",
                "isActive": true,
                "lastLogin": null
            },
            "tenant": {
                "id": "05285e75-df97-4d87-b469-5722d911bd69",
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
        "search": "",
        "status": "all",
        "specialization": "",
        "sortBy": "createdAt",
        "sortOrder": "DESC"
    }
}

Get Trainer by ID
get
{{base_url}}/gym/trainers/{{trainer_id}}
{
    "success": true,
    "data": {
        "specializations": [
            "yoga",
            "personal_training",
            "spinning"
        ],
        "certifications": [
            {
                "name": "Certified Personal Trainer",
                "issuer": "NASM",
                "date": "2020-01-15",
                "expiryDate": "2025-01-15"
            }
        ],
        "availability": {
            "monday": [
                "09:00-12:00",
                "14:00-18:00"
            ],
            "tuesday": [
                "09:00-12:00",
                "14:00-18:00"
            ],
            "wednesday": [
                "09:00-12:00",
                "14:00-18:00"
            ],
            "thursday": [
                "09:00-12:00",
                "14:00-18:00"
            ],
            "friday": [
                "09:00-12:00",
                "14:00-18:00"
            ]
        },
        "id": "a50ed45f-a9e0-41d2-99df-a914c137eb8b",
        "tenantId": "05285e75-df97-4d87-b469-5722d911bd69",
        "userId": "a4e2371b-f63f-4caa-b644-a3258353a11c",
        "firstName": "John",
        "lastName": "Smith",
        "email": "john.trainer@gym.com",
        "phone": "081234567890",
        "dateOfBirth": "1985-05-15",
        "gender": "male",
        "bio": "Experienced trainer with 10+ years in fitness industry",
        "photoUrl": "https://example.com/photos/john.jpg",
        "commissionType": "percentage",
        "commissionValue": "15.00",
        "commissionNotes": "15% of class fees",
        "isActive": true,
        "hireDate": "2024-01-01",
        "createdAt": "2025-11-23T08:12:08.077Z",
        "updatedAt": "2025-11-23T08:12:08.077Z",
        "deletedAt": null,
        "user": {
            "id": "a4e2371b-f63f-4caa-b644-a3258353a11c",
            "email": "john.trainer@gym.com",
            "phone": "081234567890",
            "isActive": true,
            "lastLogin": null
        },
        "tenant": {
            "id": "05285e75-df97-4d87-b469-5722d911bd69",
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
        }
    }
}

Get Trainer Commissions
get
{{base_url}}/gym/trainers/{{trainer_id}}/commissions?page=1&limit=10&status=&startDate=2024-01-01&endDate=2024-12-31
resp:
{
    "success": true,
    "data": {
        "commissions": [],
        "summary": {
            "totalCommissions": 0,
            "totalAmount": 0,
            "paidAmount": 0,
            "pendingAmount": 0
        },
        "pagination": {
            "currentPage": 1,
            "totalPages": 0,
            "totalRecords": 0,
            "limit": 10,
            "hasNextPage": false,
            "hasPrevPage": false
        }
    }
}

Create Trainer
post 
{{base_url}}/gym/trainers
Payload:
{
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.trainer@gym.com",
  "phone": "081234567890",
  "dateOfBirth": "1985-05-15",
  "gender": "male",
  "specializations": ["yoga", "personal_training", "spinning"],
  "certifications": [
    {
      "name": "Certified Personal Trainer",
      "issuer": "NASM",
      "date": "2020-01-15",
      "expiryDate": "2025-01-15"
    }
  ],
  "bio": "Experienced trainer with 10+ years in fitness industry",
  "photoUrl": "https://example.com/photos/john.jpg",
  "commissionType": "percentage",
  "commissionValue": 15.00,
  "commissionNotes": "15% of class fees",
  "availability": {
    "monday": ["09:00-12:00", "14:00-18:00"],
    "tuesday": ["09:00-12:00", "14:00-18:00"],
    "wednesday": ["09:00-12:00", "14:00-18:00"],
    "thursday": ["09:00-12:00", "14:00-18:00"],
    "friday": ["09:00-12:00", "14:00-18:00"]
  },
  "hireDate": "2024-01-01"
}
resp:
{
    "success": true,
    "message": "Trainer berhasil dibuat",
    "data": {
        "trainer": {
            "id": "a50ed45f-a9e0-41d2-99df-a914c137eb8b",
            "firstName": "John",
            "lastName": "Smith",
            "fullName": "John Smith",
            "email": "john.trainer@gym.com",
            "phone": "081234567890",
            "commissionType": "percentage",
            "commissionValue": "15.00",
            "specializations": [
                "yoga",
                "personal_training",
                "spinning"
            ],
            "createdAt": "2025-11-23T08:12:08.077Z"
        },
        "credentials": {
            "tempPassword": "password123"
        }
    }
}

Pay Commission
post
{{base_url}}/gym/trainers/{{trainer_id}}/commissions/{{commission_id}}/pay
payload:
{
  "paymentMethod": "bank_transfer",
  "notes": "Paid via BCA transfer"
}

Reset Trainer Password
Post
{{base_url}}/gym/trainers/{{trainer_id}}/reset-password

Update Trainer
put
{{base_url}}/gym/trainers/{{trainer_id}}
payload:
{
  "firstName": "John",
  "lastName": "Smith 1",
  "email": "john.trainer.updated@gym.com",
  "phone": "081234567890",
  "specializations": ["yoga", "personal_training", "spinning", "boxing"],
  "commissionType": "percentage",
  "commissionValue": 20.00,
  "commissionNotes": "Increased to 20% after performance review",
  "bio": "Senior trainer with 10+ years experience",
  "isActive": true
}
Resp:
{
    "success": true,
    "message": "Trainer berhasil diperbarui",
    "data": {
        "specializations": [
            "yoga",
            "personal_training",
            "spinning",
            "boxing"
        ],
        "certifications": [
            {
                "name": "Certified Personal Trainer",
                "issuer": "NASM",
                "date": "2020-01-15",
                "expiryDate": "2025-01-15"
            }
        ],
        "availability": {
            "monday": [
                "09:00-12:00",
                "14:00-18:00"
            ],
            "tuesday": [
                "09:00-12:00",
                "14:00-18:00"
            ],
            "wednesday": [
                "09:00-12:00",
                "14:00-18:00"
            ],
            "thursday": [
                "09:00-12:00",
                "14:00-18:00"
            ],
            "friday": [
                "09:00-12:00",
                "14:00-18:00"
            ]
        },
        "id": "a50ed45f-a9e0-41d2-99df-a914c137eb8b",
        "tenantId": "05285e75-df97-4d87-b469-5722d911bd69",
        "userId": "a4e2371b-f63f-4caa-b644-a3258353a11c",
        "firstName": "John",
        "lastName": "Smith 1",
        "email": "john.trainer.updated@gym.com",
        "phone": "081234567890",
        "dateOfBirth": "1985-05-15",
        "gender": "male",
        "bio": "Senior trainer with 10+ years experience",
        "photoUrl": "https://example.com/photos/john.jpg",
        "commissionType": "percentage",
        "commissionValue": 20,
        "commissionNotes": "Increased to 20% after performance review",
        "isActive": true,
        "hireDate": "2024-01-01",
        "createdAt": "2025-11-23T08:12:08.077Z",
        "updatedAt": "2025-11-23T08:17:55.015Z",
        "deletedAt": null
    }
}

Delete Trainer
Delete
{{base_url}}/gym/trainers/{{trainer_id}}

untuk trainer commission dan pay commission memang belum dari backend atau masih on progress
