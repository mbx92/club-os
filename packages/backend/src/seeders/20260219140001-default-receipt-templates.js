'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Seeder for default receipt templates
 * Adds receipt templates to tenant.settings.receiptTemplates
 */
module.exports = {
  async up(queryInterface) {
    const Sequelize = queryInterface.sequelize;

    // Get all active tenants
    const [tenants] = await queryInterface.sequelize.query(
      `SELECT id, settings FROM "Tenants" WHERE "isActive" = true`
    );

    if (!tenants || tenants.length === 0) {
      console.log('No active tenants found. Skipping receipt templates seeder.');
      return;
    }

    const now = new Date();

    // Default receipt templates to add
    const defaultTemplates = [
      {
        id: uuidv4(),
        name: 'Default Order Receipt',
        templateType: 'receipt',
        paperWidth: 48,
        header: {
          showLogo: false,
          showBusinessName: true,
          showBusinessInfo: true,
          showAddress: true,
          showPhone: true,
          customText: null,
          separatorChar: '='
        },
        body: {
          showItems: true,
          showItemDetails: true,
          showPrices: true,
          showSubtotal: true,
          showTax: true,
          showDiscount: true,
          showPaymentBreakdown: true,
          orderLabel: 'Order',
          dateLabel: 'Tanggal',
          typeLabel: 'Tipe',
          tableLabel: 'Meja',
          customerLabel: 'Pelanggan',
          cashierLabel: 'Kasir',
          subtotalLabel: 'Subtotal',
          discountLabel: 'Diskon',
          taxLabel: 'Pajak',
          totalLabel: 'TOTAL',
          totalDoubleSize: true,
          paymentLabel: 'Pembayaran',
          paidLabel: 'Dibayar',
          changeLabel: 'Kembalian',
          separatorChar: '-',
          customSections: []
        },
        footer: {
          showThankYou: true,
          thankYouMessage: 'Terima kasih atas kunjungan Anda!',
          showDateTime: true,
          customText: 'Barang yang sudah dibeli tidak dapat dikembalikan',
          showQRCode: false,
          separatorChar: '=',
          autoCut: true
        },
        isActive: true,
        isDefault: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        name: 'Kitchen Ticket',
        templateType: 'kitchen',
        paperWidth: 48,
        header: {
          showLogo: false,
          showBusinessName: true,
          showBusinessInfo: false,
          customHeaderText: '=== DAPUR ===',
          separatorChar: '='
        },
        body: {
          showItems: true,
          showItemDetails: true,
          showPrices: false,
          showModifiers: true,
          showNotes: true,  // IMPORTANT: Must be true for notes to appear
          showTable: true,
          showOrderType: true,
          showCustomer: true,
          orderLabel: 'Order',
          dateLabel: 'Waktu',
          typeLabel: 'Tipe',
          tableLabel: 'Meja',
          customerLabel: 'Atas Nama',
          notesLabel: 'Catatan',
          separatorChar: '-',
          customSections: []
        },
        footer: {
          showThankYou: false,
          customFooterText: 'SEGERA PROSES!',
          showDateTime: false,
          customText: null,
          autoCut: true
        },
        isActive: true,
        isDefault: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        name: 'Membership Receipt',
        templateType: 'membership',
        paperWidth: 48,
        header: {
          showLogo: false,
          showBusinessName: true,
          showBusinessInfo: true,
          showAddress: true,
          showPhone: true,
          customText: 'STRUK PEMBAYARAN MEMBERSHIP',
          separatorChar: '='
        },
        body: {
          showItems: true,
          showItemDetails: true,
          showPrices: true,
          showSubtotal: true,
          showTax: true,
          showDiscount: true,
          memberLabel: 'Anggota',
          membershipLabel: 'Paket Membership',
          durationLabel: 'Durasi',
          startDateLabel: 'Mulai',
          endDateLabel: 'Berakhir',
          transactionLabel: 'No. Transaksi',
          dateLabel: 'Tanggal',
          cashierLabel: 'Kasir',
          subtotalLabel: 'Subtotal',
          discountLabel: 'Diskon',
          taxLabel: 'Pajak',
          totalLabel: 'TOTAL',
          totalDoubleSize: true,
          paymentLabel: 'Pembayaran',
          paidLabel: 'Dibayar',
          changeLabel: 'Kembalian',
          separatorChar: '-',
          customSections: []
        },
        footer: {
          showThankYou: true,
          thankYouMessage: 'Selamat berlatih!',
          showDateTime: true,
          customText: 'Harap membawa kartu member saat berkunjung',
          showQRCode: false,
          separatorChar: '=',
          autoCut: true
        },
        isActive: true,
        isDefault: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        name: 'Simple Receipt',
        templateType: 'receipt',
        paperWidth: 48,
        header: {
          showLogo: false,
          showBusinessName: true,
          showBusinessInfo: false,
          showAddress: false,
          showPhone: false,
          customText: null,
          separatorChar: '-'
        },
        body: {
          showItems: true,
          showItemDetails: false,
          showPrices: true,
          showSubtotal: true,
          showTax: false,
          showDiscount: true,
          showPaymentBreakdown: false,
          subtotalLabel: 'Subtotal',
          discountLabel: 'Diskon',
          totalLabel: 'TOTAL',
          totalDoubleSize: false,
          separatorChar: '-',
          customSections: []
        },
        footer: {
          showThankYou: true,
          thankYouMessage: 'Terima kasih',
          showDateTime: true,
          customText: null,
          showQRCode: false,
          autoCut: true
        },
        isActive: true,
        isDefault: false,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        name: 'Invoice A4',
        templateType: 'invoice',
        paperWidth: 80,
        header: {
          showLogo: true,
          showBusinessName: true,
          showBusinessInfo: true,
          showAddress: true,
          showPhone: true,
          showEmail: true,
          customHeaderText: 'INVOICE',
          separatorChar: '='
        },
        body: {
          showItems: true,
          showItemDetails: true,
          showPrices: true,
          showSubtotal: true,
          showTax: true,
          showDiscount: true,
          showPaymentBreakdown: true,
          invoiceLabel: 'Invoice',
          dateLabel: 'Tanggal',
          dueDateLabel: 'Jatuh Tempo',
          customerLabel: 'Kepada',
          itemLabel: 'Item',
          qtyLabel: 'Qty',
          priceLabel: 'Harga',
          totalLabel: 'Total',
          subtotalLabel: 'Subtotal',
          discountLabel: 'Diskon',
          taxLabel: 'Pajak',
          grandTotalLabel: 'TOTAL',
          paymentLabel: 'Pembayaran',
          notesLabel: 'Catatan',
          separatorChar: '=',
          customSections: []
        },
        footer: {
          showThankYou: true,
          thankYouMessage: 'Terima kasih atas kepercayaan Anda',
          showDateTime: false,
          customText: 'Pembayaran harap ditransfer ke rekening:\nBank ABC - 1234567890 a/n Perusahaan',
          showQRCode: true,
          showSignature: true,
          separatorChar: '=',
          autoCut: false
        },
        isActive: true,
        isDefault: false,
        createdAt: now,
        updatedAt: now
      }
    ];

    // Update each tenant with default templates
    for (const tenant of tenants) {
      let settings = tenant.settings || {};
      
      // Parse settings if it's a string
      if (typeof settings === 'string') {
        try {
          settings = JSON.parse(settings);
        } catch (e) {
          console.log(`Failed to parse settings for tenant ${tenant.id}, using empty object`);
          settings = {};
        }
      }

      // Initialize receiptTemplates array if not exists
      if (!settings.receiptTemplates) {
        settings.receiptTemplates = [];
      }

      // Ensure receiptTemplates is an array
      if (!Array.isArray(settings.receiptTemplates)) {
        console.log(`Warning: receiptTemplates is not an array for tenant ${tenant.id}, resetting to empty array`);
        settings.receiptTemplates = [];
      }

      // Check if templates already exist (by name)
      const existingTemplateNames = settings.receiptTemplates.map(t => t.name);
      
      // Add templates that don't exist yet
      const templatesToAdd = defaultTemplates.filter(
        template => !existingTemplateNames.includes(template.name)
      );

      if (templatesToAdd.length > 0) {
        settings.receiptTemplates.push(...templatesToAdd);

        // Update tenant with new templates
        await queryInterface.sequelize.query(
          `UPDATE "Tenants" SET settings = :settings, "updatedAt" = :updatedAt WHERE id = :tenantId`,
          {
            replacements: {
              settings: JSON.stringify(settings),
              updatedAt: now,
              tenantId: tenant.id
            },
            type: Sequelize.QueryTypes.UPDATE
          }
        );

        console.log(`Added ${templatesToAdd.length} receipt template(s) to tenant ${tenant.id}`);
      } else {
        console.log(`No new templates to add for tenant ${tenant.id} (templates already exist)`);
      }
    }

    console.log('Receipt templates seeder completed successfully.');
  },

  async down(queryInterface) {
    const Sequelize = queryInterface.sequelize;

    // Get all tenants
    const [tenants] = await queryInterface.sequelize.query(
      `SELECT id, settings FROM "Tenants"`
    );

    if (!tenants || tenants.length === 0) {
      console.log('No tenants found. Nothing to rollback.');
      return;
    }

    const now = new Date();

    // Template names to remove
    const templateNamesToRemove = [
      'Default Order Receipt',
      'Kitchen Ticket',
      'Membership Receipt',
      'Simple Receipt',
      'Invoice A4'
    ];

    // Remove templates from each tenant
    for (const tenant of tenants) {
      let settings = tenant.settings || {};
      
      // Parse settings if it's a string
      if (typeof settings === 'string') {
        try {
          settings = JSON.parse(settings);
        } catch (e) {
          continue;
        }
      }

      if (settings.receiptTemplates && Array.isArray(settings.receiptTemplates)) {
        const originalCount = settings.receiptTemplates.length;
        
        // Remove default templates
        settings.receiptTemplates = settings.receiptTemplates.filter(
          template => !templateNamesToRemove.includes(template.name)
        );

        const removedCount = originalCount - settings.receiptTemplates.length;

        if (removedCount > 0) {
          await queryInterface.sequelize.query(
            `UPDATE "Tenants" SET settings = :settings, "updatedAt" = :updatedAt WHERE id = :tenantId`,
            {
              replacements: {
                settings: JSON.stringify(settings),
                updatedAt: now,
                tenantId: tenant.id
              },
              type: Sequelize.QueryTypes.UPDATE
            }
          );

          console.log(`Removed ${removedCount} receipt template(s) from tenant ${tenant.id}`);
        }
      }
    }

    console.log('Receipt templates seeder rollback completed.');
  }
};
