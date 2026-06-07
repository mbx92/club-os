Service Plans Management

List Service Plans
Get
{{base_url}}/service/plans?page=1&limit=10&search=&serviceType=all&isActive=all&sortBy=displayOrder&sortOrder=ASC

page:1
limit:10
search:
serviceType:membership, class_package, pt_package, spa_package, custom, all
isActive:active status: true, false, all
sortBy:name, price, displayOrder, createdAt, serviceType
sortOrder:ASC, DESC

Resp:
{
    "data": [
        {
            "id": "c52b357f-6f85-444b-af1c-9de729db8989",
            "tenantId": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
            "serviceType": "membership",
            "name": "30 Days Gym Membership",
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
            "createdAt": "2025-11-24T23:50:48.267Z",
            "updatedAt": "2025-11-24T23:50:48.267Z",
            "deletedAt": null,
            "tenant": {
                "id": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
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
                    "timezone": "Asia/Jakarta",
                    "transaction": {
                        "taxEnable": true,
                        "taxPercentage": 11,
                        "currency": {
                            "defaultCurrency": "IDR",
                            "currencySymbol": "Rp",
                            "decimalSeparator": ",",
                            "thousandSeparator": ".",
                            "useDecimals": true
                        },
                        "discount": {
                            "allowMultipleDiscounts": false,
                            "discountCalculationOrder": [
                                "PERCENTAGE_FIRST",
                                "FIXED_AMOUNT_SECOND"
                            ],
                            "couponExpirationGracePeriod": 0
                        },
                        "payment": {
                            "enabledGateways": [],
                            "paymentTimeout": 60,
                            "midtransConfig": {
                                "apiKey": "",
                                "clientKey": "",
                                "sandbox": true,
                                "webhookUrl": ""
                            },
                            "stripeConfig": {
                                "apiKey": "",
                                "clientKey": "",
                                "sandbox": true,
                                "webhookUrl": ""
                            }
                        },
                        "invoice": {
                            "invoicePrefix": "INV-",
                            "startingInvoiceNumber": 1000,
                            "enableEmailNotifications": false,
                            "fromEmailAddress": ""
                        },
                        "shipping": {
                            "shippingCalculationType": "FLAT_RATE",
                            "requireShippingAddress": false
                        }
                    }
                }
            },
            "pricePerSession": null,
            "isTimeBased": true,
            "isSessionBased": false,
            "requiresTrainer": false,
            "tenantCurrency": {
                "defaultCurrency": "IDR",
                "currencySymbol": "Rp",
                "decimalSeparator": ",",
                "thousandSeparator": ".",
                "useDecimals": true
            }
        },
        {
            "id": "ccf98a7f-ceda-4f00-9a37-1170bad77c7a",
            "tenantId": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
            "serviceType": "class_package",
            "name": "12x Yoga Class Package",
            "description": "12 yoga class sessions valid for 30 days",
            "price": "1200000.00",
            "currency": "IDR",
            "durationType": "session_based",
            "duration": null,
            "sessions": 12,
            "validityDays": 30,
            "accessControl": {
                "applicableClassTypes": [
                    "yoga"
                ],
                "requiresTrainerAssignment": true
            },
            "isActive": true,
            "isPopular": false,
            "displayOrder": 2,
            "isBundle": false,
            "bundledServices": null,
            "version": 0,
            "createdAt": "2025-11-24T23:51:35.732Z",
            "updatedAt": "2025-11-24T23:51:35.732Z",
            "deletedAt": null,
            "tenant": {
                "id": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
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
                    "timezone": "Asia/Jakarta",
                    "transaction": {
                        "taxEnable": true,
                        "taxPercentage": 11,
                        "currency": {
                            "defaultCurrency": "IDR",
                            "currencySymbol": "Rp",
                            "decimalSeparator": ",",
                            "thousandSeparator": ".",
                            "useDecimals": true
                        },
                        "discount": {
                            "allowMultipleDiscounts": false,
                            "discountCalculationOrder": [
                                "PERCENTAGE_FIRST",
                                "FIXED_AMOUNT_SECOND"
                            ],
                            "couponExpirationGracePeriod": 0
                        },
                        "payment": {
                            "enabledGateways": [],
                            "paymentTimeout": 60,
                            "midtransConfig": {
                                "apiKey": "",
                                "clientKey": "",
                                "sandbox": true,
                                "webhookUrl": ""
                            },
                            "stripeConfig": {
                                "apiKey": "",
                                "clientKey": "",
                                "sandbox": true,
                                "webhookUrl": ""
                            }
                        },
                        "invoice": {
                            "invoicePrefix": "INV-",
                            "startingInvoiceNumber": 1000,
                            "enableEmailNotifications": false,
                            "fromEmailAddress": ""
                        },
                        "shipping": {
                            "shippingCalculationType": "FLAT_RATE",
                            "requireShippingAddress": false
                        }
                    }
                }
            },
            "pricePerSession": "100000.00",
            "isTimeBased": false,
            "isSessionBased": true,
            "requiresTrainer": true,
            "tenantCurrency": {
                "defaultCurrency": "IDR",
                "currencySymbol": "Rp",
                "decimalSeparator": ",",
                "thousandSeparator": ".",
                "useDecimals": true
            }
        },
        {
            "id": "b3e87339-37ca-4cbc-ab54-a5cf40d4b950",
            "tenantId": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
            "serviceType": "class_package",
            "name": "12x Yoga Class Package",
            "description": "12 yoga class sessions valid for 30 days",
            "price": "1200000.00",
            "currency": "IDR",
            "durationType": "session_based",
            "duration": null,
            "sessions": 12,
            "validityDays": 30,
            "accessControl": {
                "applicableClassTypes": [
                    "yoga"
                ],
                "requiresTrainerAssignment": true
            },
            "isActive": true,
            "isPopular": false,
            "displayOrder": 2,
            "isBundle": false,
            "bundledServices": null,
            "version": 0,
            "createdAt": "2025-11-24T23:50:56.420Z",
            "updatedAt": "2025-11-24T23:50:56.420Z",
            "deletedAt": null,
            "tenant": {
                "id": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
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
                    "timezone": "Asia/Jakarta",
                    "transaction": {
                        "taxEnable": true,
                        "taxPercentage": 11,
                        "currency": {
                            "defaultCurrency": "IDR",
                            "currencySymbol": "Rp",
                            "decimalSeparator": ",",
                            "thousandSeparator": ".",
                            "useDecimals": true
                        },
                        "discount": {
                            "allowMultipleDiscounts": false,
                            "discountCalculationOrder": [
                                "PERCENTAGE_FIRST",
                                "FIXED_AMOUNT_SECOND"
                            ],
                            "couponExpirationGracePeriod": 0
                        },
                        "payment": {
                            "enabledGateways": [],
                            "paymentTimeout": 60,
                            "midtransConfig": {
                                "apiKey": "",
                                "clientKey": "",
                                "sandbox": true,
                                "webhookUrl": ""
                            },
                            "stripeConfig": {
                                "apiKey": "",
                                "clientKey": "",
                                "sandbox": true,
                                "webhookUrl": ""
                            }
                        },
                        "invoice": {
                            "invoicePrefix": "INV-",
                            "startingInvoiceNumber": 1000,
                            "enableEmailNotifications": false,
                            "fromEmailAddress": ""
                        },
                        "shipping": {
                            "shippingCalculationType": "FLAT_RATE",
                            "requireShippingAddress": false
                        }
                    }
                }
            },
            "pricePerSession": "100000.00",
            "isTimeBased": false,
            "isSessionBased": true,
            "requiresTrainer": true,
            "tenantCurrency": {
                "defaultCurrency": "IDR",
                "currencySymbol": "Rp",
                "decimalSeparator": ",",
                "thousandSeparator": ".",
                "useDecimals": true
            }
        },
        {
            "id": "4a19a3ea-1c06-4e4b-a19a-ae33bd583afc",
            "tenantId": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
            "serviceType": "pt_package",
            "name": "8x Personal Training",
            "description": "8 personal training sessions with dedicated trainer, valid for 60 days",
            "price": "2000000.00",
            "currency": "IDR",
            "durationType": "session_based",
            "duration": null,
            "sessions": 8,
            "validityDays": 60,
            "accessControl": {
                "requiresTrainerAssignment": true
            },
            "isActive": true,
            "isPopular": true,
            "displayOrder": 3,
            "isBundle": false,
            "bundledServices": null,
            "version": 0,
            "createdAt": "2025-11-24T23:51:53.526Z",
            "updatedAt": "2025-11-24T23:51:53.526Z",
            "deletedAt": null,
            "tenant": {
                "id": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
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
                    "timezone": "Asia/Jakarta",
                    "transaction": {
                        "taxEnable": true,
                        "taxPercentage": 11,
                        "currency": {
                            "defaultCurrency": "IDR",
                            "currencySymbol": "Rp",
                            "decimalSeparator": ",",
                            "thousandSeparator": ".",
                            "useDecimals": true
                        },
                        "discount": {
                            "allowMultipleDiscounts": false,
                            "discountCalculationOrder": [
                                "PERCENTAGE_FIRST",
                                "FIXED_AMOUNT_SECOND"
                            ],
                            "couponExpirationGracePeriod": 0
                        },
                        "payment": {
                            "enabledGateways": [],
                            "paymentTimeout": 60,
                            "midtransConfig": {
                                "apiKey": "",
                                "clientKey": "",
                                "sandbox": true,
                                "webhookUrl": ""
                            },
                            "stripeConfig": {
                                "apiKey": "",
                                "clientKey": "",
                                "sandbox": true,
                                "webhookUrl": ""
                            }
                        },
                        "invoice": {
                            "invoicePrefix": "INV-",
                            "startingInvoiceNumber": 1000,
                            "enableEmailNotifications": false,
                            "fromEmailAddress": ""
                        },
                        "shipping": {
                            "shippingCalculationType": "FLAT_RATE",
                            "requireShippingAddress": false
                        }
                    }
                }
            },
            "pricePerSession": "250000.00",
            "isTimeBased": false,
            "isSessionBased": true,
            "requiresTrainer": true,
            "tenantCurrency": {
                "defaultCurrency": "IDR",
                "currencySymbol": "Rp",
                "decimalSeparator": ",",
                "thousandSeparator": ".",
                "useDecimals": true
            }
        }
    ],
    "pagination": {
        "currentPage": 1,
        "totalPages": 1,
        "totalRecords": 4,
        "limit": 10,
        "hasNextPage": false,
        "hasPrevPage": false
    },
    "filters": {
        "search": "",
        "serviceType": "all",
        "isActive": "all",
        "sortBy": "displayOrder",
        "sortOrder": "ASC"
    }
}


