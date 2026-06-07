# Check-in Management Implementation

## Overview
Complete check-in management system for gym membership, including composables, pages, and navigation integration.

## Files Created

### 1. Composables
**Location:** `src/composables/gym/checkin-management/`

- **useCheckins.js** - Main composable for check-in management
  - `createCheckin()` - Create new check-in with optional service type
  - `fetchCheckins()` - Get all check-ins with pagination and filters
  - `getCheckinById()` - Get single check-in details
  - `updateCheckin()` - Update check-in (add checkout time, update notes)
  - `deleteCheckin()` - Delete a check-in
  - `getCheckinStatistics()` - Get check-in statistics (total, today, this week, etc.)
  - `getCheckinsByMember()` - Filter check-ins by member
  - `getCheckinsByDateRange()` - Filter check-ins by date range
  - `getCheckinsByServiceType()` - Filter check-ins by service type

- **index.js** - Barrel export for easy imports

### 2. Pages
**Location:** `src/pages/gym/check-ins/`

- **index.vue** - Check-ins list page
  - Statistics cards (Total, Today, This Week, Unique Members)
  - Advanced filters (Service Type, Date Range, Sort options)
  - Pagination
  - Quick actions (View, Check-out, Delete)
  - Active filters display with clear options

- **[id].vue** - Check-in detail page
  - Full check-in information
  - Member details with avatar
  - Check-in/Check-out times with duration calculation
  - Active service information (if applicable)
  - Edit notes modal
  - Check-out modal
  - Delete confirmation

- **new.vue** - Create new check-in page
  - Member search with autocomplete dropdown
  - Service type selection (General, PT Package, Class Package)
  - Active services display for selected member
  - Notes field
  - Real-time member search with debouncing

### 3. Navigation
**File:** `src/navigation/navigation.js`

Added new menu item:
```javascript
{
  label: "Check-ins",
  to: "/gym/check-ins",
  icon: "door-enter",
  action: "read",
  subject: "CheckIn",
  modes: ["gym", "fitness", "full"],
  requireModule: "gym",
}
```

### 4. Layout
**File:** `src/layouts/default.vue`

- Imported `IconDoorEnter` from @tabler/icons-vue
- Added "door-enter" to iconMap

## Features

### Check-in Management
- ✅ Create check-ins with optional service type
- ✅ View all check-ins with pagination
- ✅ Filter by service type, date range
- ✅ Sort by check-in time
- ✅ View individual check-in details
- ✅ Add check-out time
- ✅ Update notes
- ✅ Delete check-ins
- ✅ View statistics (total, today, this week, unique members)

### Member Integration
- ✅ Member search with autocomplete
- ✅ Display active services for selected member
- ✅ Member information in check-in details
- ✅ Member avatar with initials

### Service Integration
- ✅ Support for general membership check-ins
- ✅ Support for PT package check-ins (auto session usage)
- ✅ Support for class package check-ins
- ✅ Display active service information
- ✅ Session usage tracking

### UI/UX Features
- ✅ Responsive design (mobile-friendly)
- ✅ DaisyUI styling consistent with existing pages
- ✅ Loading states
- ✅ Empty states
- ✅ Error handling with notifications
- ✅ Confirmation modals for destructive actions
- ✅ Active filter indicators
- ✅ Pagination with visible page numbers
- ✅ Duration calculation for completed check-ins

## API Integration

The composables integrate with the following API endpoints:

### Check-ins
- `POST /gym/check-ins` - Create check-in
- `GET /gym/check-ins` - Get all check-ins (with filters)
- `GET /gym/check-ins/:id` - Get check-in by ID
- `PUT /gym/check-ins/:id` - Update check-in
- `DELETE /gym/check-ins/:id` - Delete check-in
- `GET /gym/check-ins/stats` - Get statistics

### Query Parameters
- `page` - Page number for pagination
- `limit` - Items per page
- `memberId` - Filter by member ID
- `serviceType` - Filter by service type (pt_package, class_package)
- `startDate` - Filter by start date (ISO format)
- `endDate` - Filter by end date (ISO format)
- `sortBy` - Sort field (checkInTime)
- `sortOrder` - Sort direction (ASC/DESC)

## Usage Examples

### Create Check-in
```javascript
import { useCheckins } from '@/composables/gym/checkin-management'

const { createCheckin, loading } = useCheckins()

// General membership check-in
await createCheckin({
  memberId: 'member-id',
  notes: 'Morning workout session'
})

// PT package check-in (auto session usage)
await createCheckin({
  memberId: 'member-id',
  serviceType: 'pt_package',
  notes: 'Upper body training'
})
```

### Get Check-ins with Filters
```javascript
const { fetchCheckins } = useCheckins()

const result = await fetchCheckins({
  page: 1,
  limit: 20,
  serviceType: 'pt_package',
  startDate: '2025-11-01T00:00:00Z',
  endDate: '2025-11-30T23:59:59Z',
  sortBy: 'checkInTime',
  sortOrder: 'DESC'
})
```

### Add Check-out Time
```javascript
const { updateCheckin } = useCheckins()

await updateCheckin('checkin-id', {
  checkOutTime: new Date().toISOString(),
  notes: 'Completed full workout session'
})
```

### Get Statistics
```javascript
const { getCheckinStatistics } = useCheckins()

const stats = await getCheckinStatistics({
  startDate: '2025-11-01',
  endDate: '2025-11-30'
})
// Returns: { total, today, thisWeek, thisMonth, uniqueMembersToday }
```

## Routes Generated

Based on the navigation configuration, the following routes will be auto-generated:

- `/gym/check-ins` - Check-ins list page
- `/gym/check-ins/new` - Create new check-in
- `/gym/check-ins/:id` - Check-in detail page

## Permissions

The check-ins feature requires:
- **Action:** `read`
- **Subject:** `CheckIn`
- **Module:** `gym` (from subscription)

## Styling Reference

The pages use the same styling patterns as the transactions pages:
- DaisyUI components (cards, buttons, tables, modals)
- Tailwind CSS utilities
- Responsive grid layouts
- Consistent color schemes and badges
- Loading and empty states

## Notes

1. **Member Selection**: The new check-in page uses the `useMembers` composable for member search with debouncing (300ms delay)

2. **Active Services**: When a member is selected, the system automatically fetches and displays their active services

3. **Service Type**: 
   - Leave empty for general membership check-in
   - Select "PT Package" or "Class Package" for specific service check-ins
   - Backend automatically handles session usage when service type is provided

4. **Duration Calculation**: Check-in detail page calculates and displays the duration between check-in and check-out times

5. **Statistics**: Statistics are loaded on page mount and refreshed after check-in/check-out/delete operations

6. **Error Handling**: All API calls use the notification system for success/error messages

## Development Notes

- Uses Vue 3 Composition API
- Follows existing project patterns and conventions
- Implements proper error handling and loading states
- Mobile-responsive design
- Accessible UI with proper ARIA labels
- Consistent with project's DaisyUI theme
