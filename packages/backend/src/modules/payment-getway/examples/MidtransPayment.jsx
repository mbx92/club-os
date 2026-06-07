/**
 * Midtrans Payment Component - React Example
 * 
 * Complete React component for Midtrans payment integration
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Load Snap.js script
const loadSnapScript = (clientKey) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.setAttribute('data-client-key', clientKey);
    script.onload = () => resolve(window.snap);
    script.onerror = () => reject(new Error('Failed to load Snap.js'));
    document.body.appendChild(script);
  });
};

const MidtransPayment = ({ transactionId, authToken, onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(null);
  const [transaction, setTransaction] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

  // Initialize: Get Midtrans config and load Snap.js
  useEffect(() => {
    const init = async () => {
      try {
        // Get Midtrans configuration
        const response = await axios.get(`${API_BASE_URL}/payment/midtrans/config`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });

        const configData = response.data.data;
        setConfig(configData);

        // Load Snap.js script
        await loadSnapScript(configData.clientKey);
        console.log('✅ Snap.js loaded successfully');
      } catch (error) {
        console.error('Failed to initialize:', error);
        setStatus({
          type: 'error',
          message: 'Failed to initialize payment system'
        });
      }
    };

    init();
  }, [authToken, API_BASE_URL]);

  // Get transaction details (optional)
  const fetchTransactionDetails = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/transactions/${transactionId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      setTransaction(response.data.data);
    } catch (error) {
      console.error('Failed to fetch transaction:', error);
    }
  };

  // Create payment and show Snap
  const handlePayment = async () => {
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      // Optional: Fetch transaction details first
      await fetchTransactionDetails();

      // Create payment
      const response = await axios.post(
        `${API_BASE_URL}/payment/midtrans/create`,
        { transactionId },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          }
        }
      );

      const { snapToken, transactionNumber } = response.data.data;

      // Show Snap payment page
      window.snap.pay(snapToken, {
        onSuccess: (result) => {
          console.log('✅ Payment success:', result);
          setStatus({
            type: 'success',
            message: `Payment successful! Transaction: ${result.order_id}`
          });
          setLoading(false);
          onSuccess?.(result);
        },

        onPending: (result) => {
          console.log('⏳ Payment pending:', result);
          setStatus({
            type: 'info',
            message: 'Payment pending. Please complete the payment.'
          });
          setLoading(false);
        },

        onError: (result) => {
          console.log('❌ Payment error:', result);
          setStatus({
            type: 'error',
            message: `Payment failed: ${result.status_message || 'Unknown error'}`
          });
          setLoading(false);
          onError?.(result);
        },

        onClose: () => {
          console.log('Payment window closed');
          setStatus({
            type: 'info',
            message: 'Payment window closed'
          });
          setLoading(false);
        }
      });
    } catch (error) {
      console.error('Payment error:', error);
      setStatus({
        type: 'error',
        message: error.response?.data?.message || 'Failed to create payment'
      });
      setLoading(false);
      onError?.(error);
    }
  };

  // Check payment status
  const checkStatus = async (transactionNumber) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/payment/midtrans/status/${transactionNumber}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Failed to check status:', error);
      return null;
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="midtrans-payment">
      {/* Status Alert */}
      {status.message && (
        <div className={`alert alert-${status.type}`}>
          {status.message}
        </div>
      )}

      {/* Transaction Details */}
      {transaction && (
        <div className="transaction-summary">
          <h3>Order Summary</h3>
          <div className="summary-item">
            <span>Transaction Number:</span>
            <strong>{transaction.transactionNumber}</strong>
          </div>
          <div className="summary-item">
            <span>Customer:</span>
            <span>{transaction.customerName || 'Guest'}</span>
          </div>
          <div className="summary-item">
            <span>Items:</span>
            <span>{transaction.items?.length || 0}</span>
          </div>
          <div className="summary-item total">
            <span>Total:</span>
            <strong>{formatCurrency(transaction.total)}</strong>
          </div>
        </div>
      )}

      {/* Payment Methods Info */}
      <div className="payment-methods">
        <div className="method-item">💳 Credit/Debit Card</div>
        <div className="method-item">🏦 Bank Transfer</div>
        <div className="method-item">📱 E-Wallet (GoPay, ShopeePay)</div>
        <div className="method-item">🏪 Convenience Store</div>
        <div className="method-item">🔄 Installment</div>
      </div>

      {/* Payment Button */}
      <button
        className="btn btn-primary"
        onClick={handlePayment}
        disabled={loading || !config}
      >
        {loading ? (
          <>
            <span className="spinner"></span>
            Processing...
          </>
        ) : (
          'Pay with Midtrans'
        )}
      </button>

      <style jsx>{`
        .midtrans-payment {
          max-width: 500px;
          margin: 0 auto;
        }

        .alert {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .alert-info {
          background: #e3f2fd;
          color: #1565c0;
          border-left: 4px solid #1565c0;
        }

        .alert-success {
          background: #e8f5e9;
          color: #2e7d32;
          border-left: 4px solid #2e7d32;
        }

        .alert-error {
          background: #ffebee;
          color: #c62828;
          border-left: 4px solid #c62828;
        }

        .transaction-summary {
          background: #f8f9fa;
          border-radius: 10px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .transaction-summary h3 {
          margin-bottom: 15px;
          font-size: 18px;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 14px;
        }

        .summary-item.total {
          font-size: 18px;
          padding-top: 10px;
          margin-top: 10px;
          border-top: 2px solid #e0e0e0;
          color: #667eea;
        }

        .payment-methods {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 10px;
          margin-bottom: 20px;
        }

        .method-item {
          padding: 10px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }

        .btn {
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s linear infinite;
          margin-right: 8px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default MidtransPayment;

// Usage Example:
/*
import MidtransPayment from './MidtransPayment';

function CheckoutPage() {
  const transactionId = 'your-transaction-uuid';
  const authToken = 'your-jwt-token';

  const handleSuccess = (result) => {
    console.log('Payment successful:', result);
    // Redirect to success page or update UI
    window.location.href = '/payment/success';
  };

  const handleError = (error) => {
    console.error('Payment failed:', error);
    // Show error message or retry
  };

  return (
    <div className="checkout-page">
      <h1>Checkout</h1>
      <MidtransPayment
        transactionId={transactionId}
        authToken={authToken}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}
*/
