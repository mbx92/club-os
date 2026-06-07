'use strict';

/**
 * Migration: Create PrinterSettings Table
 * 
 * Printer configuration for multi-tenant system supporting:
 * - Thermal receipt printers (58mm, 80mm)
 * - Kitchen display printers
 * - Label printers
 * - Network (IP), USB, Bluetooth connections
 * - Custom receipt templates
 * - Multi-location printer assignment
 * 
 * @migration 20241127000001-create-printer-settings
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if table already exists
    const tableExists = await queryInterface.sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'PrinterSettings'
      );
    `);
    
    if (tableExists[0][0].exists) {
      console.log('⏭️  Table PrinterSettings already exists, skipping creation...');
      return;
    }

    await queryInterface.createTable('PrinterSettings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
        allowNull: false
      },
      tenantId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Tenant owner of this printer'
      },
      locationId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Locations',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Location where printer is installed (optional)'
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Printer display name (e.g., "Main Counter Receipt Printer")'
      },
      printerType: {
        type: Sequelize.ENUM('receipt', 'kitchen', 'label', 'invoice', 'report'),
        allowNull: false,
        defaultValue: 'receipt',
        comment: 'Printer purpose type'
      },
      connectionType: {
        type: Sequelize.ENUM('network', 'usb', 'bluetooth', 'serial'),
        allowNull: false,
        defaultValue: 'network',
        comment: 'How printer connects to system'
      },
      ipAddress: {
        type: Sequelize.STRING(45),
        allowNull: true,
        comment: 'IP address for network printers (IPv4/IPv6)'
      },
      port: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 9100,
        comment: 'Port for network printers'
      },
      usbPath: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'USB device path (e.g., /dev/usb/lp0)'
      },
      bluetoothAddress: {
        type: Sequelize.STRING(17),
        allowNull: true,
        comment: 'Bluetooth MAC address (e.g., 00:11:22:33:44:55)'
      },
      serialPort: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Serial port (e.g., COM1, /dev/ttyUSB0)'
      },
      baudRate: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 9600,
        comment: 'Serial port baud rate'
      },
      paperWidth: {
        type: Sequelize.ENUM('58mm', '80mm', 'A4', 'custom'),
        allowNull: false,
        defaultValue: '80mm',
        comment: 'Receipt paper width'
      },
      paperWidthCustom: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Custom paper width in millimeters'
      },
      charactersPerLine: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 48,
        comment: 'Maximum characters per line (58mm=32, 80mm=48)'
      },
      printerModel: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Printer model/brand (e.g., Epson TM-T88V, Star TSP100)'
      },
      driverType: {
        type: Sequelize.ENUM('escpos', 'star', 'zpl', 'cups', 'windows', 'custom'),
        allowNull: false,
        defaultValue: 'escpos',
        comment: 'Printer command language/driver'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Is printer enabled'
      },
      isDefault: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Is default printer for its type'
      },
      autoCut: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Auto-cut paper after print'
      },
      openCashDrawer: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Open cash drawer after printing receipt'
      },
      cashDrawerPin: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Cash drawer kick pin (0 or 1)'
      },
      printDensity: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 8,
        comment: 'Print darkness level (0-15)'
      },
      printSpeed: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 4,
        comment: 'Print speed setting (0-5)'
      },
      encoding: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'utf8',
        comment: 'Character encoding (utf8, gb18030, big5, etc.)'
      },
      codepage: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'ESC/POS code page number'
      },
      templateConfig: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Receipt template configuration (header, footer, logo, fonts)'
      },
      printSettings: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional print settings (copies, margins, alignment)'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional printer metadata'
      },
      lastPrintedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last successful print timestamp'
      },
      lastErrorAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last error timestamp'
      },
      lastErrorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Last error message for troubleshooting'
      },
      printCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total successful prints counter'
      },
      errorCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total error counter'
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      updatedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Soft delete timestamp'
      }
    });

    // Indexes for performance (with IF NOT EXISTS via raw SQL for safety)
    const indexes = [
      { name: 'printer_settings_tenant_idx', columns: '"tenantId"' },
      { name: 'printer_settings_location_idx', columns: '"locationId"' },
      { name: 'printer_settings_type_idx', columns: '"printerType"' },
      { name: 'printer_settings_active_idx', columns: '"isActive"' },
    ];

    for (const idx of indexes) {
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS ${idx.name} ON "PrinterSettings" (${idx.columns});
      `);
    }

    // Partial index for default printer
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS printer_settings_default_idx 
      ON "PrinterSettings" ("tenantId", "printerType", "isDefault") 
      WHERE "isDefault" = true AND "isActive" = true;
    `);

    // JSONB indexes for template queries
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS printer_settings_template_gin_idx 
      ON "PrinterSettings" USING GIN ("templateConfig");
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS printer_settings_print_gin_idx 
      ON "PrinterSettings" USING GIN ("printSettings");
    `);

    // Comments on table
    await queryInterface.sequelize.query(`
      COMMENT ON TABLE "PrinterSettings" IS 'Printer configuration for thermal receipt printers, kitchen printers, and label printers across multiple locations';
    `);

    console.log('✅ PrinterSettings table created successfully');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('PrinterSettings');
    console.log('✅ PrinterSettings table dropped');
  }
};
