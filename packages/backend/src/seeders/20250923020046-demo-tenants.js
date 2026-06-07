'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up (queryInterface) {
    await queryInterface.bulkInsert('Tenants', [
      {
        id: uuidv4(),
        name: 'Tenant A',
        domain: 'tenant-a.com',
        address: '123 Main St, City A',
        phone: '+1234567890',
        email: 'info@tenant-a.com',
        logo: 'https://example.com/logo-tenant-a.png',
        settings: JSON.stringify({
          workingHours: {
            monday: ['08:00', '22:00'],
            tuesday: ['08:00', '22:00'],
            wednesday: ['08:00', '22:00'],
            thursday: ['08:00', '22:00'],
            friday: ['08:00', '22:00'],
            saturday: ['08:00', '20:00'],
            sunday: ['08:00', '20:00']
          },
          timezone: 'Asia/Jakarta',
          transaction: {
            taxEnable: false,
            taxPercentage: 0,
            taxType: 'percentage',
            currency: {
              defaultCurrency: 'IDR',
              currencySymbol: 'Rp',
              decimalSeparator: ',',
              thousandSeparator: '.',
              useDecimals: true
            },
            discount: {
              allowMultipleDiscounts: false,
              discountCalculationOrder: ['PERCENTAGE_FIRST', 'FIXED_AMOUNT_SECOND'],
              couponExpirationGracePeriod: 0
            },
            payment: {
              enabledGateways: [],
              paymentTimeout: 60,
              midtransConfig: {
                apiKey: '',
                clientKey: '',
                sandbox: true,
                webhookUrl: ''
              },
              stripeConfig: {
                apiKey: '',
                clientKey: '',
                sandbox: true,
                webhookUrl: ''
              }
            },
            invoice: {
              transactionPrefix: 'TRX',
              orderPrefix: 'ORD',
              quotePrefix: 'QUO',
              invoicePrefix: 'INV',
              startingInvoiceNumber: 1000,
              numberingFormat: 'PREFIX-DATE-NUMBER',
              dateFormat: 'YYYYMM',
              prefixSeparator: '-',
              numberPadLength: 4,
              enableEmailNotifications: false,
              fromEmailAddress: ''
            },
            shipping: {
              shippingCalculationType: 'FLAT_RATE',
              requireShippingAddress: false
            }
          }
        }),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: 'Tenant B',
        domain: 'tenant-b.com',
        address: '456 Oak St, City B',
        phone: '+0987654321',
        email: 'info@tenant-b.com',
        logo: 'https://example.com/logo-tenant-b.png',
        settings: JSON.stringify({
          workingHours: {
            monday: ['06:00', '23:00'],
            tuesday: ['06:00', '23:00'],
            wednesday: ['06:00', '23:00'],
            thursday: ['06:00', '23:00'],
            friday: ['06:00', '23:00'],
            saturday: ['06:00', '23:00'],
            sunday: ['06:00', '23:00']
          },
          timezone: 'Asia/Jakarta',
          transaction: {
            taxEnable: false,
            taxPercentage: 0,
            taxType: 'percentage',
            currency: {
              defaultCurrency: 'IDR',
              currencySymbol: 'Rp',
              decimalSeparator: ',',
              thousandSeparator: '.',
              useDecimals: true
            },
            discount: {
              allowMultipleDiscounts: false,
              discountCalculationOrder: ['PERCENTAGE_FIRST', 'FIXED_AMOUNT_SECOND'],
              couponExpirationGracePeriod: 0
            },
            payment: {
              enabledGateways: [],
              paymentTimeout: 60,
              midtransConfig: {
                apiKey: '',
                clientKey: '',
                sandbox: true,
                webhookUrl: ''
              },
              stripeConfig: {
                apiKey: '',
                clientKey: '',
                sandbox: true,
                webhookUrl: ''
              }
            },
            invoice: {
              transactionPrefix: 'TRX',
              orderPrefix: 'ORD',
              quotePrefix: 'QUO',
              invoicePrefix: 'INV',
              startingInvoiceNumber: 1000,
              numberingFormat: 'PREFIX-DATE-NUMBER',
              dateFormat: 'YYYYMM',
              prefixSeparator: '-',
              numberPadLength: 4,
              enableEmailNotifications: false,
              fromEmailAddress: ''
            },
            shipping: {
              shippingCalculationType: 'FLAT_RATE',
              requireShippingAddress: false
            }
          }
        }),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  async down (queryInterface) {
    await queryInterface.bulkDelete('Tenants', null, {});
  }
};
