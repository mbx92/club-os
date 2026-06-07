// Test Combined Billing with Service Plans
// This script tests if combined billing can handle different service types

const testCases = [
  {
    name: "Service Plan (Membership)",
    payload: {
      customerId: "member-uuid",
      customerType: "member",
      items: [
        {
          type: "service_plan",
          servicePlanId: "plan-uuid",
          startDate: "2025-12-06"
        },
        {
          type: "product",
          productId: "product-uuid",
          quantity: 2
        }
      ],
      payments: [
        {
          method: "cash",
          amount: 600000
        }
      ]
    }
  },
  {
    name: "Class Package",
    payload: {
      customerId: "member-uuid",
      customerType: "member",
      items: [
        {
          type: "class_package",
          servicePlanId: "class-package-uuid",
          startDate: "2025-12-06"
        }
      ],
      payments: [
        {
          method: "cash",
          amount: 500000
        }
      ]
    }
  },
  {
    name: "PT Package",
    payload: {
      customerId: "member-uuid",
      customerType: "member",
      items: [
        {
          type: "pt_package",
          servicePlanId: "pt-package-uuid",
          startDate: "2025-12-06"
        }
      ],
      payments: [
        {
          method: "cash",
          amount: 1200000
        }
      ]
    }
  }
];

console.log("Combined Billing Test Cases:");
console.log("============================\n");

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}`);
  console.log(`   Item type: ${testCase.payload.items[0].type}`);
  console.log(`   Expected: Should create ActiveService with status 'suspended'`);
  console.log(`   Expected: After payment, status should be 'active'`);
  console.log();
});

console.log("\nSupported item types in combined billing:");
console.log("- product");
console.log("- membership (legacy)");
console.log("- service_plan");
console.log("- class_package");
console.log("- pt_package");
console.log("- spa_package");

console.log("\nActiveService status flow:");
console.log("1. Create with status: 'suspended'");
console.log("2. After payment: Update to 'active'");
console.log("3. Valid statuses: active, expired, depleted, cancelled, suspended");

console.log("\nAPI Endpoint:");
console.log("POST /api/v1/restaurant/billing/combined");
console.log("\nPayload structure:");
console.log(JSON.stringify(testCases[0].payload, null, 2));