Get Service Plan by ID
Get
{{base_url}}/service/plans/{{servicePlanId}}
Resp:
{
    "data": {
        "id": "c52b357f-6f85-444b-af1c-9de729db8989",
        "tenantId": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
        "serviceType": "membership",
        "name": "30 Days Gym Membership",
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
        "createdAt": "2025-11-24T23:50:48.267Z",
        "updatedAt": "2025-11-24T23:50:48.267Z",
        "deletedAt": null,
        "tenant": {
            "id": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
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
                "timezone": "Asia/Jakarta",
                "transaction": {
                    "taxEnable": true,
                    "taxPercentage": 11,
                    "currency": {
                        "defaultCurrency": "IDR",
                        "currencySymbol": "Rp",
                        "decimalSeparator": ",",
                        "thousandSeparator": ".",
                        "useDecimals": true
                    },
                    "discount": {
                        "allowMultipleDiscounts": false,
                        "discountCalculationOrder": [
                            "PERCENTAGE_FIRST",
                            "FIXED_AMOUNT_SECOND"
                        ],
                        "couponExpirationGracePeriod": 0
                    },
                    "payment": {
                        "enabledGateways": [],
                        "paymentTimeout": 60,
                        "midtransConfig": {
                            "apiKey": "",
                            "clientKey": "",
                            "sandbox": true,
                            "webhookUrl": ""
                        },
                        "stripeConfig": {
                            "apiKey": "",
                            "clientKey": "",
                            "sandbox": true,
                            "webhookUrl": ""
                        }
                    },
                    "invoice": {
                        "invoicePrefix": "INV-",
                        "startingInvoiceNumber": 1000,
                        "enableEmailNotifications": false,
                        "fromEmailAddress": ""
                    },
                    "shipping": {
                        "shippingCalculationType": "FLAT_RATE",
                        "requireShippingAddress": false
                    }
                }
            }
        },
        "pricePerSession": null,
        "isTimeBased": true,
        "isSessionBased": false,
        "requiresTrainer": false,
        "tenantCurrency": {
            "defaultCurrency": "IDR",
            "currencySymbol": "Rp",
            "decimalSeparator": ",",
            "thousandSeparator": ".",
            "useDecimals": true
        }
    }
}

