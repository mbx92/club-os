/**
 * Feature Registry
 * 
 * Single source of truth untuk semua features yang available di system.
 * Digunakan untuk:
 * - Generate subscription plan features
 * - Validate feature access di middleware
 * - Render feature list di admin UI
 * - Sync features ke database via service
 * 
 * @module utils/featureRegistry
 */

const FEATURE_REGISTRY = {
  // ===== MODULE ACCESS =====
  modules: {
    dashboard: {
      type: 'boolean',
      default: true,
      label: 'Main Dashboard',
      description: 'Access to main dashboard with analytics overview',
      icon: '📊',
      availableIn: ['Basic', 'Professional', 'Enterprise']
    },
    gym: {
      type: 'boolean',
      default: true,
      label: 'Gym Management',
      description: 'Core gym membership management',
      icon: '💪',
      availableIn: ['Basic', 'Professional', 'Enterprise']
    },
    serviceManagement: {
      type: 'boolean',
      default: true,
      label: 'Service Management',
      description: 'Unified service plan management (memberships, classes, PT, spa packages)',
      icon: '🎯',
      availableIn: ['Basic', 'Professional', 'Enterprise']
    },
    pos: {
      type: 'boolean',
      default: false,
      label: 'Point of Sale',
      description: 'POS system untuk retail & merchandise',
      icon: '🏪',
      availableIn: ['Professional', 'Enterprise']
    },
    restaurant: {
      type: 'boolean',
      default: false,
      label: 'Restaurant Management',
      description: 'Restaurant/café order management',
      icon: '🍽️',
      availableIn: ['Professional', 'Enterprise']
    },
    classes: {
      type: 'boolean',
      default: false,
      label: 'Class Scheduling',
      description: 'Group class & personal training scheduling',
      icon: '📅',
      availableIn: ['Professional', 'Enterprise']
    },
    reports: {
      type: 'boolean',
      default: true,
      label: 'Basic Reports',
      description: 'Standard reports & analytics',
      icon: '📊',
      availableIn: ['Basic', 'Professional', 'Enterprise']
    },
    advancedReports: {
      type: 'boolean',
      default: false,
      label: 'Advanced Analytics',
      description: 'Advanced reporting & business intelligence',
      icon: '📈',
      availableIn: ['Enterprise']
    },
    finance: {
      type: 'boolean',
      default: true,
      label: 'Finance Management',
      description: 'Expense tracking, financial reports, and profit & loss analysis',
      icon: '💰',
      availableIn: ['Basic', 'Professional', 'Enterprise']
    }
  },

  // ===== LIMITS =====
  limits: {
    maxUsers: {
      type: 'number',
      default: 5,
      label: 'Maximum Users',
      description: 'Maximum staff/admin users',
      unit: 'users',
      plans: {
        Basic: 3,
        Professional: 10,
        Enterprise: 0 // 0 = unlimited
      }
    },
    maxMembers: {
      type: 'number',
      default: 100,
      label: 'Maximum Members',
      description: 'Maximum active gym members',
      unit: 'members',
      plans: {
        Basic: 50,
        Professional: 500,
        Enterprise: 0
      }
    },
    maxServicePlans: {
      type: 'number',
      default: 10,
      label: 'Maximum Service Plans',
      description: 'Maximum service plans (membership, classes, PT, etc)',
      unit: 'plans',
      plans: {
        Basic: 10,
        Professional: 50,
        Enterprise: 0
      }
    },
    maxActiveServicesPerMember: {
      type: 'number',
      default: 5,
      label: 'Max Active Services per Member',
      description: 'Maximum active services a member can have simultaneously',
      unit: 'services',
      plans: {
        Basic: 2,
        Professional: 10,
        Enterprise: 0
      }
    },
    maxProducts: {
      type: 'number',
      default: 0,
      label: 'Maximum Products',
      description: 'Maximum products in POS inventory',
      unit: 'products',
      plans: {
        Basic: 0,
        Professional: 0,
        Enterprise: 0
      }
    },
    maxLocations: {
      type: 'number',
      default: 1,
      label: 'Maximum Locations',
      description: 'Maximum gym locations',
      unit: 'locations',
      plans: {
        Basic: 1,
        Professional: 3,
        Enterprise: 0
      }
    },
    maxPrinters: {
      type: 'number',
      default: 0,
      label: 'Maximum Printers',
      description: 'Maximum thermal printers',
      unit: 'printers',
      plans: {
        Basic: 0,
        Professional: 3,
        Enterprise: 0
      }
    },
    maxTables: {
      type: 'number',
      default: 0,
      label: 'Maximum Tables',
      description: 'Maximum restaurant tables',
      unit: 'tables',
      plans: {
        Basic: 0,
        Professional: 20,
        Enterprise: 0
      }
    },
    maxIntegrations: {
      type: 'number',
      default: 0,
      label: 'Maximum Integrations',
      description: 'Maximum third-party integrations',
      unit: 'integrations',
      plans: {
        Basic: 0,
        Professional: 5,
        Enterprise: 0
      }
    }
  },

  // ===== GYM FEATURES =====
  gym: {
    trainerManagement: {
      type: 'boolean',
      default: false,
      label: 'Trainer Management',
      description: 'Manage trainers and their profiles',
      icon: '🏋️',
      availableIn: ['Professional', 'Enterprise']
    },
    trainerCommission: {
      type: 'boolean',
      default: false,
      label: 'Trainer Commission',
      description: 'Track and pay trainer commissions',
      icon: '💰',
      availableIn: ['Professional', 'Enterprise']
    }
  },

  // ===== FINANCE FEATURES =====
  finance: {
    // Income Management
    incomeTracking: {
      type: 'boolean',
      default: true,
      label: 'Income Tracking',
      description: 'Track all income sources (transactional and manual entries)',
      icon: '💰',
      availableIn: ['Basic', 'Professional', 'Enterprise']
    },
    transactionalIncome: {
      type: 'boolean',
      default: true,
      label: 'Transactional Income',
      description: 'Automatic income from membership, POS, and restaurant',
      icon: '🔄',
      availableIn: ['Basic', 'Professional', 'Enterprise']
    },
    manualIncomeEntry: {
      type: 'boolean',
      default: false,
      label: 'Manual Income Entry',
      description: 'Add non-transactional income (donations, investments, etc)',
      icon: '✍️',
      availableIn: ['Professional', 'Enterprise']
    },
    incomeCategories: {
      type: 'boolean',
      default: false,
      label: 'Income Categories',
      description: 'Categorize income sources (operational, investment, other)',
      icon: '📂',
      availableIn: ['Professional', 'Enterprise']
    },
    
    // Expense Management
    expenseTracking: {
      type: 'boolean',
      default: true,
      label: 'Expense Tracking',
      description: 'Track and categorize business expenses',
      icon: '📝',
      availableIn: ['Basic', 'Professional', 'Enterprise']
    },
    expenseApproval: {
      type: 'boolean',
      default: false,
      label: 'Expense Approval Workflow',
      description: 'Multi-level expense approval process',
      icon: '✅',
      availableIn: ['Professional', 'Enterprise']
    },
    recurringExpenses: {
      type: 'boolean',
      default: false,
      label: 'Recurring Expenses',
      description: 'Automated recurring expense management',
      icon: '🔄',
      availableIn: ['Professional', 'Enterprise']
    },
    expenseCategories: {
      type: 'boolean',
      default: true,
      label: 'Expense Categories',
      description: 'Organize expenses by custom categories',
      icon: '📁',
      availableIn: ['Basic', 'Professional', 'Enterprise']
    },
    expenseAttachments: {
      type: 'boolean',
      default: false,
      label: 'Expense Attachments',
      description: 'Attach receipts and invoices to expenses',
      icon: '📎',
      availableIn: ['Professional', 'Enterprise']
    },
    
    // Cash Flow Management
    cashFlowManagement: {
      type: 'boolean',
      default: false,
      label: 'Cash Flow Management',
      description: 'Track cash inflows and outflows with projections',
      icon: '💸',
      availableIn: ['Professional', 'Enterprise']
    },
    cashFlowProjections: {
      type: 'boolean',
      default: false,
      label: 'Cash Flow Projections',
      description: 'Forecast future cash flow based on historical data',
      icon: '🔮',
      availableIn: ['Enterprise']
    },

    // Petty Cash (Modal Awal)
    pettyCashManagement: {
      type: 'boolean',
      default: true,
      label: 'Petty Cash / Modal Awal',
      description: 'Manage initial capital funds, track usage for expenses and replenishment from sales',
      icon: '💰',
      availableIn: ['Basic', 'Professional', 'Enterprise']
    },
    
    // Budget & Financial Planning
    budgetManagement: {
      type: 'boolean',
      default: false,
      label: 'Budget Management',
      description: 'Set and track budgets by category',
      icon: '🎯',
      availableIn: ['Professional', 'Enterprise']
    },
    budgetAlerts: {
      type: 'boolean',
      default: false,
      label: 'Budget Alerts',
      description: 'Get notified when approaching budget limits',
      icon: '🔔',
      availableIn: ['Professional', 'Enterprise']
    },
    
    // Reporting
    financialReports: {
      type: 'boolean',
      default: true,
      label: 'Financial Reports',
      description: 'Basic profit & loss, revenue, and expense reports',
      icon: '📊',
      availableIn: ['Basic', 'Professional', 'Enterprise']
    },
    advancedFinancialReports: {
      type: 'boolean',
      default: false,
      label: 'Advanced Financial Analytics',
      description: 'Detailed financial analytics with trends and forecasting',
      icon: '📈',
      availableIn: ['Enterprise']
    },
    
    // Advanced Features
    multiCurrency: {
      type: 'boolean',
      default: false,
      label: 'Multi-Currency Support',
      description: 'Track income and expenses in multiple currencies',
      icon: '💱',
      availableIn: ['Enterprise']
    },
    accountingExport: {
      type: 'boolean',
      default: false,
      label: 'Accounting Export',
      description: 'Export financial data to accounting software',
      icon: '📤',
      availableIn: ['Enterprise']
    },
    taxManagement: {
      type: 'boolean',
      default: false,
      label: 'Tax Management',
      description: 'Track and calculate taxes on income and expenses',
      icon: '📋',
      availableIn: ['Enterprise']
    }
  },

  // ===== SERVICE MANAGEMENT FEATURES =====
  services: {
    customServiceTypes: {
      type: 'boolean',
      default: false,
      label: 'Custom Service Types',
      description: 'Define custom service types beyond defaults',
      icon: '🎨',
      availableIn: ['Enterprise']
    },
    sessionTracking: {
      type: 'boolean',
      default: true,
      label: 'Session Tracking',
      description: 'Track session usage for session-based services',
      icon: '📊',
      availableIn: ['Basic', 'Professional', 'Enterprise']
    },
    trainerAssignment: {
      type: 'boolean',
      default: false,
      label: 'Trainer Assignment',
      description: 'Assign trainers to PT and class packages',
      icon: '👨‍🏫',
      availableIn: ['Professional', 'Enterprise']
    },
    bundlePackages: {
      type: 'boolean',
      default: false,
      label: 'Bundle Packages',
      description: 'Create bundle packages combining multiple services',
      icon: '📦',
      availableIn: ['Professional', 'Enterprise']
    },
    autoRenewal: {
      type: 'boolean',
      default: false,
      label: 'Auto Renewal',
      description: 'Automatically renew services on expiry',
      icon: '🔄',
      availableIn: ['Professional', 'Enterprise']
    }
  },

  // ===== TRANSACTION FEATURES =====
  transactions: {
    combinedBilling: {
      type: 'boolean',
      default: false,
      label: 'Combined Billing',
      description: 'Combine membership + POS + restaurant in one invoice',
      icon: '📝',
      availableIn: ['Professional', 'Enterprise']
    },
    installments: {
      type: 'boolean',
      default: false,
      label: 'Installment Payments',
      description: 'Split payments into installments',
      icon: '💳',
      availableIn: ['Professional', 'Enterprise']
    },
    vouchers: {
      type: 'boolean',
      default: false,
      label: 'Vouchers & Discounts',
      description: 'Create vouchers & discount codes',
      icon: '🎟️',
      availableIn: ['Professional', 'Enterprise']
    },
    loyaltyPoints: {
      type: 'boolean',
      default: false,
      label: 'Loyalty Points',
      description: 'Reward points system',
      icon: '⭐',
      availableIn: ['Enterprise']
    },
    refunds: {
      type: 'boolean',
      default: false,
      label: 'Refund Management',
      description: 'Process refunds & cancellations',
      icon: '↩️',
      availableIn: ['Professional', 'Enterprise']
    },
    splitPayment: {
      type: 'boolean',
      default: false,
      label: 'Split Bill',
      description: 'Split transaction bill per item into multiple bills',
      icon: '✂️',
      availableIn: ['Basic', 'Professional', 'Enterprise']
    }
  },

  // ===== PAYMENT FEATURES =====
  payments: {
    cash: {
      type: 'boolean',
      default: true,
      label: 'Cash Payment',
      description: 'Accept cash payments',
      icon: '💵',
      availableIn: ['Basic', 'Professional', 'Enterprise']
    },
    creditCard: {
      type: 'boolean',
      default: false,
      label: 'Credit Card',
      description: 'Accept credit/debit card payments',
      icon: '💳',
      availableIn: ['Professional', 'Enterprise']
    },
    bankTransfer: {
      type: 'boolean',
      default: false,
      label: 'Bank Transfer',
      description: 'Accept bank transfer payments',
      icon: '🏦',
      availableIn: ['Professional', 'Enterprise']
    },
    eWallet: {
      type: 'boolean',
      default: false,
      label: 'E-Wallet',
      description: 'Accept e-wallet (OVO, GoPay, Dana)',
      icon: '📱',
      availableIn: ['Professional', 'Enterprise']
    },
    qris: {
      type: 'boolean',
      default: false,
      label: 'QRIS',
      description: 'Accept QRIS payments',
      icon: '📲',
      availableIn: ['Professional', 'Enterprise']
    },
    paymentGateway: {
      type: 'boolean',
      default: false,
      label: 'Payment Gateway',
      description: 'Midtrans payment gateway integration',
      icon: '🌐',
      availableIn: ['Professional', 'Enterprise']
    }
  },

  // ===== PRINTING FEATURES =====
  printing: {
    thermalPrinting: {
      type: 'boolean',
      default: false,
      label: 'Thermal Printing',
      description: 'Thermal printer support for receipts, kitchen orders, and labels',
      icon: '🖨️',
      availableIn: ['Professional', 'Enterprise']
    },
    customTemplates: {
      type: 'boolean',
      default: false,
      label: 'Custom Print Templates',
      description: 'Customize receipt templates',
      icon: '📄',
      availableIn: ['Enterprise']
    },
    autoPrint: {
      type: 'boolean',
      default: false,
      label: 'Auto Print',
      description: 'Automatically print receipts',
      icon: '⚡',
      availableIn: ['Professional', 'Enterprise']
    },
    logo: {
      type: 'boolean',
      default: false,
      label: 'Logo on Receipts',
      description: 'Print custom logo on receipts',
      icon: '🖼️',
      availableIn: ['Professional', 'Enterprise']
    }
  },

  // ===== RESTAURANT FEATURES =====
  restaurant: {
    tableManagement: {
      type: 'boolean',
      default: false,
      label: 'Table Management',
      description: 'Manage restaurant tables',
      icon: '🪑',
      availableIn: ['Professional', 'Enterprise']
    },
    kitchenDisplay: {
      type: 'boolean',
      default: false,
      label: 'Kitchen Display System',
      description: 'Kitchen order display',
      icon: '👨‍🍳',
      availableIn: ['Enterprise']
    },
    customTableLayout: {
      type: 'boolean',
      default: false,
      label: 'Custom Table Layout',
      description: 'Drag & drop table layout',
      icon: '🗺️',
      availableIn: ['Enterprise']
    },
    touchscreenMode: {
      type: 'boolean',
      default: false,
      label: 'Touchscreen Mode',
      description: 'Touch-optimized UI for tablets',
      icon: '👆',
      availableIn: ['Professional', 'Enterprise']
    }
  },

  // ===== INTEGRATIONS =====
  integrations: {
    sms: {
      type: 'boolean',
      default: false,
      label: 'SMS Notifications',
      description: 'Send SMS via Twilio',
      icon: '💬',
      availableIn: ['Professional', 'Enterprise']
    },
    whatsapp: {
      type: 'boolean',
      default: false,
      label: 'WhatsApp Notifications',
      description: 'Send WhatsApp messages',
      icon: '📱',
      availableIn: ['Enterprise']
    },
    email: {
      type: 'boolean',
      default: true,
      label: 'Email Notifications',
      description: 'Send email notifications',
      icon: '📧',
      availableIn: ['Basic', 'Professional', 'Enterprise']
    },
    paymentGateway: {
      type: 'boolean',
      default: false,
      label: 'Payment Gateway',
      description: 'Midtrans integration',
      icon: '💳',
      availableIn: ['Professional', 'Enterprise']
    },
    accounting: {
      type: 'boolean',
      default: false,
      label: 'Accounting Integration',
      description: 'Export to accounting software',
      icon: '📊',
      availableIn: ['Enterprise']
    }
  },

  // ===== SUPPORT FEATURES =====
  support: {
    prioritySupport: {
      type: 'boolean',
      default: false,
      label: 'Priority Support',
      description: '24/7 priority support',
      icon: '🚀',
      availableIn: ['Enterprise']
    },
    dedicatedAccount: {
      type: 'boolean',
      default: false,
      label: 'Dedicated Account Manager',
      description: 'Personal account manager',
      icon: '👤',
      availableIn: ['Enterprise']
    },
    customization: {
      type: 'boolean',
      default: false,
      label: 'Custom Development',
      description: 'Custom feature development',
      icon: '🛠️',
      availableIn: ['Enterprise']
    }
  },

  // ===== TENANT SETTINGS ACCESS =====
  // Controls which settings keys tenant can configure based on plan
  settings: {
    // Basic settings - available to all plans
    general: {
      type: 'boolean',
      default: true,
      label: 'General Settings',
      description: 'Basic tenant settings (name, logo, timezone, currency)',
      icon: '⚙️',
      availableIn: ['Basic', 'Professional', 'Enterprise'],
      settingKeys: ['timezone', 'currency', 'language', 'dateFormat', 'timeFormat']
    },
    branding: {
      type: 'boolean',
      default: true,
      label: 'Branding Settings',
      description: 'Logo and basic branding',
      icon: '🎨',
      availableIn: ['Basic', 'Professional', 'Enterprise'],
      settingKeys: ['logo', 'primaryColor', 'companyName']
    },
    notifications: {
      type: 'boolean',
      default: true,
      label: 'Notification Settings',
      description: 'Email notification preferences',
      icon: '🔔',
      availableIn: ['Basic', 'Professional', 'Enterprise'],
      settingKeys: ['emailNotifications', 'notificationEmail']
    },
    // Professional settings
    receipt: {
      type: 'boolean',
      default: false,
      label: 'Receipt Settings',
      description: 'Customize receipt format and content',
      icon: '🧾',
      availableIn: ['Professional', 'Enterprise'],
      settingKeys: ['receiptHeader', 'receiptFooter', 'showLogo', 'paperSize', 'receiptTemplate']
    },
    printer: {
      type: 'boolean',
      default: false,
      label: 'Printer Settings',
      description: 'Configure thermal printers',
      icon: '🖨️',
      availableIn: ['Professional', 'Enterprise'],
      settingKeys: ['defaultPrinter', 'autoPrint', 'printerWidth', 'printerType']
    },
    payment: {
      type: 'boolean',
      default: false,
      label: 'Payment Settings',
      description: 'Payment methods and gateway configuration',
      icon: '💳',
      availableIn: ['Professional', 'Enterprise'],
      settingKeys: ['paymentMethods', 'midtransServerKey', 'midtransClientKey', 'paymentGateway']
    },
    pos: {
      type: 'boolean',
      default: false,
      label: 'POS Settings',
      description: 'Point of Sale configuration',
      icon: '🏪',
      availableIn: ['Professional', 'Enterprise'],
      settingKeys: ['taxRate', 'serviceCharge', 'roundingMethod', 'defaultDiscount']
    },
    restaurant: {
      type: 'boolean',
      default: false,
      label: 'Restaurant Settings',
      description: 'Restaurant module configuration',
      icon: '🍽️',
      availableIn: ['Professional', 'Enterprise'],
      settingKeys: ['tablePrefix', 'orderNumberFormat', 'kitchenPrinter', 'serviceChargeRate']
    },
    // Enterprise settings
    sms: {
      type: 'boolean',
      default: false,
      label: 'SMS Settings',
      description: 'SMS gateway configuration',
      icon: '💬',
      availableIn: ['Enterprise'],
      settingKeys: ['smsProvider', 'smsApiKey', 'smsApiSecret', 'smsSenderId']
    },
    whatsapp: {
      type: 'boolean',
      default: false,
      label: 'WhatsApp Settings',
      description: 'WhatsApp API configuration',
      icon: '📱',
      availableIn: ['Enterprise'],
      settingKeys: ['waProvider', 'waApiKey', 'waPhoneNumber', 'waWebhookUrl']
    },
    integration: {
      type: 'boolean',
      default: false,
      label: 'Integration Settings',
      description: 'Third-party integrations',
      icon: '🔌',
      availableIn: ['Enterprise'],
      settingKeys: ['webhookUrl', 'apiKeys', 'accountingIntegration', 'exportFormat']
    },
    advanced: {
      type: 'boolean',
      default: false,
      label: 'Advanced Settings',
      description: 'Advanced system configuration',
      icon: '🔧',
      availableIn: ['Enterprise'],
      settingKeys: ['customFields', 'auditLog', 'dataRetention', 'backupSchedule']
    }
  }
};

