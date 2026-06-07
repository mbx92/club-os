# Subscription Plans Implementation - Quick Reference

## Overview
This implementation provides a complete subscription plans management system with:
- Full CRUD operations (Create, Read, Update, Delete)
- Super Admin access control
- Dynamic features management (JSON-based)
- Modal-based form with validation
- Notifications and confirmation dialogs
- Search and filter capabilities

## Files Created/Modified

### 1. Composable: `src/composables/useSubscriptionPlans.js`
Handles all business logic for subscription plans:
- `fetchPlans()` - Get all plans (public)
- `fetchPlanById(id)` - Get single plan
- `createPlan(data)` - Create new plan (Super Admin only)
- `updatePlan(id, data)` - Update plan (Super Admin only)
- `deletePlan(id)` - Deactivate plan (Super Admin only)
- `togglePlanActive(id, status)` - Toggle active status
- `isSuperAdmin()` - Check if user is Super Admin
- `formatCurrency(amount)` - Format price display
- `formatFeatures(features)` - Convert features object to array
- `validatePlanData(data)` - Validate form data

### 2. Component: `src/components/PlanFormModal.vue`
Modal form for creating/editing plans:
- Dynamic features management (add/remove)
- Common feature presets
- JSON preview
- Form validation
- Support for unlimited members (null value)

### 3. Page: `src/pages/subscription/plans.vue`
Main subscription plans page:
- Grid display of plans
- Search and filter functionality
- Action buttons (edit, delete, toggle active)
- Super Admin restrictions
- Empty state handling

## Features

### Dynamic Features Management
Features are stored as JSON and can be dynamically added:
```javascript
{
  "memberManagement": true,
  "classScheduling": true,
  "advancedReports": false,
  "api": true
}
```

### Common Feature Presets
Pre-defined features for quick addition:
- Member Management
- Class Scheduling
- Attendance Tracking
- Payment Processing
- Basic Reports
- Advanced Reports
- Multi-Location
- Custom Branding
- API Access
- Priority Support
- SMS Notifications
- Email Marketing

### Access Control
- **Super Admin** (`isSuperAdmin: true`): Full CRUD access
- **Regular Users**: Read-only access

### API Endpoints Used
All endpoints use `/api/v1/billing/plans`:
- `GET /billing/plans` - Fetch all plans (public)
- `GET /billing/plans/:id` - Fetch single plan (public)
- `POST /billing/plans` - Create plan (Super Admin)
- `PUT /billing/plans/:id` - Update plan (Super Admin)
- `DELETE /billing/plans/:id` - Delete/deactivate plan (Super Admin)

## Usage Examples

### Creating a New Plan
1. Click "Add Plan" button (Super Admin only)
2. Fill in plan details:
   - Name (required)
   - Description (optional)
   - Price (required, must be > 0)
   - Duration (default: 30 days)
   - Max Users (default: 1)
   - Max Members (null for unlimited)
   - Sort Order (default: 0)
3. Add features:
   - Click "Add Feature" for custom features
   - Use preset buttons for common features
   - Toggle enabled/disabled for each feature
4. Review JSON preview
5. Click "Create Plan"

### Editing a Plan
1. Click edit icon on plan card
2. Modify fields as needed
3. Update features list
4. Click "Update Plan"

### Deleting a Plan
1. Click delete icon (trash)
2. Confirm deletion in dialog
3. Plan will be deactivated (soft delete)

### Toggling Plan Status
1. Click toggle icon
2. Confirm activation/deactivation
3. Plan status updates immediately

## Plan Data Structure

```javascript
{
  name: "Professional",
  description: "Perfect for growing gyms",
  price: 249.00,
  duration: 30,
  maxUsers: 20,
  maxMembers: 500,
  sortOrder: 1,
  isActive: true,
  features: {
    memberManagement: true,
    classScheduling: true,
    attendance: true,
    payments: true,
    reports: true,
    advancedReports: true,
    multiLocation: false,
    customBranding: true,
    api: false,
    prioritySupport: true
  }
}
```

## Validation Rules

- **Name**: Required, must not be empty
- **Price**: Required, must be > 0
- **Duration**: Optional, if provided must be > 0
- **Max Users**: Optional, if provided must be > 0
- **Max Members**: Optional, null means unlimited
- **Features**: No restrictions, dynamic JSON

## Notifications

### Success Messages
- "Subscription plan created successfully"
- "Subscription plan updated successfully"
- "Subscription plan deactivated successfully"

### Error Handling
All errors are handled through `useNotification`:
- Network errors
- Validation errors
- Permission errors
- Server errors

## Confirmation Dialogs

Using `useDialog` from `utils.js`:

### Toggle Status
```javascript
dialog.confirm({
  title: 'Activate/Deactivate Plan',
  message: 'Are you sure you want to [action] the plan "[name]"?',
  type: 'warning'
})
```

### Delete Plan
```javascript
dialog.confirm({
  title: 'Delete Subscription Plan',
  message: 'Are you sure you want to delete the plan "[name]"?',
  type: 'danger',
  confirmText: 'Delete',
  cancelText: 'Cancel'
})
```

## Filter & Search

### Search
Searches in:
- Plan name
- Plan description

### Status Filter
- All Status
- Active Only
- Inactive Only

### Sorting
Plans are sorted by `sortOrder` (ascending)

## Display Features

### Plan Card Shows:
- Plan name
- Active/Inactive badge
- Price (formatted as USD)
- Duration
- Description
- Max Users
- Max Members (or "Unlimited")
- Features (as badges)
- Sort order (#)
- Action buttons (Super Admin only)

### Actions Available:
- Toggle active status
- Edit plan
- Delete plan

## Backend Response Structure

According to `BILLING-SUBSCRIPTION-FRONTEND.md`:

```javascript
{
  id: "uuid",
  name: "Basic",
  description: "Basic plan for small gyms",
  price: "99.00",
  duration: 30,
  maxUsers: 5,
  maxMembers: 100,
  features: {
    memberManagement: true,
    classScheduling: true,
    // ... more features
  },
  isActive: true,
  sortOrder: 1,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z"
}
```

## Testing Checklist

- [ ] Fetch all plans on page load
- [ ] Display plans in grid layout
- [ ] Search functionality works
- [ ] Status filter works
- [ ] Super Admin can create plans
- [ ] Super Admin can edit plans
- [ ] Super Admin can delete plans
- [ ] Super Admin can toggle plan status
- [ ] Regular users see read-only view
- [ ] Modal opens/closes properly
- [ ] Form validation works
- [ ] Dynamic features can be added/removed
- [ ] Preset features can be added
- [ ] JSON preview updates correctly
- [ ] Success notifications appear
- [ ] Error notifications appear
- [ ] Confirmation dialogs work
- [ ] Empty state displays correctly
- [ ] Loading states work

## Notes

1. **Unlimited Members**: Set `maxMembers` to `null` or leave empty in form
2. **Features**: Completely flexible - add any feature name/value pairs
3. **Sort Order**: Lower numbers appear first
4. **Soft Delete**: Delete operation sets `isActive: false`
5. **Currency**: Currently hardcoded to USD, can be made configurable
6. **Price Format**: Backend stores as decimal, frontend formats for display

## Future Enhancements

Possible improvements (from documentation):
- Trial period support
- Discount/coupon system
- Multiple currency support
- Plan comparison view
- Analytics dashboard
- Export functionality
- Bulk operations
- Plan templates
