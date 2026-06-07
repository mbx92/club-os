'use strict';

/**
 * Psychology Module Validators
 * 
 * Request validation using simple inline validation
 * No external dependencies required
 */

/**
 * Validation result helper
 */
function createValidationResult(valid, errors = []) {
  return { valid, errors };
}

/**
 * Common validation helpers
 */
const validatorHelpers = {
  isUUID: (value) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },
  
  isString: (value) => typeof value === 'string',
  isNumber: (value) => typeof value === 'number' && !isNaN(value),
  isBoolean: (value) => typeof value === 'boolean',
  isArray: (value) => Array.isArray(value),
  isObject: (value) => value !== null && typeof value === 'object' && !Array.isArray(value),
  isEmail: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },
  
  notEmpty: (value) => value !== undefined && value !== null && value !== '',
  maxLength: (value, max) => !value || value.length <= max,
  minLength: (value, min) => !value || value.length >= min,
  inRange: (value, min, max) => value >= min && value <= max,
  inList: (value, list) => list.includes(value)
};

/**
 * Test Type Validators
 */
const testTypeValidators = {
  create: (body) => {
    const errors = [];
    
    if (!validatorHelpers.notEmpty(body.code)) {
      errors.push({ field: 'code', message: 'Test code is required' });
    } else if (!validatorHelpers.maxLength(body.code, 50)) {
      errors.push({ field: 'code', message: 'Code must be at most 50 characters' });
    }
    
    if (!validatorHelpers.notEmpty(body.name)) {
      errors.push({ field: 'name', message: 'Test name is required' });
    } else if (!validatorHelpers.maxLength(body.name, 100)) {
      errors.push({ field: 'name', message: 'Name must be at most 100 characters' });
    }
    
    if (!validatorHelpers.notEmpty(body.questions)) {
      errors.push({ field: 'questions', message: 'Questions data is required' });
    } else if (!validatorHelpers.isArray(body.questions) && !validatorHelpers.isString(body.questions)) {
      errors.push({ field: 'questions', message: 'Questions must be an array or JSON string' });
    }
    
    if (body.category && !validatorHelpers.inList(body.category, ['personality', 'aptitude', 'interest', 'cognitive', 'other'])) {
      errors.push({ field: 'category', message: 'Invalid category' });
    }
    
    if (body.estimatedDuration !== undefined) {
      if (!validatorHelpers.isNumber(body.estimatedDuration) || !validatorHelpers.inRange(body.estimatedDuration, 5, 300)) {
        errors.push({ field: 'estimatedDuration', message: 'Estimated duration must be between 5 and 300 minutes' });
      }
    }
    
    return createValidationResult(errors.length === 0, errors);
  },
  
  update: (body) => {
    const errors = [];
    
    if (body.code !== undefined && !validatorHelpers.maxLength(body.code, 50)) {
      errors.push({ field: 'code', message: 'Code must be at most 50 characters' });
    }
    
    if (body.name !== undefined && !validatorHelpers.maxLength(body.name, 100)) {
      errors.push({ field: 'name', message: 'Name must be at most 100 characters' });
    }
    
    if (body.questions !== undefined && !validatorHelpers.isArray(body.questions) && !validatorHelpers.isString(body.questions)) {
      errors.push({ field: 'questions', message: 'Questions must be an array or JSON string' });
    }
    
    if (body.category && !validatorHelpers.inList(body.category, ['personality', 'aptitude', 'interest', 'cognitive', 'other'])) {
      errors.push({ field: 'category', message: 'Invalid category' });
    }
    
    if (body.estimatedDuration !== undefined) {
      if (!validatorHelpers.isNumber(body.estimatedDuration) || !validatorHelpers.inRange(body.estimatedDuration, 5, 300)) {
        errors.push({ field: 'estimatedDuration', message: 'Estimated duration must be between 5 and 300 minutes' });
      }
    }
    
    return createValidationResult(errors.length === 0, errors);
  }
};

/**
 * Patient Validators
 */
