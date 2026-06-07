# Finance Module - UI Wireframe Documentation

## Overview
This document provides ASCII wireframes for all pages in the Finance module implementation.

---

## 1. Finance Dashboard (`/finances/index.vue`)

```
┌────────────────────────────────────────────────────────────────────┐
│                        Finance Management                           │
│                   Track expenses, manage categories                 │
└────────────────────────────────────────────────────────────────────┘

┌─────────────┬─────────────┬─────────────┬─────────────┐
│  Expenses   │ Categories  │   Reports   │ Quick Stats │
│ [$ icon]    │  [# icon]   │ [📊 icon]   │  [📈 icon]  │
│  Manage     │  Organize   │  Financial  │ This month  │
│  expenses   │  expenses   │  analysis   │             │
└─────────────┴─────────────┴─────────────┴─────────────┘

┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Total Exp   │  Pending    │  Approved   │   Paid      │
│  (MTD)      │  Approval   │             │   (MTD)     │
│    -        │     -       │     -       │     -       │
└─────────────┴─────────────┴─────────────┴─────────────┘

┌──────────────────────────┬──────────────────────────┐
│  Recent Expenses         │  Expense Categories      │
│  ┌──────────────────┐   │  ┌──────────────────┐   │
│  │ No recent        │   │  │ No categories    │   │
│  │ expenses         │   │  │ configured       │   │
│  └──────────────────┘   │  └──────────────────┘   │
│  [View All →]            │  [Manage →]              │
└──────────────────────────┴──────────────────────────┘

┌──────────────────────────┬──────────────────────────┐
│ ℹ️  Getting Started       │ ✓  Expense Workflow      │
│ Start by creating        │ Draft → Pending →        │
│ expense categories...    │ Approved → Paid          │
└──────────────────────────┴──────────────────────────┘
```

---

## 2. Expenses List (`/finances/expenses.vue`)

```
┌────────────────────────────────────────────────────────────────────┐
│  Expenses                                        [+ Add Expense]    │
│  Track and manage all your expenses                                │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Filters & Search                                                   │
│ ┌─────────────┬──────────┬──────────┬──────────┬──────────┬─────┐ │
│ │ Search...   │ Status ▾ │Category▾ │StartDate │ EndDate  │Show▾│ │
│ └─────────────┴──────────┴──────────┴──────────┴──────────┴─────┘ │
│                                                                    │
│ Active filters: [Search: "office" ✕] [Status: pending ✕] [Clear] │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Expense Number │ Title      │ Category │ Date    │ Vendor │ Amount│
│────────────────┼────────────┼──────────┼─────────┼────────┼───────│
│ EXP-2025-001   │ Office     │ ● Office │ Jan 15  │ PT ABC │ 150K  │
│                │ Supplies   │ Supplies │ Due:30  │        │Tax:15K│
│                │ Monthly... │          │         │        │[Draft]│
│                │            │          │         │        │[✏️][🗑]│
│────────────────┼────────────┼──────────┼─────────┼────────┼───────│
│ EXP-2025-002   │ Rent       │ ● Rent   │ Jan 1   │ Owner  │ 10M   │
│                │ Monthly    │          │         │        │[Pend] │
│                │            │          │         │        │[✓][✏️]│
└────────────────┴────────────┴──────────┴─────────┴────────┴───────┘

                    « Page 1 of 5 »
```

---

## 3. Expense Form Modal

```
┌────────────────────────────────────────────────────────┐
│  Create New Expense                             [✕]    │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Title *                                               │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Enter expense title                              │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Category *              Location                     │
│  ┌─────────────────┐    ┌─────────────────┐          │
│  │ Select ▾        │    │ Select ▾        │          │
│  └─────────────────┘    └─────────────────┘          │
│                                                        │
│  Amount *                Tax Amount                   │
│  ┌─────────────────┐    ┌─────────────────┐          │
│  │ 0               │    │ 0               │          │
│  └─────────────────┘    └─────────────────┘          │
│                                                        │
│  ℹ️  Total Amount: Rp 0                                │
│                                                        │
│  Expense Date *          Due Date                     │
│  ┌─────────────────┐    ┌─────────────────┐          │
│  │ 2025-01-15      │    │                 │          │
│  └─────────────────┘    └─────────────────┘          │
│                                                        │
│  Vendor                  Reference Number             │
│  ┌─────────────────┐    ┌─────────────────┐          │
│  │                 │    │                 │          │
│  └─────────────────┘    └─────────────────┘          │
│                                                        │
│  Payment Method          Status                       │
│  ┌─────────────────┐    ┌─────────────────┐          │
│  │ Select ▾        │    │ Draft ▾         │          │
│  └─────────────────┘    └─────────────────┘          │
│                                                        │
│  Description                                          │
│  ┌──────────────────────────────────────────────────┐ │
│  │                                                  │ │
│  │                                                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Notes                                                │
│  ┌──────────────────────────────────────────────────┐ │
│  │                                                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ☐ Recurring Expense                                  │
│                                                        │
│  Tags                                                 │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Enter tags separated by comma                    │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
├────────────────────────────────────────────────────────┤
│                              [Cancel]    [Create]      │
└────────────────────────────────────────────────────────┘
```

