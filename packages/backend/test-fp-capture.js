const { DigestClient } = require('digest-fetch');
const client = new DigestClient('admin', 'NPass321!', { algorithm: 'MD5' });
const base = 'http://192.168.1.23:80';

// Simple lock check - just make one request and check status
(async () => {
  try {
    const r = await client.fetch(base + '/ISAPI/System/deviceInfo', {
      headers: { Accept: 'application/xml' }
    });
    const text = await r.text();
    
    if (r.status === 401) {
      // Parse lock info
      const lockMatch = text.match(/<lockStatus>(.*?)<\/lockStatus>/);
      const unlockMatch = text.match(/<unlockTime>(.*?)<\/unlockTime>/);
      console.log('Device LOCKED');
      console.log('Lock status:', lockMatch ? lockMatch[1] : 'unknown');
      console.log('Unlock in:', unlockMatch ? unlockMatch[1] + ' seconds' : 'unknown');
      console.log('Unlock at:', unlockMatch ? new Date(Date.now() + parseInt(unlockMatch[1]) * 1000).toLocaleTimeString() : 'unknown');
    } else {
      console.log('Device UNLOCKED - Status:', r.status);
      console.log(text.substring(0, 200));
    }
  } catch(e) {
    console.log('ERROR:', e.message);
  }
})();
