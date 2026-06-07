# Settings Page Structure

## Overview
The settings page has been converted to a tabbed interface with multiple categories of settings. Each tab contains specific functionality related to different aspects of tenant management.

## Tabs Structure

### 1. Tenant Settings ✅
**Status:** Fully Implemented  
**Component:** `src/components/settings/TenantSettingsTab.vue`

Manage basic tenant information:
- **Tenant Name** (required)
- **Domain** (required) - Unique domain identifier
- **Email** (required) - Contact email
- **Phone** - Contact phone number
- **Address** - Physical address
- **Currency** (required) - Default: USD
  - Options: USD, EUR, GBP, IDR, SGD, MYR, THB, AUD, CAD, JPY
- **Timezone** (required) - Default: Asia/Jakarta
  - Multiple timezone options for different regions
- **Logo URL** - Logo image URL with live preview

**API Endpoints:**
- `GET /tenants/:id` - Fetch tenant settings
- `PUT /tenants/:id` - Update tenant settings

---

### 2. Working Hours ✅
**Status:** Fully Implemented  
**Component:** `src/components/settings/WorkingHoursTab.vue`

Configure gym operating hours for each day of the week:
- Set opening and closing times for each day
- Mark days as closed with toggle switch
- Quick actions:
  - Apply to All Weekdays (Mon-Fri)
  - Apply to Weekend (Sat-Sun)
  - Apply to All Days

**Default Hours:**
- Monday - Friday: 08:00 - 22:00
- Saturday - Sunday: 08:00 - 20:00

**API Endpoints:**
- `GET /tenants/:id/working-hours` - Fetch working hours
- `PUT /tenants/:id/working-hours` - Update working hours

**Data Format:**
```json
{
  "workingHours": {
    "monday": ["08:00", "22:00"],
    "tuesday": ["08:00", "22:00"],
    "wednesday": ["08:00", "22:00"],
    "thursday": ["08:00", "22:00"],
    "friday": ["08:00", "22:00"],
    "saturday": ["08:00", "20:00"],
    "sunday": ["08:00", "20:00"]
  }
}
```

To mark a day as closed, set the value to `null`:
```json
{
  "workingHours": {
    "sunday": null
  }
}
```

---

### 3. Theme Settings ✅
**Status:** Fully Implemented  
**Component:** `src/components/settings/ThemeSettingsTab.vue`

Customize the application theme:
- Choose from predefined theme presets
- Preview themes in both light and dark modes
- Apply theme to all users in the tenant

**Features:**
- Live theme preview
- Multiple preset options (Ocean Blue, Forest Green, Sunset Orange, etc.)
- Synchronized light and dark mode themes

**API Endpoints:**
- `PUT /tenants/:id/theme` - Update theme settings

---

### 4. Subscription Details 🚧
**Status:** Coming Soon  
**Badge:** `Soon`

Will include:
- Current subscription plan details
- Billing information
- Usage statistics
- Plan upgrade/downgrade options

---

### 5. User Management 🔄
**Status:** Next Update  
**Badge:** `Next Update`

Planned features:
- List all users in the tenant
- Add new users
- Edit user details
- Activate/deactivate users
- Assign roles to users

---

### 6. Roles & Permissions Management 🚧
**Status:** Coming Soon  
**Badge:** `Soon`

Planned features:
- Create and manage user roles
- Define permissions for each role
- Assign permissions to roles
- Role hierarchy management

---

### 7. System View & Audit Log 🚧
**Status:** Coming Soon  
**Badge:** `Soon`

Planned features:
- System information
- Activity audit logs
- User action tracking
- Security events
- Export audit logs

---

## Composables

### `useTenantSettings()`
**Location:** `src/composables/useTenantSettings.js`

Handles all tenant settings and working hours API interactions.

**Exported Functions:**
- `fetchTenantSettings()` - Fetch tenant basic information
- `updateTenantSettings(data)` - Update tenant information
- `fetchWorkingHours()` - Fetch working hours configuration
- `updateWorkingHours(hours)` - Update working hours
- `getDefaultWorkingHours()` - Get default hours template

**Exported State:**
- `tenantSettings` - Current tenant settings
- `workingHours` - Current working hours
- `loading` - Loading state
- `saving` - Saving state
- `error` - Error message
- `currentTenantId` - Current tenant ID

---

## File Structure

```
src/
├── pages/
│   └── settings/
│       └── index.vue                          # Main settings page with tabs
├── components/
│   └── settings/
│       ├── TenantSettingsTab.vue              # Tenant basic settings
│       ├── WorkingHoursTab.vue                # Working hours configuration
│       └── ThemeSettingsTab.vue               # Theme customization
└── composables/
    ├── useTenantSettings.js                   # Tenant settings API handler
    └── useTheme.js                            # Theme management (existing)
```

---

## Usage

The settings page automatically loads when navigating to `/settings`. Each tab is independently functional and loads its data on demand.

### Tab Navigation
Tabs use Vue reactive state to switch between views without page reload. Click any tab to view its content.

### Form Validation
- Required fields are marked with `*`
- Forms disable save button when no changes are made
- Forms show loading state during save operations
- Success/error notifications appear after save operations

### Data Persistence
- All changes are saved to the backend via API
- Auth store is updated after successful saves
- Forms can be reset to original values
- Changes are validated before submission

---

## Icons Used
- `IconBuilding` - Tenant Settings
- `IconClock` - Working Hours
- `IconPalette` - Theme Settings
- `IconCreditCard` - Subscription Details
- `IconUsers` - User Management
- `IconShield` - Roles & Permissions
- `IconFileAnalytics` - System & Audit Log

All icons from `@tabler/icons-vue`

---

## Future Enhancements

1. **Subscription Details Tab**
   - Integration with payment gateway
   - Billing history
   - Invoice generation

2. **User Management Tab**
   - User invitation system
   - Email verification
   - User profile management

3. **Roles & Permissions Tab**
   - Fine-grained permission control
   - Role templates
   - Permission inheritance

4. **Audit Log Tab**
   - Real-time log streaming
   - Advanced filtering
   - Export functionality