---

## 4. Expense Categories (`/finances/categories.vue`)

```
┌────────────────────────────────────────────────────────────────────┐
│  Expense Categories                           [+ Add Category]     │
│  Organize your expenses with categories                            │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Filters                                                            │
│ ┌──────────────────────┬───────────────────────────────┐          │
│ │ Status ▾             │ ☐ Include Statistics          │          │
│ └──────────────────────┴───────────────────────────────┘          │
└────────────────────────────────────────────────────────────────────┘

┌─────────────┬─────────────┬─────────────┐
│ ● Salaries  │ ● Utilities │ ● Marketing │
│ [Fixed]     │ [Operation] │ [Variable]  │
│             │             │             │
│ Staff wages │ Electricity │ Ads & promo │
│ and salary  │ water, etc  │ campaigns   │
│             │             │             │
│ Total Exp:  │ Total Exp:  │ Total Exp:  │
│ Rp 25M      │ Rp 18M      │ Rp 5M       │
│ 12 trans    │ 144 trans   │ 8 trans     │
│             │             │             │
│ Avg Amount: │ Avg Amount: │ Avg Amount: │
│ Rp 2.08M    │ Rp 125K     │ Rp 625K     │
│             │             │             │
│ Status:     │ Status:     │ Status:     │
│ [Active]    │ [Active]    │ [Active]    │
│             │      [⋮]    │      [⋮]    │
└─────────────┴─────────────┴─────────────┘
```

---

## 5. Category Form Modal

```
┌────────────────────────────────────────────────────────┐
│  Create New Category                            [✕]    │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Name *                                                │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Enter category name                              │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Type *                                                │
│  ┌──────────────────────────────────────────────────┐ │
│  │ Select type ▾                                    │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  Color                   Icon                         │
│  ┌─────────────────┐    ┌─────────────────┐          │
│  │ [#3498db]       │    │ Icon name       │          │
│  └─────────────────┘    └─────────────────┘          │
│                                                        │
│  Description                                          │
│  ┌──────────────────────────────────────────────────┐ │
│  │                                                  │ │
│  │                                                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                        │
│  ☑ Active                                             │
│                                                        │
├────────────────────────────────────────────────────────┤
│                              [Cancel]    [Create]      │
└────────────────────────────────────────────────────────┘
```

---

## 6. Financial Reports Hub (`/finances/reports/index.vue`)

```
┌────────────────────────────────────────────────────────────────────┐
│  Financial Reports                                                 │
│  Access comprehensive financial reports and analytics              │
└────────────────────────────────────────────────────────────────────┘

┌─────────────────┬─────────────────┬─────────────────┐
│ [📊]            │ [📈]            │ [💰]            │
│ Profit & Loss   │ Revenue Report  │ Expense Report  │
│                 │                 │                 │
│ View P&L with   │ Detailed rev    │ Analyze exp by  │
│ revenue, exp,   │ breakdown by    │ category and    │
│ net profit      │ module & method │ period          │
│                 │                 │                 │
│ [View Report]   │ [View Report]   │ [View Report]   │
└─────────────────┴─────────────────┴─────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  Quick Overview                                                    │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐    │
│  │Total Exp MTD │Total Rev MTD │Net Profit MTD│Profit Mrg MTD│    │
│  │     -        │      -       │      -       │      -       │    │
│  │Month to date │Month to date │Month to date │Month to date │    │
│  └──────────────┴──────────────┴──────────────┴──────────────┘    │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ ℹ️  Report Information                                              │
│ All financial reports are based on completed transactions and      │
│ approved/paid expenses. Use filters in each report to customize.   │
└────────────────────────────────────────────────────────────────────┘
```

---

## 7. Profit & Loss Report (`/finances/reports/profit-loss.vue`)