Get Service Type Stats
Get
{{base_url}}/service/plans/stats
{
    "data": [
        {
            "serviceType": "membership",
            "count": 1,
            "totalValue": "500000.00",
            "avgPrice": "500000.00"
        },
        {
            "serviceType": "class_package",
            "count": 2,
            "totalValue": "2400000.00",
            "avgPrice": "1200000.00"
        },
        {
            "serviceType": "pt_package",
            "count": 1,
            "totalValue": "2000000.00",
            "avgPrice": "2000000.00"
        }
    ]
}

Create Membership Plan (Time-based)
Post
{{base_url}}/service/plans
Payload
{
  "serviceType": "membership",
  "name": "90 Days Gym Membership",
  "description": "Full gym access for 30 days including all facilities",
  "price": 500000,
  "currency": "IDR",
  "durationType": "time_based",
  "duration": 30,
  "accessControl": {
    "facilities": ["gym", "pool", "sauna"],
    "accessHours": {
      "monday": ["06:00", "22:00"],
      "tuesday": ["06:00", "22:00"],
      "wednesday": ["06:00", "22:00"],
      "thursday": ["06:00", "22:00"],
      "friday": ["06:00", "22:00"],
      "saturday": ["08:00", "20:00"],
      "sunday": ["08:00", "20:00"]
    },
    "maxCheckIns": 30
  },
  "isActive": true,
  "isPopular": true,
  "displayOrder": 1
}
Resp:
{
    "message": "Service plan created successfully",
    "data": {
        "id": "b16bcc04-0e7e-4ec8-92d9-987e5ca1998a",
        "tenantId": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
        "serviceType": "membership",
        "name": "90 Days Gym Membership Test",
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
        "createdAt": "2025-11-25T01:00:38.454Z",
        "updatedAt": "2025-11-25T01:00:38.454Z",
        "deletedAt": null,
        "tenant": {
            "id": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
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
                "timezone": "Asia/Jakarta",
                "transaction": {
                    "taxEnable": true,
                    "taxPercentage": 11,
                    "currency": {
                        "defaultCurrency": "IDR",
                        "currencySymbol": "Rp",
                        "decimalSeparator": ",",
                        "thousandSeparator": ".",
                        "useDecimals": true
                    },
                    "discount": {
                        "allowMultipleDiscounts": false,
                        "discountCalculationOrder": [
                            "PERCENTAGE_FIRST",
                            "FIXED_AMOUNT_SECOND"
                        ],
                        "couponExpirationGracePeriod": 0
                    },
                    "payment": {
                        "enabledGateways": [],
                        "paymentTimeout": 60,
                        "midtransConfig": {
                            "apiKey": "",
                            "clientKey": "",
                            "sandbox": true,
                            "webhookUrl": ""
                        },
                        "stripeConfig": {
                            "apiKey": "",
                            "clientKey": "",
                            "sandbox": true,
                            "webhookUrl": ""
                        }
                    },
                    "invoice": {
                        "invoicePrefix": "INV-",
                        "startingInvoiceNumber": 1000,
                        "enableEmailNotifications": false,
                        "fromEmailAddress": ""
                    },
                    "shipping": {
                        "shippingCalculationType": "FLAT_RATE",
                        "requireShippingAddress": false
                    }
                }
            }
        },
        "pricePerSession": null,
        "isTimeBased": true,
        "isSessionBased": false,
        "requiresTrainer": false,
        "tenantCurrency": {
            "defaultCurrency": "IDR",
            "currencySymbol": "Rp",
            "decimalSeparator": ",",
            "thousandSeparator": ".",
            "useDecimals": true
        }
    }
}

