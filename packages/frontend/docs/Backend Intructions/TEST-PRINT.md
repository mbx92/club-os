# Test Print Documentation

Thermal printer test functionality dengan tracking PrintJobs.

## Quick Start

### Method 1: Direct TCP Test (No API)

```bash
# List all printers
node test-print.js list

# Test with printer ID
node test-print.js a0746034-832f-44c8-9eb6-01005078c6e7

# Test with printer name (partial match)
node test-print.js "Receipt Printer"

# Test with IP address directly
node test-print.js 192.168.1.100
node test-print.js 192.168.1.100 9100
```

### Method 2: Via REST API

```bash
# List all printers
node test-print-api.js list

# Test print (creates PrintJob)
node test-print-api.js test a0746034-832f-44c8-9eb6-01005078c6e7

# View recent jobs
node test-print-api.js jobs a0746034-832f-44c8-9eb6-01005078c6e7
```

**Note**: Edit credentials in `test-print-api.js` if needed:
```javascript
const CREDENTIALS = {
  username: 'superadmin',
  password: 'superadmin123'
};
```

## API Endpoint

### POST /api/v1/system/printers/:id/test-print

Send test receipt to thermal printer dengan PrintJob tracking.

**Authentication**: Bearer token required  
**Permission**: `update:PrinterSettings`  
**Feature Gate**: `thermalPrinting`

#### Request Body

```json
{
  "jobType": "manual",
  "metadata": {
    "description": "Test print from dashboard",
    "source": "frontend"
  }
}
```

#### Response

```json
{
  "success": true,
  "message": "Test print sent successfully",
  "data": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "printer": {
      "id": "a0746034-832f-44c8-9eb6-01005078c6e7",
      "name": "IT Receipt Printer - RSIA",
      "type": "receipt",
      "model": "TM-T82X",
      "ipAddress": "10.5.80.20",
      "port": 9100
    },
    "status": "completed",
    "duration": 1245,
    "timestamp": "2025-12-07T11:20:00.000Z"
  }
}
```

#### Error Responses

**Printer not found**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Printer not found"
  }
}
```

**Printer not active**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Printer is not active"
  }
}
```

**Print failed**:
```json
{
  "success": false,
  "error": {
    "code": "PRINTER_ERROR",
    "message": "Test print failed: Connection timeout"
  }
}
```

## Test Receipt Content

The test receipt includes:

1. **Header**
   - "TEST PRINT" title (double size)
   - Tenant name (from tenant settings)
   - Business address and phone

2. **Test Information**
   - Date and time
   - Printer details (name, model, type, IP)
   - Status indicator

3. **Sample Items**
   - Membership Gold (3 Bulan) - Rp 1.500.000
   - PT Session (12 Sesi) - Rp 2.400.000
   - Total: Rp 3.900.000

4. **Footer**
   - Thank you message
   - Test timestamp
   - Paper cut command

## ESC/POS Commands Used

```javascript
INIT           // Initialize printer
ALIGN_CENTER   // Center text
ALIGN_LEFT     // Left align text
BOLD_ON        // Bold text
BOLD_OFF       // Normal weight
DOUBLE_SIZE_ON // Double height/width
NORMAL_SIZE    // Normal size
LINE_FEED      // New line (\n)
FEED_AND_CUT   // Feed 3 lines and cut paper
```

## PrintJob Tracking

Every test print creates a `PrintJob` record:

- **Status Flow**: `pending` → `printing` → `completed`
- **Error Handling**: Failures marked as `failed` with error message
- **Retry Logic**: Supports automatic retry (max 3 attempts)
- **Monitoring**: Jobs tracked for stuck detection and statistics

### View Print Jobs

```bash
GET /api/v1/system/printers/:id/jobs?limit=50&offset=0
```

## Printer Requirements

### Network Printers Only

Currently supports only **network (TCP/IP)** printers:
- Connection type must be `network`
- Printer must have valid `ipAddress` and `port`
- Printer must be `isActive: true`

### Supported Models

Tested with:
- **Epson TM-T82X** (80mm thermal printer)
- Other ESC/POS compatible printers

### Connection Settings

Default port: `9100` (most thermal printers)  
Timeout: `10 seconds`  
Character set: ESC/POS standard  
Paper width: `48 characters` (80mm paper)

## Troubleshooting

### Connection Timeout

```
❌ Socket error: Connection timeout
```

**Solutions**:
1. Check printer IP address
2. Verify printer is powered on
3. Check network connectivity
4. Verify firewall allows port 9100

### Printer Not Active

```
❌ Printer is not active
```

**Solution**: Enable printer in tenant settings:
```bash
PATCH /api/v1/system/printers/:id
{
  "isActive": true
}
```

### Permission Denied

```
❌ Forbidden: update:PrinterSettings
```

**Solution**: Ensure user has `PrinterSettings` update permission and subscription includes `thermalPrinting` feature.

## Integration Example

### Frontend Button

```javascript
async function testPrint(printerId) {
  try {
    const response = await fetch(
      `${API_URL}/system/printers/${printerId}/test-print`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jobType: 'manual',
          metadata: {
            source: 'dashboard',
            description: 'Test print button'
          }
        })
      }
    );
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Test print successful');
      console.log(`Job ID: ${result.data.jobId}`);
      console.log(`Duration: ${result.data.duration}ms`);
    } else {
      console.error('❌ Test print failed:', result.error.message);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}
```

### React Component

```jsx
import { useState } from 'react';

function TestPrintButton({ printerId }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  
  const handleTestPrint = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch(
        `/api/v1/system/printers/${printerId}/test-print`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jobType: 'manual',
            metadata: { source: 'react-component' }
          })
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        setResult({
          type: 'success',
          message: `Test print sent! Duration: ${data.data.duration}ms`,
          jobId: data.data.jobId
        });
      } else {
        setResult({
          type: 'error',
          message: data.error.message
        });
      }
    } catch (error) {
      setResult({
        type: 'error',
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <button onClick={handleTestPrint} disabled={loading}>
        {loading ? 'Printing...' : 'Test Print'}
      </button>
      
      {result && (
        <div className={result.type}>
          {result.message}
          {result.jobId && <span>Job ID: {result.jobId}</span>}
        </div>
      )}
    </div>
  );
}
```

## Next Steps

1. **Template Management**: Create CRUD endpoints for receipt templates
2. **Queue Processor**: Background worker to process pending PrintJobs
3. **Auto-print**: Integration with transactions/orders
4. **Template Variables**: Parser for `{{variable}}` syntax
5. **Multi-printer**: Simultaneous printing to multiple printers
6. **USB Support**: Add USB printer support (requires node-usb)

## Files

- `test-print.js` - Direct TCP test utility (no API)
- `test-print-api.js` - REST API test utility
- `src/controllers/core/system/printerSettingsController.js` - Controller with testPrint()
- `src/routes/core/system/printerSettings.routes.js` - Route definition
- `src/models/printJob.js` - PrintJob model
- `docs/PRINTER-HEALTH-MONITORING.md` - Health monitoring docs

## See Also

- [Printer Connection Stream](./PRINTER-CONNECTION-STREAM.md)
- [Printer Health Monitoring](./PRINTER-HEALTH-MONITORING.md)
- [Frontend Integration - React](./frontend-integration/printer-monitoring/REACT-INTEGRATION.md)
- [Frontend Integration - Vue](./frontend-integration/printer-monitoring/VUE-INTEGRATION.md)
- [Frontend Integration - Vanilla JS](./frontend-integration/printer-monitoring/VANILLA-JS-INTEGRATION.md)