```
┌────────────────────────────────────────────────────────────────────┐
│  Profit & Loss Report                                              │
│  View comprehensive profit and loss analysis                       │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ P&L Report Filters                                                 │
│ ┌───────────┬───────────┬───────────┐                             │
│ │Start Date │ End Date  │ Group By  │                             │
│ │2025-01-01 │2025-12-31 │ Month ▾   │                             │
│ └───────────┴───────────┴───────────┘                             │
│                                                                    │
│ Location: [All Locations ▾]                                        │
│                                                     [Generate]     │
└────────────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬──────────────┐
│Total Revenue │Total Expenses│  Net Profit  │Profit Margin │
│  Rp 150M     │   Rp 85M     │   Rp 65M     │   43.33%     │
│2025-01-01 -  │Operating     │Revenue - Exp │Net profit %  │
│2025-12-31    │costs         │              │              │
└──────────────┴──────────────┴──────────────┴──────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Period Analysis                                                    │
│ ┌────────┬────────┬──────────┬───────────┬──────────┐            │
│ │ Period │Revenue │ Expenses │Net Profit │ Margin % │            │
│ ├────────┼────────┼──────────┼───────────┼──────────┤            │
│ │ Jan 25 │ 12.5M  │   7.0M   │   5.5M    │  44.00%  │            │
│ │ Feb 25 │ 13.0M  │   7.2M   │   5.8M    │  44.62%  │            │
│ │ Mar 25 │ 11.8M  │   6.9M   │   4.9M    │  41.53%  │            │
│ └────────┴────────┴──────────┴───────────┴──────────┘            │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Revenue by Module                                                  │
│ ┌──────────────┬──────────────┬──────────────┐                    │
│ │ Membership   │     POS      │  Restaurant  │                    │
│ │   Rp 8M      │   Rp 3M      │   Rp 1.5M    │                    │
│ └──────────────┴──────────────┴──────────────┘                    │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Expenses by Category                                               │
│ ┌─────────┬─────┬────────┬──────┬────────────┐                    │
│ │Category │Type │ Total  │Count │Percentage  │                    │
│ ├─────────┼─────┼────────┼──────┼────────────┤                    │
│ │●Salaries│Fixed│  45M   │ 120  │  52.94%    │                    │
│ │●Utilities│Oper│  18M   │ 144  │  21.18%    │                    │
│ │●Marketing│Var │  12M   │  8   │  17.14%    │                    │
│ └─────────┴─────┴────────┴──────┴────────────┘                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 8. Revenue Report (`/finances/reports/revenue.vue`)

```
┌────────────────────────────────────────────────────────────────────┐
│  Revenue Report                                                    │
│  Detailed revenue breakdown and analysis                           │
└────────────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┐
│Total Revenue │   Total TX   │   Avg TX     │
│  Rp 12.5M    │     450      │  Rp 27.7K    │
│2025-01-01 -  │Number of tx  │Per tx        │
│2025-01-31    │              │              │
└──────────────┴──────────────┴──────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Revenue by Module                                                  │
│ ┌──────┬────────┬──────┬──────────┬────────────────────────┐      │
│ │Module│ Total  │ TX   │ Percent  │ [■■■■■■■░░░] 64%       │      │
│ ├──────┼────────┼──────┼──────────┼────────────────────────┤      │
│ │Member│  8M    │ 200  │  64.00%  │ [■■■■■■■░░░]           │      │
│ │POS   │  3M    │ 180  │  24.00%  │ [■■■░░░░░░░]           │      │
│ │Rest  │ 1.5M   │  70  │  12.00%  │ [■■░░░░░░░░]           │      │
│ └──────┴────────┴──────┴──────────┴────────────────────────┘      │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Revenue by Payment Method                                          │
│ ┌──────────────┬──────────────┬──────────────┐                    │
│ │   Transfer   │     Cash     │ Credit Card  │                    │
│ │   Rp 7.5M    │   Rp 3M      │   Rp 2M      │                    │
│ │ 250 tx (60%) │ 150 tx (24%) │ 50 tx (16%)  │                    │
│ └──────────────┴──────────────┴──────────────┘                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 9. Expense Report (`/finances/reports/expenses.vue`)

