import { body, param, query, validationResult } from 'express-validator';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

// Auth validation rules
export const validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('organizationName')
    .trim()
    .notEmpty()
    .withMessage('Organization name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Organization name must be between 2 and 100 characters'),
  body('organizationDomain')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Domain must be less than 255 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'project_manager', 'developer', 'viewer'])
    .withMessage('Invalid role'),
  body('department')
    .optional()
    .custom((value) => {
      if (value === null || value === undefined) return true;
      const arr = Array.isArray(value) ? value : [value];
      const valid = ['salesforce', 'web_development', 'mobile_development'];
      return arr.every((d) => valid.includes(d));
    })
    .withMessage('Invalid department; must be one or more of: salesforce, web_development, mobile_development'),
  handleValidationErrors,
];

export const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
];

// Project validation rules
export const validateCreateProject = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Project name must be between 2 and 100 characters'),
  body('key')
    .trim()
    .notEmpty()
    .withMessage('Project key is required')
    .isLength({ min: 2, max: 10 })
    .withMessage('Project key must be between 2 and 10 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Project key must contain only uppercase letters and numbers'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('members')
    .optional()
    .isArray()
    .withMessage('Members must be an array'),
  body('department')
    .optional()
    .isIn(['salesforce', 'web_development', 'mobile_development'])
    .withMessage('Invalid department'),
  body('technologies')
    .optional()
    .isArray()
    .withMessage('Technologies must be an array'),
  body('clouds')
    .optional()
    .isArray()
    .withMessage('Clouds must be an array'),
  handleValidationErrors,
];

export const validateUpdateProject = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Project name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('members')
    .optional()
    .isArray()
    .withMessage('Members must be an array'),
  handleValidationErrors,
];

// Issue validation rules
export const validateCreateIssue = [
  body('projectId')
    .notEmpty()
    .withMessage('Project ID is required')
    .isMongoId()
    .withMessage('Invalid project ID'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters'),
  body('type')
    .optional()
    .isIn(['bug', 'task', 'story', 'epic'])
    .withMessage('Invalid issue type'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid priority'),
  body('assignee')
    .optional()
    .isMongoId()
    .withMessage('Invalid assignee ID'),
  body('assignees')
    .optional()
    .isArray()
    .withMessage('Assignees must be an array'),
  body('assignees.*')
    .optional()
    .isMongoId()
    .withMessage('Invalid assignee ID in array'),
  body('labels')
    .optional()
    .isArray()
    .withMessage('Labels must be an array'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  handleValidationErrors,
];

export const validateUpdateIssue = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description must be less than 5000 characters'),
  body('type')
    .optional()
    .isIn(['bug', 'task', 'story', 'epic'])
    .withMessage('Invalid issue type'),
  body('status')
    .optional()
    .isIn(['todo', 'in_progress', 'in_review', 'done'])
    .withMessage('Invalid status'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid priority'),
  body('assignee')
    .optional()
    .isMongoId()
    .withMessage('Invalid assignee ID'),
  body('assignees')
    .optional()
    .isArray()
    .withMessage('Assignees must be an array'),
  body('assignees.*')
    .optional()
    .isMongoId()
    .withMessage('Invalid assignee ID in array'),
  body('labels')
    .optional()
    .isArray()
    .withMessage('Labels must be an array'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  handleValidationErrors,
];

export const validateUpdateIssueStatus = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['todo', 'in_progress', 'in_review', 'done'])
    .withMessage('Invalid status'),
  handleValidationErrors,
];

// Comment validation rules
export const validateCreateComment = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Comment must be between 1 and 2000 characters'),
  handleValidationErrors,
];

export const validateUpdateComment = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Comment must be between 1 and 2000 characters'),
  handleValidationErrors,
];

// Work log validation rules
export const validateCreateWorkLog = [
  body('timeSpent')
    .notEmpty()
    .withMessage('Time spent is required')
    .isFloat({ min: 0 })
    .withMessage('Time spent must be a positive number'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  handleValidationErrors,
];

// ID parameter validation
export const validateMongoId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}`),
  handleValidationErrors,
];

// Link issue validation rules
export const validateLinkIssue = [
  body('linkedIssueId')
    .notEmpty()
    .withMessage('Linked issue ID is required')
    .isMongoId()
    .withMessage('Invalid linked issue ID'),
  body('linkType')
    .optional()
    .isIn(['blocks', 'is_blocked_by', 'relates_to', 'duplicates', 'duplicated_by'])
    .withMessage('Invalid link type'),
  handleValidationErrors,
];

// Pagination validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
];

export const validateForgotPassword = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  handleValidationErrors,
];

// Validates :token param on reset-password route (use with validateResetPassword for body)
export const validateResetPasswordToken = [
  param('token')
    .notEmpty()
    .withMessage('Reset token is required')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Invalid reset token format'),
  handleValidationErrors,
];

export const validateResetPassword = [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  handleValidationErrors,
];

// Approval/Rejection validation rules
export const validateApproveIssue = [
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment must be less than 1000 characters'),
  handleValidationErrors,
];

export const validateRejectIssue = [
  body('comment')
    .trim()
    .notEmpty()
    .withMessage('Rejection comment is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters'),
  handleValidationErrors,
];

// Daily task (MOM) validation
export const validateCreateDailyTask = [
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title must be less than 200 characters'),
  body('content')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Content must be less than 5000 characters'),
  handleValidationErrors,
];

export const validateUpdateDailyTask = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title must be less than 200 characters'),
  body('content')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Content must be less than 5000 characters'),
  handleValidationErrors,
];

