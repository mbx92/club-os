# Printer Connection Stream - Real-time Monitoring

## 📡 Overview

Stream real-time printer connection status menggunakan **Server-Sent Events (SSE)** untuk monitoring printer network secara continuous.

## 🎯 Features

- ✅ Real-time ping monitoring setiap 10 detik
- ✅ Timeout 3 detik per ping attempt
- ✅ TCP socket connection test ke port 9100
- ✅ Latency measurement (response time)
- ✅ Auto-cleanup on client disconnect
- ✅ SSE format (Server-Sent Events)

## 📋 API Endpoint

```
GET /api/v1/system/printers/:id/stream/connection
```

**Requirements:**
- Authentication: Bearer token
- Permission: `read:PrinterSettings`
- Feature gate: `thermalPrinting`
- Printer type: `network` only

## 🔄 Response Format

### Connection Established
```
data: {"type":"connected","message":"Stream established"}
```

### Status Updates (Every 10 seconds)

**Online:**
```json
data: {
  "type": "status",
  "printerId": "uuid-printer-id",
  "printerName": "Receipt Printer 1",
  "status": "online",
  "latency": 45,
  "timestamp": "2024-12-07T12:00:00.000Z"
}
```

**Offline:**
```json
data: {
  "type": "status",
  "printerId": "uuid-printer-id",
  "printerName": "Receipt Printer 1",
  "status": "offline",
  "error": "Connection timeout",
  "timestamp": "2024-12-07T12:00:10.000Z"
}
```

## 🧪 Testing

### 1. Using cURL

```bash
curl -N -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/system/printers/PRINTER_ID/stream/connection
```

**Expected output:**
```
data: {"type":"connected","message":"Stream established"}

data: {"type":"status","printerId":"...","status":"online","latency":45,"timestamp":"..."}

data: {"type":"status","printerId":"...","status":"online","latency":42,"timestamp":"..."}
```

### 2. Using Postman

1. Create new request: `GET /api/v1/system/printers/:id/stream/connection`
2. Add Authorization header
3. Click **Send**
4. Keep connection open - data will stream every 10 seconds

### 3. Frontend JavaScript (EventSource)

```javascript
// Connect to stream
const printerId = 'your-printer-id';
const token = localStorage.getItem('authToken');

const eventSource = new EventSource(
  `/api/v1/system/printers/${printerId}/stream/connection`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

// Listen for messages
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'connected') {
    console.log('Stream connected:', data.message);
  }
  
  if (data.type === 'status') {
    console.log(`Printer ${data.printerName}: ${data.status}`);
    
    if (data.status === 'online') {
      console.log(`Latency: ${data.latency}ms`);
      // Update UI - show green indicator
      updatePrinterStatus(data.printerId, 'online', data.latency);
    } else {
      console.log(`Error: ${data.error}`);
      // Update UI - show red indicator
      updatePrinterStatus(data.printerId, 'offline', data.error);
    }
  }
};

// Handle errors
eventSource.onerror = (error) => {
  console.error('Stream error:', error);
  eventSource.close();
};

// Close stream when done
function cleanup() {
  eventSource.close();
  console.log('Stream closed');
}
```

### 4. Frontend React Hook Example

```javascript
import { useEffect, useState } from 'react';

function usePrinterStream(printerId) {
  const [status, setStatus] = useState({
    connected: false,
    online: false,
    latency: null,
    error: null
  });

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const eventSource = new EventSource(
      `/api/v1/system/printers/${printerId}/stream/connection`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'connected') {
        setStatus(prev => ({ ...prev, connected: true }));
      }
      
      if (data.type === 'status') {
        setStatus({
          connected: true,
          online: data.status === 'online',
          latency: data.latency || null,
          error: data.error || null
        });
      }
    };

    eventSource.onerror = () => {
      setStatus(prev => ({ ...prev, connected: false }));
    };

    return () => eventSource.close();
  }, [printerId]);

  return status;
}

// Usage in component
function PrinterMonitor({ printerId }) {
  const printerStatus = usePrinterStream(printerId);

  return (
    <div>
      <h3>Printer Status</h3>
      <p>Connected: {printerStatus.connected ? '✅' : '❌'}</p>
      <p>Online: {printerStatus.online ? '🟢' : '🔴'}</p>
      {printerStatus.latency && <p>Latency: {printerStatus.latency}ms</p>}
      {printerStatus.error && <p>Error: {printerStatus.error}</p>}
    </div>
  );
}
```

## 🔧 Configuration

**Stream Parameters:**
- **Ping Interval:** 10 seconds (hardcoded)
- **Timeout:** 3 seconds per ping attempt
- **Connection Method:** TCP socket to port 9100
- **Auto-cleanup:** On client disconnect

**Modify intervals** (if needed) in `printerSettingsController.js`:
```javascript
const PING_TIMEOUT = 3000;      // 3 seconds
const PING_INTERVAL = 10000;    // 10 seconds

// In streamConnection function:
await pingPrinter(printer.ipAddress, printer.port || 9100, PING_TIMEOUT);
const intervalId = setInterval(doPing, PING_INTERVAL);
```

## 📊 Performance Considerations

**Resource Usage:**
- Each stream maintains 1 TCP connection
- Minimal memory overhead (~1KB per connection)
- CPU usage: Negligible (only during ping)

**Recommended Limits:**
- Max concurrent streams per tenant: **10**
- Max concurrent streams per server: **100**
- Auto-close inactive streams after: **15 minutes**

## 🛡️ Security

**Authentication:**
- Requires valid JWT token
- CASL permission check: `read:PrinterSettings`
- Feature gate: `thermalPrinting` must be enabled

**Rate Limiting:**
- Consider adding rate limit per user/tenant
- Prevent stream flooding attacks

## 🐛 Troubleshooting

### Stream not connecting
- Check JWT token validity
- Verify user has `read:PrinterSettings` permission
- Ensure `thermalPrinting` feature is enabled
- Check printer is `network` type

### Always showing offline
- Verify printer IP address is correct
- Check port (default: 9100)
- Ensure printer is powered on and connected to network
- Test manual ping: `telnet PRINTER_IP 9100`
- Check firewall rules

### Stream disconnects randomly
- Check network stability
- Verify load balancer timeout settings
- Check nginx/proxy timeout configuration
- Ensure client-side EventSource reconnection logic

## 📝 Logging

All stream activities are logged:

**Stream start:**
```json
{
  "action": "STREAM_CONNECTION_START",
  "printerId": "uuid",
  "printerName": "Receipt Printer 1",
  "tenantId": "tenant-uuid",
  "userId": "user-uuid"
}
```

**Stream close:**
```json
{
  "action": "STREAM_CONNECTION_CLOSE",
  "printerId": "uuid",
  "tenantId": "tenant-uuid"
}
```

**Ping errors:**
```json
{
  "action": "STREAM_PING_ERROR",
  "printerId": "uuid",
  "error": "Connection timeout"
}
```

## 🚀 Future Enhancements

- [ ] Add stream for multiple printers at once
- [ ] Include ESC/POS status query (paper, cover open)
- [ ] Add reconnection backoff strategy
- [ ] Stream health metrics (CPU, memory usage)
- [ ] WebSocket alternative implementation
- [ ] Rate limiting per tenant
- [ ] Auto-close after X minutes inactive

## 📚 Related Documentation

- [Printer Settings Core Migration](./PRINTER-SETTINGS-CORE-MIGRATION.md)
- [Printer Health Check System](./PRINTER-HEALTH-CHECK-SYSTEM.md)
- [Thermal Printing Plan](./plan/PHASE-03-THERMAL-PRINTING.md)