/**
 * Get all categories
 */
function getCategories() {
  return Object.keys(FEATURE_REGISTRY);
}

/**
 * Get all features in a category
 */
function getFeaturesByCategory(category) {
  return FEATURE_REGISTRY[category] || {};
}

/**
 * Get feature definition
 */
function getFeature(category, featureName) {
  return FEATURE_REGISTRY[category]?.[featureName] || null;
}

/**
 * Generate features object for a specific plan
 */
function generateFeaturesForPlan(planName) {
  const features = {};

  for (const [category, categoryFeatures] of Object.entries(FEATURE_REGISTRY)) {
    features[category] = {};

    for (const [featureName, featureDef] of Object.entries(categoryFeatures)) {
      if (featureDef.type === 'boolean') {
        // Boolean features: check availableIn array
        features[category][featureName] = featureDef.availableIn?.includes(planName) || false;
      } else if (featureDef.type === 'number') {
        // Number features: get value from plans object
        features[category][featureName] = featureDef.plans?.[planName] ?? featureDef.default;
      }
    }
  }

  return features;
}

/**
 * Get all available plans
 */
function getAvailablePlans() {
  return ['Basic', 'Professional', 'Enterprise'];
}

/**
 * Validate features object against registry
 */
function validateFeatures(features) {
  const errors = [];

  for (const [category, categoryFeatures] of Object.entries(features)) {
    if (!FEATURE_REGISTRY[category]) {
      errors.push(`Unknown category: ${category}`);
      continue;
    }

    for (const [featureName, value] of Object.entries(categoryFeatures)) {
      const featureDef = FEATURE_REGISTRY[category][featureName];
      
      if (!featureDef) {
        errors.push(`Unknown feature: ${category}.${featureName}`);
        continue;
      }

      // Type validation
      if (featureDef.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`Invalid type for ${category}.${featureName}: expected boolean, got ${typeof value}`);
      }
      
      if (featureDef.type === 'number' && typeof value !== 'number') {
        errors.push(`Invalid type for ${category}.${featureName}: expected number, got ${typeof value}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get feature metadata for admin UI
 */
function getFeatureMetadata() {
  const metadata = [];

  for (const [category, categoryFeatures] of Object.entries(FEATURE_REGISTRY)) {
    for (const [featureName, featureDef] of Object.entries(categoryFeatures)) {
      metadata.push({
        category,
        name: featureName,
        type: featureDef.type,
        label: featureDef.label,
        description: featureDef.description,
        icon: featureDef.icon,
        default: featureDef.default,
        availableIn: featureDef.availableIn,
        plans: featureDef.plans,
        unit: featureDef.unit
      });
    }
  }

  return metadata;
}

/**
 * Get allowed setting keys for a subscription plan
 * @param {string} planName - The subscription plan name (Basic, Professional, Enterprise)
 * @returns {string[]} Array of allowed setting keys
 */
function getAllowedSettingsForPlan(planName) {
  const allowedKeys = [];
  const settingsFeatures = FEATURE_REGISTRY.settings || {};

  for (const [, featureDef] of Object.entries(settingsFeatures)) {
    if (featureDef.availableIn?.includes(planName) && featureDef.settingKeys) {
      allowedKeys.push(...featureDef.settingKeys);
    }
  }

  return [...new Set(allowedKeys)]; // Remove duplicates
}

/**
 * Get settings categories available for a plan
 * @param {string} planName - The subscription plan name
 * @returns {Object[]} Array of available settings categories with metadata
 */
function getSettingsCategoriesForPlan(planName) {
  const categories = [];
  const settingsFeatures = FEATURE_REGISTRY.settings || {};

  for (const [categoryName, featureDef] of Object.entries(settingsFeatures)) {
    categories.push({
      category: categoryName,
      label: featureDef.label,
      description: featureDef.description,
      icon: featureDef.icon,
      enabled: featureDef.availableIn?.includes(planName) || false,
      settingKeys: featureDef.settingKeys || [],
      availableIn: featureDef.availableIn
    });
  }

  return categories;
}

/**
 * Filter settings object to only include allowed keys for plan
 * @param {Object} settings - Full settings object
 * @param {string} planName - The subscription plan name
 * @returns {Object} Filtered settings with only allowed keys
 */
function filterSettingsForPlan(settings, planName) {
  if (!settings || typeof settings !== 'object') {
    return {};
  }

  const allowedKeys = getAllowedSettingsForPlan(planName);
  const filteredSettings = {};

  for (const key of Object.keys(settings)) {
    if (allowedKeys.includes(key)) {
      filteredSettings[key] = settings[key];
    }
  }

  return filteredSettings;
}

/**
 * Validate settings update against plan permissions
 * @param {Object} newSettings - Settings to update
 * @param {string} planName - The subscription plan name
 * @returns {Object} { valid: boolean, errors: string[], blockedKeys: string[] }
 */
function validateSettingsForPlan(newSettings, planName) {
  if (!newSettings || typeof newSettings !== 'object') {
    return { valid: true, errors: [], blockedKeys: [] };
  }

  const allowedKeys = getAllowedSettingsForPlan(planName);
  const errors = [];
  const blockedKeys = [];

  for (const key of Object.keys(newSettings)) {
    if (!allowedKeys.includes(key)) {
      errors.push(`Setting '${key}' is not available in your ${planName} plan`);
      blockedKeys.push(key);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    blockedKeys
  };
}

/**
 * Get all setting keys defined in the registry
 * @returns {Object} Map of setting category to keys
 */
function getAllSettingKeys() {
  const settingsFeatures = FEATURE_REGISTRY.settings || {};
  const result = {};

  for (const [categoryName, featureDef] of Object.entries(settingsFeatures)) {
    result[categoryName] = {
      label: featureDef.label,
      keys: featureDef.settingKeys || [],
      availableIn: featureDef.availableIn
    };
  }

  return result;
}

module.exports = {
  FEATURE_REGISTRY,
  getCategories,
  getFeaturesByCategory,
  getFeature,
  generateFeaturesForPlan,
  getAvailablePlans,
  validateFeatures,
  getFeatureMetadata,
  // Settings-related exports
  getAllowedSettingsForPlan,
  getSettingsCategoriesForPlan,
  filterSettingsForPlan,
  validateSettingsForPlan,
  getAllSettingKeys
};
