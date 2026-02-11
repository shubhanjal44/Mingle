/**
 * Form Validation Utilities
 * Provides reusable validation functions for forms
 */

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface ValidationRule {
  field: string;
  rules: Array<{
    validate: (value: any, formData?: any) => boolean;
    message: string;
  }>;
}

/**
 * Validate form data against rules
 */
export const validateForm = (
  formData: Record<string, any>,
  rules: ValidationRule[]
): ValidationResult => {
  const errors: Record<string, string> = {};

  for (const rule of rules) {
    const value = formData[rule.field];

    for (const { validate, message } of rule.rules) {
      if (!validate(value, formData)) {
        errors[rule.field] = message;
        break; // Stop at first error for this field
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Common validation functions
 */
export const validators = {
  required: (message: string = 'This field is required') => ({
    validate: (value: any) => {
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      return value !== null && value !== undefined && value !== '';
    },
    message,
  }),

  email: (message: string = 'Please enter a valid email address') => ({
    validate: (value: string) => {
      if (!value) return true; // Let required handle empty values
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },
    message,
  }),

  minLength: (min: number, message?: string) => ({
    validate: (value: string) => {
      if (!value) return true; // Let required handle empty values
      return value.length >= min;
    },
    message: message || `Must be at least ${min} characters`,
  }),

  maxLength: (max: number, message?: string) => ({
    validate: (value: string) => {
      if (!value) return true;
      return value.length <= max;
    },
    message: message || `Must be at most ${max} characters`,
  }),

  pattern: (regex: RegExp, message: string = 'Invalid format') => ({
    validate: (value: string) => {
      if (!value) return true;
      return regex.test(value);
    },
    message,
  }),

  phone: (message: string = 'Please enter a valid phone number') => ({
    validate: (value: string) => {
      if (!value) return true;
      // Basic phone validation - adjust for your needs
      const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
      return phoneRegex.test(value);
    },
    message,
  }),

  url: (message: string = 'Please enter a valid URL') => ({
    validate: (value: string) => {
      if (!value) return true;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message,
  }),

  number: (message: string = 'Must be a valid number') => ({
    validate: (value: any) => {
      if (value === '' || value === null || value === undefined) return true;
      return !isNaN(Number(value));
    },
    message,
  }),

  min: (min: number, message?: string) => ({
    validate: (value: any) => {
      if (value === '' || value === null || value === undefined) return true;
      return Number(value) >= min;
    },
    message: message || `Must be at least ${min}`,
  }),

  max: (max: number, message?: string) => ({
    validate: (value: any) => {
      if (value === '' || value === null || value === undefined) return true;
      return Number(value) <= max;
    },
    message: message || `Must be at most ${max}`,
  }),

  match: (fieldName: string, message?: string) => ({
    validate: (value: any, formData?: any) => {
      if (!value || !formData) return true;
      return value === formData[fieldName];
    },
    message: message || `Must match ${fieldName}`,
  }),

  custom: (
    validateFn: (value: any, formData?: any) => boolean,
    message: string
  ) => ({
    validate: validateFn,
    message,
  }),
};

/**
 * Sanitize input to prevent XSS attacks
 */
export const sanitizeInput = (input: string): string => {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};

/**
 * Validate password strength
 */
export interface PasswordStrength {
  score: number; // 0-4
  feedback: string[];
  isStrong: boolean;
}

export const validatePasswordStrength = (password: string): PasswordStrength => {
  let score = 0;
  const feedback: string[] = [];

  if (!password) {
    return { score: 0, feedback: ['Password is required'], isStrong: false };
  }

  // Length check
  if (password.length >= 8) {
    score++;
  } else {
    feedback.push('Use at least 8 characters');
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score++;
  } else {
    feedback.push('Add lowercase letters');
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score++;
  } else {
    feedback.push('Add uppercase letters');
  }

  // Number check
  if (/\d/.test(password)) {
    score++;
  } else {
    feedback.push('Add numbers');
  }

  // Special character check
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score++;
  } else {
    feedback.push('Add special characters');
  }

  // Bonus for longer passwords
  if (password.length >= 12) {
    score = Math.min(score + 1, 5);
  }

  return {
    score: Math.min(score, 4),
    feedback,
    isStrong: score >= 3,
  };
};

/**
 * Real-time field validation hook helper
 */
export const validateField = (
  value: any,
  rules: Array<{
    validate: (value: any) => boolean;
    message: string;
  }>
): string | null => {
  for (const rule of rules) {
    if (!rule.validate(value)) {
      return rule.message;
    }
  }
  return null;
};
