/**
 * Enhanced error handler middleware
 * Sanitizes error messages to prevent information leakage.
 * Note: We use res.statusCode when it's still 200 (route didn't set status); otherwise we keep the status the route set (e.g. 404 from notFound).
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = 'An error occurred';

  // Log error for debugging (sanitized)
  const errorLog = {
    message: err.message,
    name: err.name,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    requestId: req.id || 'unknown',
  };

  // Only log stack in development
  if (process.env.NODE_ENV !== 'production') {
    errorLog.stack = err.stack;
  }

  console.error('Error:', errorLog);

  // Handle specific error types with safe messages
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (err.name === 'MongoServerError' && err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate entry. This record already exists.';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  } else if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File too large. Maximum size is 10MB.';
    } else {
      message = 'File upload error';
    }
  } else if (err.name === 'MongoServerError') {
    statusCode = 500;
    message = 'Database error occurred';
  } else if (err.name === 'MongooseError') {
    statusCode = 500;
    message = 'Database error occurred';
  } else if (statusCode === 500) {
    // Generic server errors - never expose internal details
    message = 'An error occurred. Please try again later.';
  } else {
    // For non-500 errors, use sanitized message in production
    message = process.env.NODE_ENV === 'production' 
      ? err.message?.replace(/[^\w\s.,!?-]/g, '') || 'An error occurred'
      : err.message;
  }

  // Final sanitization for production
  const sanitizedMessage = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'An error occurred. Please try again later.'
    : message;

  res.status(statusCode).json({
    success: false,
    message: sanitizedMessage,
    requestId: req.id || undefined,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err.message !== sanitizedMessage ? err.message : undefined,
      errorName: err.name
    }),
  });
};

/**
 * 404 Not Found handler
 */
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};