```
┌────────────────────────────────────────────────────────────────────┐
│  Expense Report                                                    │
│  Detailed expense breakdown and analysis                           │
└────────────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┐
│Total Expenses│ Total Count  │ Avg Expense  │
│   Rp 7M      │      85      │  Rp 82.3K    │
│2025-01-01 -  │Number of exp │Per expense   │
│2025-01-31    │              │              │
└──────────────┴──────────────┴──────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Expenses by Category                                               │
│ ┌─────────┬──────┬────────┬──────┬────────┬────────────────┐      │
│ │Category │ Type │ Total  │Count │Percent │ [■■■■░░] 50%   │      │
│ ├─────────┼──────┼────────┼──────┼────────┼────────────────┤      │
│ │●Salaries│Fixed │  3.5M  │  10  │ 50.00% │ [■■■■■░░░░░]   │      │
│ │●Utility │Oper  │  1.5M  │  12  │ 21.43% │ [■■░░░░░░░░]   │      │
│ │●Market  │Var   │  1.2M  │   8  │ 17.14% │ [■░░░░░░░░░]   │      │
│ └─────────┴──────┴────────┴──────┴────────┴────────────────┘      │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Expenses by Status                                                 │
│ ┌──────────┬──────────┬──────────┬──────────┐                     │
│ │   Paid   │ Approved │ Pending  │  Draft   │                     │
│ │  Rp 6M   │  Rp 1M   │  Rp 0    │  Rp 0    │                     │
│ │ 70 exp   │  15 exp  │   0 exp  │   0 exp  │                     │
│ └──────────┴──────────┴──────────┴──────────┘                     │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ Expenses by Period                                                 │
│ ┌────────┬────────┬──────┬────────┬──────┐                        │
│ │ Period │ Amount │ Tax  │ Total  │Count │                        │
│ ├────────┼────────┼──────┼────────┼──────┤                        │
│ │Week 1  │ 1.6M   │ 160K │ 1.76M  │  20  │                        │
│ │Week 2  │ 1.55M  │ 155K │ 1.71M  │  18  │                        │
│ │Week 3  │ 1.5M   │ 150K │ 1.65M  │  22  │                        │
│ └────────┴────────┴──────┴────────┴──────┘                        │
└────────────────────────────────────────────────────────────────────┘
```

---

## Component Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                      Finance Module                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Pages:                                                     │
│  ├─ index.vue (Dashboard)                                   │
│  ├─ expenses.vue (List)                                     │
│  ├─ categories.vue (List)                                   │
│  └─ reports/                                                │
│     ├─ index.vue (Hub)                                      │
│     ├─ profit-loss.vue                                      │
│     ├─ revenue.vue                                          │
│     └─ expenses.vue                                         │
│                                                             │
│  Components:                                                │
│  ├─ ExpenseFormModal.vue                                    │
│  ├─ CategoryFormModal.vue                                   │
│  └─ ReportFilters.vue                                       │
│                                                             │
│  Composables:                                               │
│  ├─ useExpenses.js                                          │
│  ├─ useExpenseCategories.js                                 │
│  └─ useFinancialReports.js                                  │
│                                                             │
│  Shared Components:                                         │
│  └─ DialogConfirm.vue (from shared)                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Navigation Flow

```
                  ┌─────────────────┐
                  │ Finance Dash    │
                  │ (/finances)     │
                  └────────┬────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼───┐      ┌──────▼──────┐   ┌─────▼─────┐
    │Expenses│      │ Categories  │   │  Reports  │
    │        │      │             │   │   Hub     │
    └────┬───┘      └──────┬──────┘   └─────┬─────┘
         │                 │                 │
    ┌────▼────┐            │         ┌───────┼──────┐
    │ Create/ │            │         │       │      │
    │  Edit   │            │    ┌────▼───┬───▼───┬──▼────┐
    │ Expense │            │    │ P&L    │Revenue│Expense│
    └─────────┘            │    │ Report │Report │Report │
                           │    └────────┴───────┴───────┘
                      ┌────▼────┐
                      │ Create/ │
                      │  Edit   │
                      │Category │
                      └─────────┘
```

---

## Status Badges Color Scheme

```
Draft      → [Gray]    badge-ghost
Pending    → [Yellow]  badge-warning
Approved   → [Blue]    badge-info
Paid       → [Green]   badge-success
Cancelled  → [Red]     badge-error
```

## Category Type Badges

```
Operational → [Primary]  badge-primary
Fixed       → [Info]     badge-info
Variable    → [Warning]  badge-warning
One Time    → [Accent]   badge-accent
```

---

## Responsive Breakpoints

- **Mobile (< 768px)**: Single column layout
- **Tablet (768px - 1024px)**: 2 column grid
- **Desktop (> 1024px)**: 3-4 column grid

---

## Icons Used (Tabler Icons)

- IconPlus - Add new items
- IconEdit - Edit actions
- IconTrash - Delete actions
- IconCheck - Approve/confirm
- IconCreditCard - Payment/paid
- IconFileInvoice - Expenses
- IconTag - Categories
- IconChartBar - Charts/stats
- IconChartLine - Line charts
- IconReportMoney - Money reports
- IconEye - View details
- IconDotsVertical - More options menu
- IconInfoCircle - Information
- IconTrendingUp - Growth/stats
- IconCurrencyDollar - Money
- IconReceipt - Receipt/transaction

---

## End of Wireframe Documentation