Create Class Package (Session-based)
Post
{{base_url}}/service/plans
payload
{
  "serviceType": "class_package",
  "name": "12x Yoga Class Package",
  "description": "12 yoga class sessions valid for 30 days",
  "price": 1200000,
  "currency": "IDR",
  "durationType": "session_based",
  "sessions": 12,
  "validityDays": 30,
  "accessControl": {
    "applicableClassTypes": ["yoga"],
    "requiresTrainerAssignment": true
  },
  "isActive": true,
  "isPopular": false,
  "displayOrder": 2
}
Resp
{
    "message": "Service plan created successfully",
    "data": {
        "id": "fd1a120e-f056-4ff4-a130-232e96a0de45",
        "tenantId": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
        "serviceType": "class_package",
        "name": "12x Yoga Class Package",
        "description": "12 yoga class sessions valid for 30 days",
        "price": "1200000.00",
        "currency": "IDR",
        "durationType": "session_based",
        "duration": null,
        "sessions": 12,
        "validityDays": 30,
        "accessControl": {
            "applicableClassTypes": [
                "yoga"
            ],
            "requiresTrainerAssignment": true
        },
        "isActive": true,
        "isPopular": false,
        "displayOrder": 2,
        "isBundle": false,
        "bundledServices": null,
        "version": 0,
        "createdAt": "2025-11-25T01:00:16.833Z",
        "updatedAt": "2025-11-25T01:00:16.833Z",
        "deletedAt": null,
        "tenant": {
            "id": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
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
                "timezone": "Asia/Jakarta",
                "transaction": {
                    "taxEnable": true,
                    "taxPercentage": 11,
                    "currency": {
                        "defaultCurrency": "IDR",
                        "currencySymbol": "Rp",
                        "decimalSeparator": ",",
                        "thousandSeparator": ".",
                        "useDecimals": true
                    },
                    "discount": {
                        "allowMultipleDiscounts": false,
                        "discountCalculationOrder": [
                            "PERCENTAGE_FIRST",
                            "FIXED_AMOUNT_SECOND"
                        ],
                        "couponExpirationGracePeriod": 0
                    },
                    "payment": {
                        "enabledGateways": [],
                        "paymentTimeout": 60,
                        "midtransConfig": {
                            "apiKey": "",
                            "clientKey": "",
                            "sandbox": true,
                            "webhookUrl": ""
                        },
                        "stripeConfig": {
                            "apiKey": "",
                            "clientKey": "",
                            "sandbox": true,
                            "webhookUrl": ""
                        }
                    },
                    "invoice": {
                        "invoicePrefix": "INV-",
                        "startingInvoiceNumber": 1000,
                        "enableEmailNotifications": false,
                        "fromEmailAddress": ""
                    },
                    "shipping": {
                        "shippingCalculationType": "FLAT_RATE",
                        "requireShippingAddress": false
                    }
                }
            }
        },
        "pricePerSession": "100000.00",
        "isTimeBased": false,
        "isSessionBased": true,
        "requiresTrainer": true,
        "tenantCurrency": {
            "defaultCurrency": "IDR",
            "currencySymbol": "Rp",
            "decimalSeparator": ",",
            "thousandSeparator": ".",
            "useDecimals": true
        }
    }
}


