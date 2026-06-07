# API Endpoint Mapping (auto-generated)

Source: docs/restaurant implementation/Restaurant-Module-Complete.postman_collection.json

| Method | Endpoint | Module | Suggested Composable Method | Postman Item | Folder |
|---|---|---:|---|---|---|
| GET | `{{baseUrl}}/restaurant/products?search=&categoryId=&locationId=&lowStock=` | Products | `useRestaurantProducts.getRestaurantProductssearchcategoryIdlocationIdlowStock` | Get All Products | Products |
| GET | `{{baseUrl}}/restaurant/products/low-stock` | Products | `useRestaurantProducts.getRestaurantProductsLow-stock` | Get Low Stock Products | Products |
| GET | `{{baseUrl}}/restaurant/products/:id` | Products | `useRestaurantProducts.getRestaurantProducts:id` | Get Product by ID | Products |
| POST | `{{baseUrl}}/restaurant/products` | Products | `useRestaurantProducts.createRestaurantProducts` | Create Product | Products |
| PUT | `{{baseUrl}}/restaurant/products/:id` | Products | `useRestaurantProducts.updateRestaurantProducts:id` | Update Product | Products |
| DELETE | `{{baseUrl}}/restaurant/products/:id` | Products | `useRestaurantProducts.deleteRestaurantProducts:id` | Delete Product | Products |
| POST | `{{baseUrl}}/restaurant/products/:id/adjust-stock` | Products | `useRestaurantProducts.createRestaurantProducts:idAdjust-stock` | Adjust Stock | Products |
| GET | `{{baseUrl}}/restaurant/categories?tree=false&parentId=&includeCount=true` | Categories | `useRestaurantCategories.getRestaurantCategoriestreefalseparentIdincludeCounttrue` | Get All Categories | Categories |
| GET | `{{baseUrl}}/restaurant/categories/tree` | Categories | `useRestaurantCategories.getRestaurantCategoriesTree` | Get Category Tree | Categories |
| GET | `{{baseUrl}}/restaurant/categories/:id` | Categories | `useRestaurantCategories.getRestaurantCategories:id` | Get Category by ID | Categories |
| POST | `{{baseUrl}}/restaurant/categories` | Categories | `useRestaurantCategories.createRestaurantCategories` | Create Category | Categories |
| PUT | `{{baseUrl}}/restaurant/categories/:id` | Categories | `useRestaurantCategories.updateRestaurantCategories:id` | Update Category | Categories |
| DELETE | `{{baseUrl}}/restaurant/categories/:id?moveProductsTo=` | Categories | `useRestaurantCategories.deleteRestaurantCategories:idmoveProductsTo` | Delete Category | Categories |
| POST | `{{baseUrl}}/restaurant/categories/reorder` | Categories | `useRestaurantCategories.createRestaurantCategoriesReorder` | Reorder Categories | Categories |
| GET | `{{baseUrl}}/restaurant/tables?locationId=&status=&section=` | Tables | `useRestaurantTables.getRestaurantTableslocationIdstatussection` | Get All Tables | Tables |
| GET | `{{baseUrl}}/restaurant/tables/statistics?locationId=&startDate=&endDate=` | Tables | `useRestaurantTables.getRestaurantTablesStatisticslocationIdstartDateendDate` | Get Table Statistics | Tables |
| GET | `{{baseUrl}}/restaurant/tables/layout/:locationId` | Tables | `useRestaurantTables.getRestaurantTablesLayout:locationId` | Get Table Layout | Tables |
| GET | `{{baseUrl}}/restaurant/tables/:id` | Tables | `useRestaurantTables.getRestaurantTables:id` | Get Table by ID | Tables |
| POST | `{{baseUrl}}/restaurant/tables` | Tables | `useRestaurantTables.createRestaurantTables` | Create Table | Tables |
| PUT | `{{baseUrl}}/restaurant/tables/:id` | Tables | `useRestaurantTables.updateRestaurantTables:id` | Update Table | Tables |
| DELETE | `{{baseUrl}}/restaurant/tables/:id` | Tables | `useRestaurantTables.deleteRestaurantTables:id` | Delete Table | Tables |
| POST | `{{baseUrl}}/restaurant/tables/:id/occupy` | Tables | `useRestaurantTables.createRestaurantTables:idOccupy` | Occupy Table | Tables |
| POST | `{{baseUrl}}/restaurant/tables/:id/release` | Tables | `useRestaurantTables.createRestaurantTables:idRelease` | Release Table | Tables |
| POST | `{{baseUrl}}/restaurant/tables/:id/reserve` | Tables | `useRestaurantTables.createRestaurantTables:idReserve` | Reserve Table | Tables |
| POST | `{{baseUrl}}/restaurant/tables/:id/cleaning` | Tables | `useRestaurantTables.createRestaurantTables:idCleaning` | Set Table for Cleaning | Tables |
| GET | `{{baseUrl}}/restaurant/locations` | Locations | `useRestaurantLocations.getRestaurantLocations` | Get All Locations | Locations |
| GET | `{{baseUrl}}/restaurant/locations/with-stock` | Locations | `useRestaurantLocations.getRestaurantLocationsWith-stock` | Get Locations with Stock | Locations |
| GET | `{{baseUrl}}/restaurant/locations/:id` | Locations | `useRestaurantLocations.getRestaurantLocations:id` | Get Location by ID | Locations |
| GET | `{{baseUrl}}/restaurant/locations/:id/stock-summary` | Locations | `useRestaurantLocations.getRestaurantLocations:idStock-summary` | Get Stock Summary | Locations |
| GET | `{{baseUrl}}/restaurant/locations/distance/:fromId/:toId` | Locations | `useRestaurantLocations.getRestaurantLocationsDistance:fromId:toId` | Calculate Distance Between Locations | Locations |
| POST | `{{baseUrl}}/restaurant/locations` | Locations | `useRestaurantLocations.createRestaurantLocations` | Create Location | Locations |
| PUT | `{{baseUrl}}/restaurant/locations/:id` | Locations | `useRestaurantLocations.updateRestaurantLocations:id` | Update Location | Locations |
| PATCH | `{{baseUrl}}/restaurant/locations/:id/toggle` | Locations | `useRestaurantLocations.updateRestaurantLocations:idToggle` | Toggle Location Active | Locations |
| DELETE | `{{baseUrl}}/restaurant/locations/:id` | Locations | `useRestaurantLocations.deleteRestaurantLocations:id` | Delete Location | Locations |
| GET | `{{baseUrl}}/restaurant/stock-movements?productId=&locationId=&movementType=&startDate=&endDate=&page=1&limit=20` | Stock | `useRestaurantStock.getRestaurantStock-movementsproductIdlocationIdmovementTypestartDateendDatepage1limit20` | Get All Movements | Stock Movements |
| GET | `{{baseUrl}}/restaurant/stock-movements/report?reportType=current&locationId=&categoryId=&startDate=&endDate=` | Stock | `useRestaurantStock.getRestaurantStock-movementsReportreportTypecurrentlocationIdcategoryIdstartDateendDate` | Get Stock Report | Stock Movements |
| GET | `{{baseUrl}}/restaurant/stock-movements/summary?startDate=2024-01-01&endDate=2024-12-31` | Stock | `useRestaurantStock.getRestaurantStock-movementsSummarystartDate2024-01-01endDate2024-12-31` | Get Stock Summary | Stock Movements |
| GET | `{{baseUrl}}/restaurant/stock-movements/most-moved?limit=10` | Stock | `useRestaurantStock.getRestaurantStock-movementsMost-movedlimit10` | Get Most Moved Products | Stock Movements |
| GET | `{{baseUrl}}/restaurant/stock-movements/product/:productId` | Stock | `useRestaurantStock.getRestaurantStock-movementsProduct:productId` | Get Product History | Stock Movements |
| GET | `{{baseUrl}}/restaurant/stock-movements/:id` | Stock | `useRestaurantStock.getRestaurantStock-movements:id` | Get Movement by ID | Stock Movements |
| POST | `{{baseUrl}}/restaurant/stock-movements/stock-in` | Stock | `useRestaurantStock.createRestaurantStock-movementsStock-in` | Record Stock In | Stock Movements |
| POST | `{{baseUrl}}/restaurant/stock-movements/stock-out` | Stock | `useRestaurantStock.createRestaurantStock-movementsStock-out` | Record Stock Out | Stock Movements |
| POST | `{{baseUrl}}/restaurant/stock-movements/adjustment` | Stock | `useRestaurantStock.createRestaurantStock-movementsAdjustment` | Record Stock Adjustment | Stock Movements |
| POST | `{{baseUrl}}/restaurant/stock-movements/bulk-stock-in` | Stock | `useRestaurantStock.createRestaurantStock-movementsBulk-stock-in` | Bulk Stock In | Stock Movements |
| GET | `{{baseUrl}}/restaurant/orders?status=&tableId=&locationId=&orderType=&startDate=&endDate=&page=1&limit=20` | Orders | `useRestaurantOrders.getRestaurantOrdersstatustableIdlocationIdorderTypestartDateendDatepage1limit20` | Get All Orders | Orders |
| GET | `{{baseUrl}}/restaurant/orders/kitchen` | Orders | `useRestaurantOrders.getRestaurantOrdersKitchen` | Get Kitchen Orders | Orders |
| GET | `{{baseUrl}}/restaurant/orders/queue?locationId=&status=` | Orders | `useRestaurantOrders.getRestaurantOrdersQueuelocationIdstatus` | Get Queue List | Orders |
| GET | `{{baseUrl}}/restaurant/orders/table/:tableId` | Orders | `useRestaurantOrders.getRestaurantOrdersTable:tableId` | Get Orders by Table | Orders |
| GET | `{{baseUrl}}/restaurant/orders/:id` | Orders | `useRestaurantOrders.getRestaurantOrders:id` | Get Order by ID | Orders |
| POST | `{{baseUrl}}/restaurant/orders` | Orders | `useRestaurantOrders.createRestaurantOrders` | Create Order (Dine-in/Postpaid) | Orders |
| POST | `{{baseUrl}}/restaurant/orders/direct` | Orders | `useRestaurantOrders.createRestaurantOrdersDirect` | Create Direct Order (Prepaid/Takeaway) | Orders |
| POST | `{{baseUrl}}/restaurant/orders/:id/items` | Orders | `useRestaurantOrders.createRestaurantOrders:idItems` | Add Items to Order | Orders |
| PUT | `{{baseUrl}}/restaurant/orders/:id/status` | Orders | `useRestaurantOrders.updateRestaurantOrders:idStatus` | Update Order Status | Orders |
| POST | `{{baseUrl}}/restaurant/orders/validate-voucher` | Orders | `useRestaurantOrders.createRestaurantOrdersValidate-voucher` | Validate Voucher | Orders |
| POST | `{{baseUrl}}/restaurant/orders/:id/complete` | Orders | `useRestaurantOrders.createRestaurantOrders:idComplete` | Complete Order (Checkout) | Orders |
| POST | `{{baseUrl}}/restaurant/orders/:id/split` | Orders | `useRestaurantOrders.createRestaurantOrders:idSplit` | Split Bill (Equal) | Orders |
| POST | `{{baseUrl}}/restaurant/orders/:id/split` | Orders | `useRestaurantOrders.createRestaurantOrders:idSplit` | Split Bill (By Items) | Orders |
| POST | `{{baseUrl}}/restaurant/orders/merge` | Orders | `useRestaurantOrders.createRestaurantOrdersMerge` | Merge Bills | Orders |
| POST | `{{baseUrl}}/restaurant/orders/:id/print?type=receipt` | Orders | `useRestaurantOrders.createRestaurantOrders:idPrinttypereceipt` | Print Receipt | Orders |
| POST | `{{baseUrl}}/restaurant/orders/drawer/open` | Orders | `useRestaurantOrders.createRestaurantOrdersDrawerOpen` | Open Cash Drawer | Orders |
| GET | `{{baseUrl}}/restaurant/queue-display?tenantId=uuid-tenant-id&locationId=` | Queue | `useRestaurantQueue.getRestaurantQueue-displaytenantIduuid-tenant-idlocationId` | Get Queue Display (Public) | Queue Management |
| PUT | `{{baseUrl}}/restaurant/orders/queue/:id/status` | Orders | `useRestaurantOrders.updateRestaurantOrdersQueue:idStatus` | Update Queue Status | Queue Management |
| POST | `{{baseUrl}}/restaurant/orders/queue/:id/call` | Orders | `useRestaurantOrders.createRestaurantOrdersQueue:idCall` | Call Queue Number | Queue Management |
| POST | `{{baseUrl}}/restaurant/billing/combined` | Billing | `useRestaurantBilling.createRestaurantBillingCombined` | Create Combined Transaction | Combined Billing |
| GET | `{{baseUrl}}/restaurant/billing/receipt/:id` | Billing | `useRestaurantBilling.getRestaurantBillingReceipt:id` | Get Transaction Receipt | Combined Billing |
| POST | `{{baseUrl}}/restaurant/billing/validate-voucher` | Billing | `useRestaurantBilling.createRestaurantBillingValidate-voucher` | Validate Voucher for Billing | Combined Billing |
| GET | `{{baseUrl}}/restaurant/reports/sales?startDate=2024-12-01&endDate=2024-12-31&locationId=&groupBy=day&orderType=` | Reports | `useRestaurantReports.getRestaurantReportsSalesstartDate2024-12-01endDate2024-12-31locationIdgroupBydayorderType` | Get Sales Report | Reports |
| GET | `{{baseUrl}}/restaurant/reports/products?startDate=2024-12-01&endDate=2024-12-31&categoryId=&limit=10&sortBy=quantity` | Reports | `useRestaurantReports.getRestaurantReportsProductsstartDate2024-12-01endDate2024-12-31categoryIdlimit10sortByquantity` | Get Product Report | Reports |
| GET | `{{baseUrl}}/restaurant/reports/tables?startDate=2024-12-01&endDate=2024-12-31&locationId=` | Reports | `useRestaurantReports.getRestaurantReportsTablesstartDate2024-12-01endDate2024-12-31locationId` | Get Table Report | Reports |
| GET | `{{baseUrl}}/restaurant/reports/daily-summary?date=2024-12-01&locationId=` | Reports | `useRestaurantReports.getRestaurantReportsDaily-summarydate2024-12-01locationId` | Get Daily Summary | Reports |
| GET | `{{baseUrl}}/restaurant/stock-report?reportType=current&locationId=&categoryId=` | Stock | `useRestaurantStock.getRestaurantStock-reportreportTypecurrentlocationIdcategoryId` | Get Stock Report (Alias) | Reports |
