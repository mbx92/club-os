# Printer Settings - Implementation Summary

## Overview
Tab Printer Settings di halaman Settings untuk mengelola thermal printers dengan fitur lengkap sesuai endpoint API yang tersedia.

## Files Created

### 1. Tab Component
- **Location**: `src/components/settings/PrinterSettingsTab.vue`
- **Features**:
  - List semua printers dengan filtering
  - Statistics cards (total, print jobs, failed jobs, by type)
  - Filter by type, connection, status, dan search
  - Actions: test connection, edit, activate/deactivate, set default, delete
  - Network scanning (full & quick scan)

### 2. Composable
- **Location**: `src/composables/gym/printer-settings.js`
- **Methods**:
  - `getPrinters(filters)` - Get all printers with filters
  - `getPrinter(id)` - Get single printer
  - `createPrinter(data)` - Create new printer
  - `updatePrinter(id, data)` - Update printer
  - `deletePrinter(id)` - Delete printer
  - `testPrinterConnection(id)` - Test printer connection
  - `getStatistics()` - Get printer statistics
  - `scanNetwork(options)` - Full network scan
  - `quickScan()` - Quick scan

### 3. Modal Components

#### PrinterFormModal
- **Location**: `src/components/settings/PrinterFormModal.vue`
- **Features**:
  - Create/Edit printer form
  - Support all printer types (receipt, kitchen, label, invoice, report)
  - Network configuration (IP, port)
  - Receipt template settings (collapsible)
  - Template customization: header, body, footer settings

#### NetworkScanModal
- **Location**: `src/components/settings/NetworkScanModal.vue`
- **Features**:
  - Full network scan with IP range option
  - Quick scan for common IP ranges
  - Strict mode (ESC/POS only) vs Quick mode (all printer ports)
  - Display found printers with details
  - One-click add printer from scan results

### 4. Integration
- **Location**: `src/pages/core/settings/index.vue`
- Added new tab "Printer Settings" in settings page
- Integrated PrinterSettingsTab component

## API Endpoints Used

All endpoints from `Printer Settings.postman_collection.json`:

1. **GET** `/system/printers` - Get all printers (with filters)
2. **GET** `/system/printers/:id` - Get single printer
3. **POST** `/system/printers` - Create printer
4. **PUT** `/system/printers/:id` - Update printer
5. **DELETE** `/system/printers/:id` - Delete printer
6. **POST** `/system/printers/:id/test` - Test connection
7. **GET** `/system/printers/statistics` - Get statistics
8. **GET** `/system/printers/scan` - Full network scan
9. **GET** `/system/printers/scan/quick` - Quick scan

## Navigation

**Integrated as Tab in Settings Page**:
- Page: **Settings** → Tab: **Printer Settings**
- Route: `/core/settings` (with tab parameter)
- No separate menu item - accessed from Settings page
- Located between "Roles & Permissions" and "System & Audit Log" tabs

## Usage Example

### Access the Tab
1. Navigate to: **Settings** (menu or `/core/settings`)
2. Click on **Printer Settings** tab

### 1. Printer Management
- ✅ Create new printer (manual)
- ✅ Edit existing printer
- ✅ Delete printer with confirmation
- ✅ Toggle active/inactive status
- ✅ Set as default printer (auto-unset others)

### 2. Network Scanning
- ✅ Auto-discover printers on network
- ✅ Full scan with IP range specification
- ✅ Quick scan for common ranges
- ✅ Strict mode (ESC/POS validation)
- ✅ Display printer info (manufacturer, model)
- ✅ One-click add from scan results

### 3. Connection Testing
- ✅ Test printer connectivity
- ✅ Display connection status
- ✅ Show response time
- ✅ Health check indicator

### 4. Receipt Template
- ✅ Header settings (logo, business name, address, phone)
- ✅ Body settings (font size, item code, discount, tax)
- ✅ Footer settings (thank you message, social media)
- ✅ Custom message configuration

### 5. Filtering & Search
- ✅ Filter by printer type
- ✅ Filter by connection type
- ✅ Filter by active status
- ✅ Search by name, model, IP
- ✅ Real-time search with debounce

### 6. Statistics Dashboard
- ✅ Total printers count
- ✅ Active/inactive breakdown
- ✅ Total print jobs
- ✅ Success/failed jobs count
- ✅ Breakdown by type
- ✅ Breakdown by connection

## Icons Used (Tabler Icons)
- `IconPlus` - Add printer
- `IconPrinter` - Printer icon
- `IconPrinterOff` - No printer
- `IconNetwork` - Network connection
- `IconWorldWww` - IP address
- `IconDeviceDesktop` - Model/device
- `IconRuler` - Paper size
- `IconDotsVertical` - Actions menu
- `IconEdit` - Edit
- `IconTrash` - Delete
- `IconPlugConnected` - Test connection
- `IconPower` - Activate/deactivate
- `IconStar` - Set default
- `IconRadar` - Network scan
- `IconBolt` - Quick scan
- `IconInfoCircle` - Info
- `IconX` - Close/clear

## Usage Example

## Features Implemented

### 1. Printer Management

### Add Printer Manually
1. Click "Add Printer" button
2. Fill in printer details
3. For network printers, enter IP and port
4. Configure receipt template (optional)
5. Click "Create"

### Scan Network
1. Click "Scan Network" button
2. Choose scan mode:
   - **Full Scan**: Comprehensive scan with ESC/POS validation
   - **Quick Scan**: Faster scan of common IP ranges
3. Wait for results
4. Click "Add" on any discovered printer
5. Review and save printer details

### Test Connection
1. Find printer in list
2. Click "..." menu
3. Select "Test Connection"
4. View connection status and response time

## Permissions Required

- `read:PrinterSettings` - View printers
- `create:PrinterSettings` - Add new printer, scan network
- `update:PrinterSettings` - Edit printer, test connection
- `delete:PrinterSettings` - Delete printer

## Feature Gate

This feature requires:
- **Feature**: `printing.thermalPrinting`
- **Plan**: Professional or Enterprise

If tenant doesn't have this feature, the menu item won't appear.

## Notes

- Network scanning works best on same subnet
- Default port for thermal printers: 9100 (Raw/JetDirect)
- Other common ports: 515 (LPD), 631 (IPP)
- ESC/POS protocol is industry standard for thermal printers
- Full network scan may take 30-60 seconds
- Quick scan typically completes in 5-10 seconds