Create PT Package (Session-based)
{{base_url}}/service/plans
payload
{
  "serviceType": "pt_package",
  "name": "8x Personal Training",
  "description": "8 personal training sessions with dedicated trainer, valid for 60 days",
  "price": 2000000,
  "currency": "IDR",
  "durationType": "session_based",
  "sessions": 8,
  "validityDays": 60,
  "accessControl": {
    "requiresTrainerAssignment": true
  },
  "isActive": true,
  "isPopular": true,
  "displayOrder": 3
}
resp
{
    "message": "Service plan created successfully",
    "data": {
        "id": "a3305abd-123b-44e8-adc6-94669335b261",
        "tenantId": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
        "serviceType": "pt_package",
        "name": "8x Personal Training test",
        "description": "8 personal training sessions with dedicated trainer, valid for 60 days",
        "price": "2000000.00",
        "currency": "IDR",
        "durationType": "session_based",
        "duration": null,
        "sessions": 8,
        "validityDays": 60,
        "accessControl": {
            "requiresTrainerAssignment": true
        },
        "isActive": true,
        "isPopular": true,
        "displayOrder": 3,
        "isBundle": false,
        "bundledServices": null,
        "version": 0,
        "createdAt": "2025-11-25T01:01:44.442Z",
        "updatedAt": "2025-11-25T01:01:44.442Z",
        "deletedAt": null,
        "tenant": {
            "id": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
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
                "timezone": "Asia/Jakarta",
                "transaction": {
                    "taxEnable": true,
                    "taxPercentage": 11,
                    "currency": {
                        "defaultCurrency": "IDR",
                        "currencySymbol": "Rp",
                        "decimalSeparator": ",",
                        "thousandSeparator": ".",
                        "useDecimals": true
                    },
                    "discount": {
                        "allowMultipleDiscounts": false,
                        "discountCalculationOrder": [
                            "PERCENTAGE_FIRST",
                            "FIXED_AMOUNT_SECOND"
                        ],
                        "couponExpirationGracePeriod": 0
                    },
                    "payment": {
                        "enabledGateways": [],
                        "paymentTimeout": 60,
                        "midtransConfig": {
                            "apiKey": "",
                            "clientKey": "",
                            "sandbox": true,
                            "webhookUrl": ""
                        },
                        "stripeConfig": {
                            "apiKey": "",
                            "clientKey": "",
                            "sandbox": true,
                            "webhookUrl": ""
                        }
                    },
                    "invoice": {
                        "invoicePrefix": "INV-",
                        "startingInvoiceNumber": 1000,
                        "enableEmailNotifications": false,
                        "fromEmailAddress": ""
                    },
                    "shipping": {
                        "shippingCalculationType": "FLAT_RATE",
                        "requireShippingAddress": false
                    }
                }
            }
        },
        "pricePerSession": "250000.00",
        "isTimeBased": false,
        "isSessionBased": true,
        "requiresTrainer": true,
        "tenantCurrency": {
            "defaultCurrency": "IDR",
            "currencySymbol": "Rp",
            "decimalSeparator": ",",
            "thousandSeparator": ".",
            "useDecimals": true
        }
    }
}


