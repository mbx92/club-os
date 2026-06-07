# Theme Live Change - Technical Flow

## Alur Kerja Theme Settings (Live Change)

### 1. **Initial Load (Login/Page Refresh)**
```
User Login 
  ↓
Backend Response: { user: { tenant: { settings: { theme: {...} } } } }
  ↓
Frontend: authStore.user.tenant.settings.theme
  ↓
useTheme() reads tenantTheme from store
  ↓
Apply theme to DOM: document.documentElement.setAttribute('data-theme', themeName)
```

### 2. **User Changes Theme (Live Update)**
```
User clicks palette icon → Opens modal
  ↓
User selects new theme preset (e.g., "Warm & Energetic")
  ↓
User clicks "Save Theme"
  ↓
Frontend: PATCH /api/tenants/settings { theme: { preset, lightTheme, darkTheme } }
  ↓
Backend: Updates tenant.settings JSONB → Returns success
  ↓
Frontend Actions (Simultaneous):
  ├─ Update authStore.user.tenant.settings.theme (local state)
  ├─ Update localStorage/sessionStorage (persist across refresh)
  ├─ Broadcast to other tabs via localStorage event
  └─ Re-apply theme immediately (live change!)
       ↓
       document.documentElement.setAttribute('data-theme', newTheme)
       ↓
       UI updates instantly (no page refresh needed)
```

### 3. **Multi-Tab Sync (Other Open Tabs)**
```
Tab A: User saves new theme
  ↓
localStorage.setItem('gym:theme:broadcast', JSON.stringify({ theme, timestamp }))
  ↓
Browser fires 'storage' event to ALL other tabs
  ↓
Tab B, C, D: Listen to 'storage' event
  ↓
Parse broadcast data → Update local authStore
  ↓
Re-apply theme on all tabs simultaneously
  ↓
All tabs show new theme instantly! ✨
```

## File Struktur

### `src/composables/useTheme.js`
**Key Methods:**
- `updateTenantTheme()` - PATCH API + update local state + broadcast
- `setupThemeBroadcastListener()` - Listen for theme changes from other tabs
- `applyTheme()` - Apply theme to DOM (data-theme attribute)
- `initTheme()` - Initialize theme on app load

### `src/stores/auth.js`
**Computed Property:**
- `tenantTheme` - Reactive reference to `user.tenant.settings.theme`
- Watched by `useTheme()` composable for changes

### `src/layouts/default.vue`
**Setup:**
- Calls `initTheme()` on mount
- Calls `setupThemeBroadcastListener()` for multi-tab sync
- Modal UI for theme selection

## Data Flow Example

### Request to Backend:
```javascript
PATCH /api/tenants/settings
Content-Type: application/json

{
  "theme": {
    "preset": "warm",
    "lightTheme": "autumn",
    "darkTheme": "coffee"
  }
}
```

### Backend Response (Expected):
```javascript
{
  "success": true,
  "message": "Settings updated successfully",
  "data": {
    "tenant": {
      "id": "34d54115-9b04-4673-b0fa-a6016fae4f7f",
      "settings": {
        "theme": {
          "preset": "warm",
          "lightTheme": "autumn",
          "darkTheme": "coffee"
        },
        // ... other settings
      }
    }
  }
}
```

### Frontend State After Update:
```javascript
authStore.user.tenant.settings.theme = {
  preset: "warm",
  lightTheme: "autumn",
  darkTheme: "coffee"
}

// DOM updated immediately:
<html data-theme="autumn"> <!-- or "coffee" if dark mode active -->
```

## Live Change Mechanism

### 1. **Immediate Apply (Same Tab)**
```javascript
// After successful API response:
authStore.user.tenant.settings.theme = newTheme
  ↓
watch(() => authStore.tenantTheme) triggers
  ↓
applyTheme(isDark.value) executes
  ↓
document.documentElement.setAttribute('data-theme', 'autumn')
  ↓
DaisyUI CSS variables change instantly
  ↓
UI re-renders with new colors (no page reload!)
```

### 2. **Broadcast to Other Tabs**
```javascript
// Broadcast via localStorage:
localStorage.setItem('gym:theme:broadcast', JSON.stringify({
  timestamp: Date.now(),
  theme: { preset: 'warm', lightTheme: 'autumn', darkTheme: 'coffee' }
}))

// Other tabs listen:
window.addEventListener('storage', (e) => {
  if (e.key === 'gym:theme:broadcast') {
    const { theme } = JSON.parse(e.newValue)
    authStore.user.tenant.settings.theme = theme
    applyTheme(isDark.value) // Live change on other tabs!
  }
})
```

## Testing Live Change

### Test Scenario 1: Single Tab
1. Login as admin
2. Click palette icon 🎨
3. Select "Warm & Energetic"
4. Click "Save Theme"
5. **Expected:** Theme changes instantly to autumn/coffee colors (no reload)

### Test Scenario 2: Multiple Tabs
1. Open 3 tabs with the app logged in
2. In Tab 1: Change theme to "Fresh & Modern"
3. Click Save
4. **Expected:** 
   - Tab 1: Instant change to emerald/forest
   - Tab 2 & 3: Auto-update to emerald/forest within 1 second (no reload)

### Test Scenario 3: Light/Dark Toggle
1. Change tenant theme to "Luxurious" (winter/luxury)
2. Toggle dark mode icon 🌙
3. **Expected:** 
   - Light mode: winter theme (cool blue-white)
   - Dark mode: luxury theme (dark with gold)
4. Toggle back to light
5. **Expected:** Switches back to winter instantly

## Debug Tips

### Check if Theme Applied:
```javascript
// Open browser DevTools Console:
console.log(document.documentElement.getAttribute('data-theme'))
// Should show: "autumn", "coffee", "corporate", etc.

console.log(getComputedStyle(document.documentElement).getPropertyValue('--p'))
// Should show: CSS variable value (e.g., "25.86 94.78% 54.12%")
```

### Check Auth Store State:
```javascript
// In Vue DevTools or Console:
import { useAuthStore } from '@/stores/auth'
const authStore = useAuthStore()
console.log(authStore.tenantTheme)
// Should show: { preset: 'warm', lightTheme: 'autumn', darkTheme: 'coffee' }
```

### Test Broadcast:
```javascript
// Manually trigger broadcast in Console:
localStorage.setItem('gym:theme:broadcast', JSON.stringify({
  timestamp: Date.now(),
  theme: { preset: 'cyber', lightTheme: 'lofi', darkTheme: 'synthwave' }
}))
// Other tabs should update immediately
```

## Performance Notes

- **No Page Reload:** Theme changes via CSS variable updates only
- **Instant Feedback:** < 50ms delay for DOM update
- **Multi-Tab Sync:** < 1 second across all tabs
- **Storage Impact:** Minimal (< 1KB for theme settings)
- **API Calls:** Only on save, not on every toggle

## Troubleshooting

### Issue: Theme not changing after save
**Solution:**
1. Check API response has `success: true`
2. Verify `authStore.user.tenant.settings.theme` updated
3. Check browser console for errors
4. Ensure DaisyUI theme CSS is loaded (check Network tab)

### Issue: Other tabs not updating
**Solution:**
1. Check `setupThemeBroadcastListener()` is called in `onMounted`
2. Verify localStorage is accessible (not in private/incognito mode)
3. Check browser console for storage event listener errors

### Issue: Theme reverts after refresh
**Solution:**
1. Verify `localStorage.setItem('user', ...)` is updating correctly
2. Check backend actually saved the settings to database
3. Ensure `initTheme()` reads from updated user data on mount
