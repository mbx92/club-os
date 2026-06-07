'use strict';

/**
 * Midtrans Configuration
 * 
 * Configure Midtrans payment gateway settings
 * Docs: https://docs.midtrans.com/
 */

module.exports = {
  // Midtrans Environment (sandbox/production)
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  
  // Server Key (dari Midtrans Dashboard)
  serverKey: process.env.MIDTRANS_SERVER_KEY || '',
  
  // Client Key (untuk frontend)
  clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
  
  // Merchant ID
  merchantId: process.env.MIDTRANS_MERCHANT_ID || '',
  
  // API URLs
  apiUrl: process.env.MIDTRANS_IS_PRODUCTION === 'true'
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com',
  
  snapUrl: process.env.MIDTRANS_IS_PRODUCTION === 'true'
    ? 'https://app.midtrans.com/snap/v1'
    : 'https://app.sandbox.midtrans.com/snap/v1',
  
  // Payment Settings
  paymentSettings: {
    // Enable payment methods
    enabledPayments: [
      'credit_card',
      'mandiri_clickpay',
      'cimb_clicks',
      'bca_klikbca',
      'bca_klikpay',
      'bri_epay',
      'echannel',
      'permata_va',
      'bca_va',
      'bni_va',
      'bri_va',
      'other_va',
      'gopay',
      'shopeepay',
      'indomaret',
      'alfamart',
      'akulaku',
      'kredivo'
    ],
    
    // Credit Card settings
    creditCard: {
      secure: true,
      channel: 'migs', // or 'cybersource'
      bank: 'bca', // acquiring bank
      installment: {
        required: false,
        terms: {
          bca: [3, 6, 12],
          mandiri: [3, 6, 12],
          cimb: [3, 6, 12],
          bni: [3, 6, 12],
          maybank: [3, 6, 12],
          mega: [3, 6, 12]
        }
      },
      whitelist_bins: [] // Optional: restrict to specific card bins
    },
    
    // Transaction expiry (minutes)
    customExpiry: {
      unit: 'minute',
      duration: 60 * 24 // 24 hours
    },
    
    // Callbacks
    callbacks: {
      finish: process.env.MIDTRANS_FINISH_URL || 'https://yourdomain.com/payment/finish',
      error: process.env.MIDTRANS_ERROR_URL || 'https://yourdomain.com/payment/error',
      pending: process.env.MIDTRANS_PENDING_URL || 'https://yourdomain.com/payment/pending'
    }
  },
  
  // Webhook/Notification URL
  notificationUrl: process.env.MIDTRANS_NOTIFICATION_URL || 'https://yourdomain.com/api/v1/payment/midtrans/notification',
  
  // Validation
  validate() {
    // Skip validation if keys are placeholder values (development environment)
    const isPlaceholder = (value) => {
      return !value || 
             value === '' || 
             value.includes('your_midtrans_') || 
             value.includes('your_merchant_');
    };

    // Only validate if not using placeholders (production environment)
    if (!isPlaceholder(this.serverKey) || !isPlaceholder(this.clientKey)) {
      if (isPlaceholder(this.serverKey)) {
        throw new Error('MIDTRANS_SERVER_KEY is required for production');
      }
      if (isPlaceholder(this.clientKey)) {
        throw new Error('MIDTRANS_CLIENT_KEY is required for production');
      }
    }
    
    return true;
  }
};