Create Spa Package (Session-based)
{{base_url}}/service/plans
payload
{
  "serviceType": "spa_package",
  "name": "5x Massage Package",
  "description": "5 massage sessions, valid for 90 days",
  "price": 1500000,
  "currency": "IDR",
  "durationType": "session_based",
  "sessions": 5,
  "validityDays": 90,
  "accessControl": {
    "requiresTrainerAssignment": false
  },
  "isActive": true,
  "isPopular": false,
  "displayOrder": 4
}
resp
{
    "message": "Service plan created successfully",
    "data": {
        "id": "826c0627-b7ea-42d3-bc31-13285a80ffaf",
        "tenantId": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
        "serviceType": "spa_package",
        "name": "5x Massage Package Test",
        "description": "5 massage sessions, valid for 90 days",
        "price": "1500000.00",
        "currency": "IDR",
        "durationType": "session_based",
        "duration": null,
        "sessions": 5,
        "validityDays": 90,
        "accessControl": {
            "requiresTrainerAssignment": false
        },
        "isActive": true,
        "isPopular": false,
        "displayOrder": 4,
        "isBundle": false,
        "bundledServices": null,
        "version": 0,
        "createdAt": "2025-11-25T01:03:11.656Z",
        "updatedAt": "2025-11-25T01:03:11.656Z",
        "deletedAt": null,
        "tenant": {
            "id": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
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
                "timezone": "Asia/Jakarta",
                "transaction": {
                    "taxEnable": true,
                    "taxPercentage": 11,
                    "currency": {
                        "defaultCurrency": "IDR",
                        "currencySymbol": "Rp",
                        "decimalSeparator": ",",
                        "thousandSeparator": ".",
                        "useDecimals": true
                    },
                    "discount": {
                        "allowMultipleDiscounts": false,
                        "discountCalculationOrder": [
                            "PERCENTAGE_FIRST",
                            "FIXED_AMOUNT_SECOND"
                        ],
                        "couponExpirationGracePeriod": 0
                    },
                    "payment": {
                        "enabledGateways": [],
                        "paymentTimeout": 60,
                        "midtransConfig": {
                            "apiKey": "",
                            "clientKey": "",
                            "sandbox": true,
                            "webhookUrl": ""
                        },
                        "stripeConfig": {
                            "apiKey": "",
                            "clientKey": "",
                            "sandbox": true,
                            "webhookUrl": ""
                        }
                    },
                    "invoice": {
                        "invoicePrefix": "INV-",
                        "startingInvoiceNumber": 1000,
                        "enableEmailNotifications": false,
                        "fromEmailAddress": ""
                    },
                    "shipping": {
                        "shippingCalculationType": "FLAT_RATE",
                        "requireShippingAddress": false
                    }
                }
            }
        },
        "pricePerSession": "300000.00",
        "isTimeBased": false,
        "isSessionBased": true,
        "requiresTrainer": false,
        "tenantCurrency": {
            "defaultCurrency": "IDR",
            "currencySymbol": "Rp",
            "decimalSeparator": ",",
            "thousandSeparator": ".",
            "useDecimals": true
        }
    }
}


