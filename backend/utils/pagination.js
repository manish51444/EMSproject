/**
 * Pagination utility functions
 */

const MAX_LIMIT = 100;

/**
 * Get pagination parameters from request query.
 * Limit is capped at MAX_LIMIT so routes that don't use validatePagination are still safe.
 * @param {Object} req - Express request object
 * @returns {Object} Pagination parameters
 */
export const getPaginationParams = (req) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const rawLimit = parseInt(req.query.limit, 10) || 10;
  const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Create pagination response
 * @param {Object} data - Data to paginate
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} Paginated response
 */
export const createPaginationResponse = (data, page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPrevPage,
    },
  };
};

