'use strict';

/**
 * PrinterSettings Model
 * 
 * Multi-tenant printer configuration supporting thermal receipt printers,
 * kitchen display printers, label printers with network/USB/Bluetooth connections.
 * 
 * Features:
 * - Multiple printer types (receipt, kitchen, label, invoice, report)
 * - Various connection methods (network IP, USB, Bluetooth, Serial)
 * - Receipt template customization via JSONB
 * - Paper size configuration (58mm, 80mm, A4, custom)
 * - Print statistics tracking
 * - Error logging and troubleshooting
 * - Cash drawer integration
 * - Location-specific printer assignment
 * 
 * @module models/printerSettings
 */

module.exports = (sequelize, DataTypes) => {
  const PrinterSettings = sequelize.define('PrinterSettings', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    tenantId: {
      type: DataTypes.UUID,
      allowNull: false,
      validate: {
        notNull: { msg: 'Tenant ID is required' },
        notEmpty: { msg: 'Tenant ID cannot be empty' }
      }
    },
    locationId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notNull: { msg: 'Printer name is required' },
        notEmpty: { msg: 'Printer name cannot be empty' },
        len: {
          args: [3, 100],
          msg: 'Printer name must be between 3 and 100 characters'
        }
      }
    },
    printerType: {
      type: DataTypes.ENUM('receipt', 'kitchen', 'label', 'invoice', 'report'),
      allowNull: false,
      defaultValue: 'receipt',
      validate: {
        isIn: {
          args: [['receipt', 'kitchen', 'label', 'invoice', 'report']],
          msg: 'Invalid printer type'
        }
      }
    },
    printerCategory: {
      type: DataTypes.ENUM('all', 'food', 'beverage'),
      allowNull: false,
      defaultValue: 'all',
      comment: 'What product categories this printer handles (all, food, beverage)',
      validate: {
        isIn: {
          args: [['all', 'food', 'beverage']],
          msg: 'Invalid printer category'
        }
      }
    },
    connectionType: {
      type: DataTypes.ENUM('network', 'usb', 'bluetooth', 'serial'),
      allowNull: false,
      defaultValue: 'network',
      validate: {
        isIn: {
          args: [['network', 'usb', 'bluetooth', 'serial']],
          msg: 'Invalid connection type'
        }
      }
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      validate: {
        isIP: {
          msg: 'Invalid IP address format'
        }
      }
    },
    port: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 9100,
      validate: {
        min: {
          args: [1],
          msg: 'Port must be greater than 0'
        },
        max: {
          args: [65535],
          msg: 'Port must be less than 65536'
        }
      }
    },
    usbPath: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    bluetoothAddress: {
      type: DataTypes.STRING(17),
      allowNull: true,
      validate: {
        is: {
          args: /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/,
          msg: 'Invalid Bluetooth MAC address format (expected: 00:11:22:33:44:55)'
        }
      }
    },
    serialPort: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    baudRate: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 9600,
      validate: {
        isIn: {
          args: [[1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200]],
          msg: 'Invalid baud rate'
        }
      }
    },
    paperWidth: {
      type: DataTypes.ENUM('58mm', '80mm', 'A4', 'custom'),
      allowNull: false,
      defaultValue: '80mm'
    },
    paperWidthCustom: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: {
          args: [30],
          msg: 'Paper width must be at least 30mm'
        },
        max: {
          args: [300],
          msg: 'Paper width must be less than 300mm'
        }
      }
    },
    charactersPerLine: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 48,
      validate: {
        min: {
          args: [20],
          msg: 'Characters per line must be at least 20'
        },
        max: {
          args: [100],
          msg: 'Characters per line must be less than 100'
        }
      }
    },
    printerModel: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    driverType: {
      type: DataTypes.ENUM('escpos', 'star', 'zpl', 'cups', 'windows', 'custom'),
      allowNull: false,
      defaultValue: 'escpos',
      validate: {
        isIn: {
          args: [['escpos', 'star', 'zpl', 'cups', 'windows', 'custom']],
          msg: 'Invalid driver type'
        }
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    autoCut: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    openCashDrawer: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    cashDrawerPin: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        isIn: {
          args: [[0, 1]],
          msg: 'Cash drawer pin must be 0 or 1'
        }
      }
    },
    printDensity: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 8,
      validate: {
        min: {
          args: [0],
          msg: 'Print density must be between 0 and 15'
        },
        max: {
          args: [15],
          msg: 'Print density must be between 0 and 15'
        }
      }
    },
    printSpeed: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 4,
      validate: {
        min: {
          args: [0],
          msg: 'Print speed must be between 0 and 5'
        },
        max: {
          args: [5],
          msg: 'Print speed must be between 0 and 5'
        }
      }
    },
    encoding: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'utf8',
      validate: {
        isIn: {
          args: [['utf8', 'gb18030', 'big5', 'shiftjis', 'euckr', 'iso88591']],
          msg: 'Invalid encoding'
        }
      }
    },
    codepage: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    templateConfig: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Receipt template: { header, footer, logo, fonts, spacing }'
    },
    printSettings: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Print settings: { copies, margins, alignment, lineSpacing }'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    },
    lastPrintedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastErrorAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastErrorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    printCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Print count cannot be negative'
        }
      }
    },
    errorCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'Error count cannot be negative'
        }
      }
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    tableName: 'PrinterSettings',
    timestamps: true,
    paranoid: true,
    indexes: [
      { fields: ['tenantId'] },
      { fields: ['locationId'] },
      { fields: ['printerType'] },
      { fields: ['tenantId', 'printerType', 'isDefault'], where: { isDefault: true, isActive: true } },
      { fields: ['isActive'] },
      { fields: ['templateConfig'], using: 'GIN' },
      { fields: ['printSettings'], using: 'GIN' }
    ]
  });

  /**
   * Model associations
   */
  PrinterSettings.associate = function(models) {
    // Belongs to tenant
    PrinterSettings.belongsTo(models.Tenant, {
      foreignKey: 'tenantId',
      as: 'tenant',
      onDelete: 'CASCADE'
    });

    // Belongs to location (optional)
    PrinterSettings.belongsTo(models.Location, {
      foreignKey: 'locationId',
      as: 'location',
      onDelete: 'SET NULL'
    });

    // Created by user
    PrinterSettings.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator',
      onDelete: 'SET NULL'
    });

    // Updated by user
    PrinterSettings.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater',
      onDelete: 'SET NULL'
    });
  };

  /**
   * Get connection string for printer
   * @returns {string} Connection info
   */
  PrinterSettings.prototype.getConnectionString = function() {
    switch (this.connectionType) {
      case 'network':
        return `${this.ipAddress}:${this.port}`;
      case 'usb':
        return this.usbPath || 'USB';
      case 'bluetooth':
        return this.bluetoothAddress || 'Bluetooth';
      case 'serial':
        return `${this.serialPort} (${this.baudRate} baud)`;
      default:
        return 'Unknown';
    }
  };

  /**
   * Check if printer is properly configured
   * @returns {boolean}
   */
  PrinterSettings.prototype.isConfigured = function() {
    if (!this.isActive) return false;

    switch (this.connectionType) {
      case 'network':
        return !!(this.ipAddress && this.port);
      case 'usb':
        return !!this.usbPath;
      case 'bluetooth':
        return !!this.bluetoothAddress;
      case 'serial':
        return !!(this.serialPort && this.baudRate);
      default:
        return false;
    }
  };

  /**
   * Get paper width in millimeters
   * @returns {number}
   */
  PrinterSettings.prototype.getPaperWidthMM = function() {
    switch (this.paperWidth) {
      case '58mm':
        return 58;
      case '80mm':
        return 80;
      case 'A4':
        return 210;
      case 'custom':
        return this.paperWidthCustom || 80;
      default:
        return 80;
    }
  };

  /**
   * Record successful print
   */
  PrinterSettings.prototype.recordPrintSuccess = async function() {
    this.printCount += 1;
    this.lastPrintedAt = new Date();
    this.lastErrorMessage = null;
    await this.save();
  };

  /**
   * Record print error
   * @param {string} errorMessage Error description
   */
  PrinterSettings.prototype.recordPrintError = async function(errorMessage) {
    this.errorCount += 1;
    this.lastErrorAt = new Date();
    this.lastErrorMessage = errorMessage;
    await this.save();
  };

  /**
   * Get printer health status
   * @returns {object} Health metrics
   */
  PrinterSettings.prototype.getHealthStatus = function() {
    const totalPrints = this.printCount + this.errorCount;
    const successRate = totalPrints > 0 ? ((this.printCount / totalPrints) * 100).toFixed(2) : 100;
    
    let status = 'healthy';
    if (!this.isActive) {
      status = 'disabled';
    } else if (!this.isConfigured()) {
      status = 'misconfigured';
    } else if (this.errorCount > this.printCount && totalPrints > 10) {
      status = 'unhealthy';
    } else if (successRate < 80) {
      status = 'degraded';
    }

    return {
      status,
      successRate: parseFloat(successRate),
      totalPrints,
      successfulPrints: this.printCount,
      errors: this.errorCount,
      lastPrinted: this.lastPrintedAt,
      lastError: this.lastErrorAt,
      isConfigured: this.isConfigured()
    };
  };

  /**
   * Get default template for printer type
   * @returns {object} Template config
   */
  PrinterSettings.prototype.getDefaultTemplate = function() {
    const baseTemplate = {
      header: {
        enabled: true,
        businessName: true,
        address: true,
        phone: true,
        logo: false
      },
      body: {
        fontSize: 'normal',
        lineSpacing: 1,
        showPrices: true,
        showQuantity: true,
        showSubtotal: true
      },
      footer: {
        enabled: true,
        thankYouMessage: true,
        customMessage: '',
        qrCode: false,
        barcode: false
      }
    };

    switch (this.printerType) {
      case 'kitchen':
        return {
          ...baseTemplate,
          header: { ...baseTemplate.header, logo: false, address: false },
          body: { ...baseTemplate.body, showPrices: false, fontSize: 'large' },
          footer: { ...baseTemplate.footer, thankYouMessage: false }
        };
      case 'label':
        return {
          header: { enabled: false },
          body: { fontSize: 'small', showPrices: true },
          footer: { enabled: false }
        };
      default:
        return baseTemplate;
    }
  };

  /**
   * Static: Get default printer for type and location
   */
  PrinterSettings.getDefaultPrinter = async function(tenantId, printerType, locationId = null) {
    const where = {
      tenantId,
      printerType,
      isDefault: true,
      isActive: true
    };

    if (locationId) {
      where.locationId = locationId;
    }

    return await this.findOne({ where });
  };

  /**
   * Static: Get all active printers by type
   */
  PrinterSettings.getActivePrintersByType = async function(tenantId, printerType, locationId = null) {
    const where = {
      tenantId,
      printerType,
      isActive: true
    };

    if (locationId) {
      where.locationId = locationId;
    }

    return await this.findAll({
      where,
      order: [['isDefault', 'DESC'], ['name', 'ASC']]
    });
  };

  /**
   * Static: Set as default printer (unset others)
   */
  PrinterSettings.setAsDefault = async function(printerId, tenantId, printerType) {
    const transaction = await sequelize.transaction();

    try {
      // Unset all defaults for this type
      await this.update(
        { isDefault: false },
        {
          where: { tenantId, printerType },
          transaction
        }
      );

      // Set new default
      await this.update(
        { isDefault: true },
        {
          where: { id: printerId },
          transaction
        }
      );

      await transaction.commit();
      return true;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  };

  /**
   * Validation: Ensure connection params are provided
   */
  PrinterSettings.beforeValidate((printer) => {
    if (printer.connectionType === 'network' && (!printer.ipAddress || !printer.port)) {
      throw new Error('IP address and port are required for network printers');
    }
    if (printer.connectionType === 'usb' && !printer.usbPath) {
      throw new Error('USB path is required for USB printers');
    }
    if (printer.connectionType === 'bluetooth' && !printer.bluetoothAddress) {
      throw new Error('Bluetooth address is required for Bluetooth printers');
    }
    if (printer.connectionType === 'serial' && (!printer.serialPort || !printer.baudRate)) {
      throw new Error('Serial port and baud rate are required for serial printers');
    }

    // Set characters per line based on paper width
    if (!printer.charactersPerLine || printer.changed('paperWidth')) {
      switch (printer.paperWidth) {
        case '58mm':
          printer.charactersPerLine = 32;
          break;
        case '80mm':
          printer.charactersPerLine = 48;
          break;
        case 'A4':
          printer.charactersPerLine = 80;
          break;
        default:
          // Keep existing or default
          break;
      }
    }
  });

  return PrinterSettings;
};