Update Service Plan
Put
{{base_url}}/service/plans/{{servicePlanId}}
Payload
{
  "price": 550000,
  "isPopular": true,
  "description": "Updated description"
}
Resp:
{
    "message": "Service plan updated successfully",
    "data": {
        "id": "b16bcc04-0e7e-4ec8-92d9-987e5ca1998a",
        "tenantId": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
        "serviceType": "membership",
        "name": "90 Days Gym Membership Test",
        "description": "Updated description",
        "price": "550000.00",
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
        "version": 1,
        "createdAt": "2025-11-25T01:00:38.454Z",
        "updatedAt": "2025-11-25T01:37:37.767Z",
        "deletedAt": null,
        "tenant": {
            "id": "4dff6b9d-b89c-4a86-9929-1393b5b9aac6",
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
                "timezone": "Asia/Jakarta",
                "transaction": {
                    "taxEnable": true,
                    "taxPercentage": 11,
                    "currency": {
                        "defaultCurrency": "IDR",
                        "currencySymbol": "Rp",
                        "decimalSeparator": ",",
                        "thousandSeparator": ".",
                        "useDecimals": true
                    },
                    "discount": {
                        "allowMultipleDiscounts": false,
                        "discountCalculationOrder": [
                            "PERCENTAGE_FIRST",
                            "FIXED_AMOUNT_SECOND"
                        ],
                        "couponExpirationGracePeriod": 0
                    },
                    "payment": {
                        "enabledGateways": [],
                        "paymentTimeout": 60,
                        "midtransConfig": {
                            "apiKey": "",
                            "clientKey": "",
                            "sandbox": true,
                            "webhookUrl": ""
                        },
                        "stripeConfig": {
                            "apiKey": "",
                            "clientKey": "",
                            "sandbox": true,
                            "webhookUrl": ""
                        }
                    },
                    "invoice": {
                        "transactionPrefix": "GYM",
                        "orderPrefix": "ORD",
                        "quotePrefix": "QUO",
                        "invoicePrefix": "INV",
                        "startingInvoiceNumber": 1000,
                        "numberingFormat": "PREFIX-DATE-NUMBER",
                        "dateFormat": "YYYYMMDD",
                        "prefixSeparator": "/",
                        "enableEmailNotifications": false,
                        "fromEmailAddress": ""
                    },
                    "shipping": {
                        "shippingCalculationType": "FLAT_RATE",
                        "requireShippingAddress": false
                    }
                },
                "theme": {
                    "preset": "professional",
                    "lightTheme": "corporate",
                    "darkTheme": "business"
                }
            }
        },
        "pricePerSession": null,
        "isTimeBased": true,
        "isSessionBased": false,
        "requiresTrainer": false,
        "tenantCurrency": {
            "defaultCurrency": "IDR",
            "currencySymbol": "Rp",
            "decimalSeparator": ",",
            "thousandSeparator": ".",
            "useDecimals": true
        }
    }
}

Delete Service Plan
Delete
{{base_url}}/service/plans/{{servicePlanId}}