const patientValidators = {
  create: (body) => {
    const errors = [];
    
    // Support both fullName and name field
    const fullName = body.fullName || body.name;
    
    if (!validatorHelpers.notEmpty(fullName)) {
      errors.push({ field: 'fullName', message: 'Full name is required' });
    } else if (!validatorHelpers.maxLength(fullName, 200)) {
      errors.push({ field: 'fullName', message: 'Full name must be at most 200 characters' });
    }
    
    if (body.email && !validatorHelpers.isEmail(body.email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }
    
    if (body.phone && !validatorHelpers.maxLength(body.phone, 20)) {
      errors.push({ field: 'phone', message: 'Phone must be at most 20 characters' });
    }
    
    if (body.sex && !validatorHelpers.inList(body.sex, ['male', 'female'])) {
      errors.push({ field: 'sex', message: 'Sex must be male or female' });
    }
    
    if (body.personalData && !validatorHelpers.isObject(body.personalData)) {
      errors.push({ field: 'personalData', message: 'Personal data must be an object' });
    }
    
    return createValidationResult(errors.length === 0, errors);
  },
  
  update: (body) => {
    const errors = [];
    
    // Support both fullName and name field
    const fullName = body.fullName !== undefined ? body.fullName : body.name;
    
    if (fullName !== undefined && !validatorHelpers.maxLength(fullName, 200)) {
      errors.push({ field: 'fullName', message: 'Full name must be at most 200 characters' });
    }
    
    if (body.email && !validatorHelpers.isEmail(body.email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }
    
    if (body.phone && !validatorHelpers.maxLength(body.phone, 20)) {
      errors.push({ field: 'phone', message: 'Phone must be at most 20 characters' });
    }
    
    if (body.sex && !validatorHelpers.inList(body.sex, ['male', 'female'])) {
      errors.push({ field: 'sex', message: 'Sex must be male or female' });
    }
    
    if (body.personalData && !validatorHelpers.isObject(body.personalData)) {
      errors.push({ field: 'personalData', message: 'Personal data must be an object' });
    }
    
    return createValidationResult(errors.length === 0, errors);
  }
};

/**
 * Package Validators
 */
const packageValidators = {
  create: (body) => {
    const errors = [];
    
    if (!validatorHelpers.notEmpty(body.name)) {
      errors.push({ field: 'name', message: 'Package name is required' });
    } else if (!validatorHelpers.maxLength(body.name, 100)) {
      errors.push({ field: 'name', message: 'Name must be at most 100 characters' });
    }
    
    // Support both basePrice and singlePrice
    const price = body.basePrice !== undefined ? body.basePrice : body.singlePrice;
    if (price === undefined || price === null) {
      errors.push({ field: 'basePrice', message: 'Price is required (basePrice or singlePrice)' });
    } else if (!validatorHelpers.isNumber(price) || price < 0) {
      errors.push({ field: 'basePrice', message: 'Price must be a non-negative number' });
    }
    
    if (body.packageType && !validatorHelpers.inList(body.packageType, ['single', 'bundle'])) {
      errors.push({ field: 'packageType', message: 'Package type must be single or bundle' });
    }
    
    if (!body.testTypeIds || !validatorHelpers.isArray(body.testTypeIds) || body.testTypeIds.length === 0) {
      errors.push({ field: 'testTypeIds', message: 'At least one test type is required' });
    } else {
      for (let i = 0; i < body.testTypeIds.length; i++) {
        if (!validatorHelpers.isUUID(body.testTypeIds[i])) {
          errors.push({ field: `testTypeIds[${i}]`, message: 'Invalid test type ID format' });
          break;
        }
      }
    }
    
    if (body.discountType && !validatorHelpers.inList(body.discountType, ['none', 'percentage', 'fixed'])) {
      errors.push({ field: 'discountType', message: 'Discount type must be none, percentage, or fixed' });
    }
    
    if (body.discountValue !== undefined) {
      if (!validatorHelpers.isNumber(body.discountValue) || body.discountValue < 0) {
        errors.push({ field: 'discountValue', message: 'Discount value must be a non-negative number' });
      }
    }
    
    // Legacy support
    if (body.discountPercent !== undefined) {
      if (!validatorHelpers.isNumber(body.discountPercent) || !validatorHelpers.inRange(body.discountPercent, 0, 100)) {
        errors.push({ field: 'discountPercent', message: 'Discount percent must be between 0 and 100' });
      }
    }
    
    return createValidationResult(errors.length === 0, errors);
  },
  
  update: (body) => {
    const errors = [];
    
    if (body.name !== undefined && !validatorHelpers.maxLength(body.name, 100)) {
      errors.push({ field: 'name', message: 'Name must be at most 100 characters' });
    }
    
    if (body.singlePrice !== undefined && (!validatorHelpers.isNumber(body.singlePrice) || body.singlePrice < 0)) {
      errors.push({ field: 'singlePrice', message: 'Single price must be a non-negative number' });
    }
    
    if (body.packageType && !validatorHelpers.inList(body.packageType, ['single', 'bundle'])) {
      errors.push({ field: 'packageType', message: 'Package type must be single or bundle' });
    }
    
    if (body.testTypeIds !== undefined) {
      if (!validatorHelpers.isArray(body.testTypeIds) || body.testTypeIds.length === 0) {
        errors.push({ field: 'testTypeIds', message: 'At least one test type is required' });
      }
    }
    
    return createValidationResult(errors.length === 0, errors);
  }
};

/**
 * Price Rule Validators
 */
const priceRuleValidators = {
  create: (body) => {
    const errors = [];
    
    if (!validatorHelpers.notEmpty(body.name)) {
      errors.push({ field: 'name', message: 'Rule name is required' });
    } else if (!validatorHelpers.maxLength(body.name, 100)) {
      errors.push({ field: 'name', message: 'Name must be at most 100 characters' });
    }
    
    if (!validatorHelpers.notEmpty(body.ruleType)) {
      errors.push({ field: 'ruleType', message: 'Rule type is required' });
    } else if (!validatorHelpers.inList(body.ruleType, ['package_discount', 'bulk_discount', 'time_based', 'member_discount', 'promo_code'])) {
      errors.push({ field: 'ruleType', message: 'Invalid rule type' });
    }
    
    if (!validatorHelpers.notEmpty(body.discountType)) {
      errors.push({ field: 'discountType', message: 'Discount type is required' });
    } else if (!validatorHelpers.inList(body.discountType, ['percentage', 'fixed'])) {
      errors.push({ field: 'discountType', message: 'Discount type must be percentage or fixed' });
    }
    
    if (body.discountValue === undefined || body.discountValue === null) {
      errors.push({ field: 'discountValue', message: 'Discount value is required' });
    } else if (!validatorHelpers.isNumber(body.discountValue) || body.discountValue < 0) {
      errors.push({ field: 'discountValue', message: 'Discount value must be a non-negative number' });
    }
    
    return createValidationResult(errors.length === 0, errors);
  },
  
  update: (body) => {
    const errors = [];
    
    if (body.name !== undefined && !validatorHelpers.maxLength(body.name, 100)) {
      errors.push({ field: 'name', message: 'Name must be at most 100 characters' });
    }
    
    if (body.ruleType && !validatorHelpers.inList(body.ruleType, ['package_discount', 'bulk_discount', 'time_based', 'member_discount', 'promo_code'])) {
      errors.push({ field: 'ruleType', message: 'Invalid rule type' });
    }
    
    if (body.discountType && !validatorHelpers.inList(body.discountType, ['percentage', 'fixed'])) {
      errors.push({ field: 'discountType', message: 'Discount type must be percentage or fixed' });
    }
    
    if (body.discountValue !== undefined && (!validatorHelpers.isNumber(body.discountValue) || body.discountValue < 0)) {
      errors.push({ field: 'discountValue', message: 'Discount value must be a non-negative number' });
    }
    
    return createValidationResult(errors.length === 0, errors);
  }
};

/**
 * Order Validators
 */
const orderValidators = {
  create: (body) => {
    const errors = [];
    
    if (!validatorHelpers.notEmpty(body.patientId)) {
      errors.push({ field: 'patientId', message: 'Patient is required' });
    } else if (!validatorHelpers.isUUID(body.patientId)) {
      errors.push({ field: 'patientId', message: 'Invalid patient ID format' });
    }
    
    if (!validatorHelpers.notEmpty(body.packageId)) {
      errors.push({ field: 'packageId', message: 'Package is required' });
    } else if (!validatorHelpers.isUUID(body.packageId)) {
      errors.push({ field: 'packageId', message: 'Invalid package ID format' });
    }
    
    if (body.accessExpiresInHours !== undefined) {
      if (!validatorHelpers.isNumber(body.accessExpiresInHours) || !validatorHelpers.inRange(body.accessExpiresInHours, 1, 720)) {
        errors.push({ field: 'accessExpiresInHours', message: 'Access expiry must be between 1 and 720 hours' });
      }
    }
    
    return createValidationResult(errors.length === 0, errors);
  },
  
  updatePayment: (body) => {
    const errors = [];
    
    if (!validatorHelpers.notEmpty(body.status)) {
      errors.push({ field: 'status', message: 'Status is required' });
    } else if (!validatorHelpers.inList(body.status, ['pending', 'paid', 'in_progress', 'completed', 'verified', 'cancelled', 'expired'])) {
      errors.push({ field: 'status', message: 'Invalid status' });
    }
    
    return createValidationResult(errors.length === 0, errors);
  }
};

/**
 * Session Validators
 */
const sessionValidators = {
  submitAnswers: (body) => {
    const errors = [];
    
    if (!validatorHelpers.notEmpty(body.answers)) {
      errors.push({ field: 'answers', message: 'Answers are required' });
    } else if (!validatorHelpers.isArray(body.answers) && !validatorHelpers.isObject(body.answers)) {
      errors.push({ field: 'answers', message: 'Answers must be an array or object' });
    }
    
    // metadata is optional (for CFIT subtest timer persistence)
    if (body.metadata !== undefined && !validatorHelpers.isObject(body.metadata)) {
      errors.push({ field: 'metadata', message: 'Metadata must be an object' });
    }
    
    return createValidationResult(errors.length === 0, errors);
  },
  
  saveProgress: (body) => {
    const errors = [];
    
    if (!validatorHelpers.notEmpty(body.answers)) {
      errors.push({ field: 'answers', message: 'Answers are required' });
    } else if (!validatorHelpers.isArray(body.answers) && !validatorHelpers.isObject(body.answers)) {
      errors.push({ field: 'answers', message: 'Answers must be an array or object' });
    }
    
    // metadata is optional (for CFIT subtest timer persistence)
    if (body.metadata !== undefined && !validatorHelpers.isObject(body.metadata)) {
      errors.push({ field: 'metadata', message: 'Metadata must be an object' });
    }
    
    return createValidationResult(errors.length === 0, errors);
  }
};

/**
 * Public Access Validators
 */
const publicValidators = {
  validateToken: (params) => {
    const errors = [];
    
    if (!validatorHelpers.notEmpty(params.token)) {
      errors.push({ field: 'token', message: 'Access token is required' });
    } else if (!/^[A-Z0-9-]{12,14}$/i.test(params.token)) {
      errors.push({ field: 'token', message: 'Invalid token format' });
    }
    
    return createValidationResult(errors.length === 0, errors);
  }
};

/**
 * Invitation Validators
 */
const invitationValidators = {
  create: (body) => {
    const errors = [];
    
    if (!validatorHelpers.notEmpty(body.packageId)) {
      errors.push({ field: 'packageId', message: 'Package is required' });
    }
    
    if (body.name && !validatorHelpers.maxLength(body.name, 100)) {
      errors.push({ field: 'name', message: 'Name must be at most 100 characters' });
    }
    
    if (body.maxUses !== undefined && body.maxUses !== null) {
      if (!validatorHelpers.isNumber(body.maxUses) || body.maxUses < 1) {
        errors.push({ field: 'maxUses', message: 'Max uses must be at least 1' });
      }
    }
    
    if (body.testExpiryHours !== undefined) {
      if (!validatorHelpers.isNumber(body.testExpiryHours) || !validatorHelpers.inRange(body.testExpiryHours, 1, 720)) {
        errors.push({ field: 'testExpiryHours', message: 'Test expiry must be between 1 and 720 hours' });
      }
    }
    
    if (body.requireFields && !validatorHelpers.isArray(body.requireFields)) {
      errors.push({ field: 'requireFields', message: 'Required fields must be an array' });
    }
    
    return createValidationResult(errors.length === 0, errors);
  },
  
  update: (body) => {
    const errors = [];
    
    if (body.name !== undefined && !validatorHelpers.maxLength(body.name, 100)) {
      errors.push({ field: 'name', message: 'Name must be at most 100 characters' });
    }
    
    if (body.maxUses !== undefined && body.maxUses !== null) {
      if (!validatorHelpers.isNumber(body.maxUses) || body.maxUses < 1) {
        errors.push({ field: 'maxUses', message: 'Max uses must be at least 1' });
      }
    }
    
    if (body.testExpiryHours !== undefined) {
      if (!validatorHelpers.isNumber(body.testExpiryHours) || !validatorHelpers.inRange(body.testExpiryHours, 1, 720)) {
        errors.push({ field: 'testExpiryHours', message: 'Test expiry must be between 1 and 720 hours' });
      }
    }
    
    return createValidationResult(errors.length === 0, errors);
  },
  
  register: (body) => {
    const errors = [];
    
    // Basic validation - actual required field validation done in controller
    // based on invitation's requireFields config
    if (!validatorHelpers.notEmpty(body.fullName)) {
      errors.push({ field: 'fullName', message: 'Full name is required' });
    } else if (!validatorHelpers.maxLength(body.fullName, 100)) {
      errors.push({ field: 'fullName', message: 'Full name must be at most 100 characters' });
    }
    
    if (body.email && !validatorHelpers.isEmail(body.email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }
    
    if (body.phone && !validatorHelpers.maxLength(body.phone, 20)) {
      errors.push({ field: 'phone', message: 'Phone must be at most 20 characters' });
    }
    
    // Support both 'sex' and 'gender' field names for backward compatibility
    const sexValue = body.sex || body.gender;
    if (sexValue && !validatorHelpers.inList(sexValue, ['male', 'female'])) {
      errors.push({ field: 'sex', message: 'Invalid sex value (must be male or female)' });
    }
    
    return createValidationResult(errors.length === 0, errors);
  }
};

/**
 * Psikogram Validators
 */
const psikogramValidators = {
  create: (body) => {
    const errors = [];
    
    if (!validatorHelpers.notEmpty(body.patientId)) {
      errors.push({ field: 'patientId', message: 'Patient ID is required' });
    } else if (!validatorHelpers.isUUID(body.patientId)) {
      errors.push({ field: 'patientId', message: 'Invalid patient ID format' });
    }
    
    if (body.sessionId && !validatorHelpers.isUUID(body.sessionId)) {
      errors.push({ field: 'sessionId', message: 'Invalid session ID format' });
    }
    
    if (!validatorHelpers.notEmpty(body.examDate)) {
      errors.push({ field: 'examDate', message: 'Exam date is required' });
    } else {
      const examDate = new Date(body.examDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (examDate > today) {
        errors.push({ field: 'examDate', message: 'Exam date cannot be in the future' });
      }
    }
    
    if (!validatorHelpers.notEmpty(body.participant)) {
      errors.push({ field: 'participant', message: 'Participant data is required' });
    } else if (!validatorHelpers.isObject(body.participant)) {
      errors.push({ field: 'participant', message: 'Participant must be an object' });
    } else {
      if (!validatorHelpers.notEmpty(body.participant.name)) {
        errors.push({ field: 'participant.name', message: 'Participant name is required' });
      } else if (!validatorHelpers.minLength(body.participant.name, 2)) {
        errors.push({ field: 'participant.name', message: 'Participant name must be at least 2 characters' });
      }
    }
    
    if (body.sections && !validatorHelpers.isObject(body.sections)) {
      errors.push({ field: 'sections', message: 'Sections must be an object' });
    } else if (body.sections) {
      // Validate section ratings
      const validRatings = ['R', 'K', 'C', 'B', 'T', ''];
      const sectionKeys = ['kecerdasan', 'sikapKerja', 'kepribadian', 'kemampuanBelajar'];
      
      for (const sectionKey of sectionKeys) {
        const section = body.sections[sectionKey];
        if (section && section.items && validatorHelpers.isArray(section.items)) {
          for (let i = 0; i < section.items.length; i++) {
            const item = section.items[i];
            if (item.rating && !validatorHelpers.inList(item.rating, validRatings)) {
              errors.push({ 
                field: `sections.${sectionKey}.items[${i}].rating`, 
                message: 'Rating must be one of: R, K, C, B, T' 
              });
            }
          }
        }
      }
    }
    
    if (body.recommendation && !validatorHelpers.inList(body.recommendation, ['recommended', 'not_recommended'])) {
      errors.push({ field: 'recommendation', message: 'Recommendation must be recommended or not_recommended' });
    }
    
    if (body.status && !validatorHelpers.inList(body.status, ['draft', 'final'])) {
      errors.push({ field: 'status', message: 'Status must be draft or final' });
    }
    
    return createValidationResult(errors.length === 0, errors);
  },
  
  update: (body) => {
    const errors = [];
    
    if (body.sessionId !== undefined && body.sessionId !== null && !validatorHelpers.isUUID(body.sessionId)) {
      errors.push({ field: 'sessionId', message: 'Invalid session ID format' });
    }
    
    if (body.examDate) {
      const examDate = new Date(body.examDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (examDate > today) {
        errors.push({ field: 'examDate', message: 'Exam date cannot be in the future' });
      }
    }
    
    if (body.participant !== undefined) {
      if (!validatorHelpers.isObject(body.participant)) {
        errors.push({ field: 'participant', message: 'Participant must be an object' });
      } else if (body.participant.name !== undefined && !validatorHelpers.minLength(body.participant.name, 2)) {
        errors.push({ field: 'participant.name', message: 'Participant name must be at least 2 characters' });
      }
    }
    
    if (body.sections !== undefined && body.sections !== null && !validatorHelpers.isObject(body.sections)) {
      errors.push({ field: 'sections', message: 'Sections must be an object' });
    } else if (body.sections) {
      // Validate section ratings
      const validRatings = ['R', 'K', 'C', 'B', 'T', ''];
      const sectionKeys = ['kecerdasan', 'sikapKerja', 'kepribadian', 'kemampuanBelajar'];
      
      for (const sectionKey of sectionKeys) {
        const section = body.sections[sectionKey];
        if (section && section.items && validatorHelpers.isArray(section.items)) {
          for (let i = 0; i < section.items.length; i++) {
            const item = section.items[i];
            if (item.rating && !validatorHelpers.inList(item.rating, validRatings)) {
              errors.push({ 
                field: `sections.${sectionKey}.items[${i}].rating`, 
                message: 'Rating must be one of: R, K, C, B, T' 
              });
            }
          }
        }
      }
    }
    
    if (body.recommendation !== undefined && body.recommendation !== null && 
        !validatorHelpers.inList(body.recommendation, ['recommended', 'not_recommended'])) {
      errors.push({ field: 'recommendation', message: 'Recommendation must be recommended or not_recommended' });
    }
    
    if (body.status && !validatorHelpers.inList(body.status, ['draft', 'final'])) {
      errors.push({ field: 'status', message: 'Status must be draft or final' });
    }
    
    return createValidationResult(errors.length === 0, errors);
  }
};

/**
 * Settings Validators
 */
const settingsValidators = {
  save: (body) => {
    const errors = [];
    
    // Color validation (hex format)
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    
    if (body.primaryColor && !hexColorRegex.test(body.primaryColor)) {
      errors.push({ field: 'primaryColor', message: 'Invalid color format. Use hex format (e.g., #1e3a5f)' });
    }
    
    if (body.secondaryColor && !hexColorRegex.test(body.secondaryColor)) {
      errors.push({ field: 'secondaryColor', message: 'Invalid color format. Use hex format (e.g., #6b7280)' });
    }
    
    // Email validation
    if (body.email && !validatorHelpers.isEmail(body.email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }
    
    if (body.institutionEmail && !validatorHelpers.isEmail(body.institutionEmail)) {
      errors.push({ field: 'institutionEmail', message: 'Invalid email format' });
    }
    
    // URL validation (basic)
    const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;
    
    if (body.institutionWebsite && !urlRegex.test(body.institutionWebsite)) {
      errors.push({ field: 'institutionWebsite', message: 'Invalid website URL format' });
    }
    
    // String length validations
    if (body.psychologistName && !validatorHelpers.maxLength(body.psychologistName, 255)) {
      errors.push({ field: 'psychologistName', message: 'Psychologist name must be at most 255 characters' });
    }
    
    if (body.licenseNumber && !validatorHelpers.maxLength(body.licenseNumber, 100)) {
      errors.push({ field: 'licenseNumber', message: 'License number must be at most 100 characters' });
    }
    
    if (body.institutionName && !validatorHelpers.maxLength(body.institutionName, 255)) {
      errors.push({ field: 'institutionName', message: 'Institution name must be at most 255 characters' });
    }
    
    if (body.tagline && !validatorHelpers.maxLength(body.tagline, 255)) {
      errors.push({ field: 'tagline', message: 'Tagline must be at most 255 characters' });
    }
    
    if (body.reportTitle && !validatorHelpers.maxLength(body.reportTitle, 100)) {
      errors.push({ field: 'reportTitle', message: 'Report title must be at most 100 characters' });
    }
    
    if (body.reportSubtitle && !validatorHelpers.maxLength(body.reportSubtitle, 255)) {
      errors.push({ field: 'reportSubtitle', message: 'Report subtitle must be at most 255 characters' });
    }
    
    if (body.instagram && !validatorHelpers.maxLength(body.instagram, 100)) {
      errors.push({ field: 'instagram', message: 'Instagram handle must be at most 100 characters' });
    }
    
    // Boolean validations
    if (body.showLogo !== undefined && !validatorHelpers.isBoolean(body.showLogo)) {
      errors.push({ field: 'showLogo', message: 'showLogo must be a boolean' });
    }
    
    if (body.showSignature !== undefined && !validatorHelpers.isBoolean(body.showSignature)) {
      errors.push({ field: 'showSignature', message: 'showSignature must be a boolean' });
    }
    
    if (body.showWatermark !== undefined && !validatorHelpers.isBoolean(body.showWatermark)) {
      errors.push({ field: 'showWatermark', message: 'showWatermark must be a boolean' });
    }
    
    return createValidationResult(errors.length === 0, errors);
  }
};

/**
 * Validation middleware factory
 */
function validate(validatorFn, property = 'body') {
  return (req, res, next) => {
    const data = req[property];
    const result = validatorFn(data);
    
    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: result.errors
      });
    }
    
    next();
  };
}

module.exports = {
  validatorHelpers,
  testTypeValidators,
  patientValidators,
  packageValidators,
  priceRuleValidators,
  orderValidators,
  sessionValidators,
  publicValidators,
  invitationValidators,
  psikogramValidators,
  settingsValidators,
  validate
};
