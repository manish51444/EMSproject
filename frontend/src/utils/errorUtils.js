/**
 * Standardized error message extraction from API errors.
 * Backend returns { success: false, message?, errors? }; use this for consistent UI messages.
 * @param {Error} error - Axios error or similar
 * @returns {string} User-facing error message
 */
export function getErrorMessage(error) {
  if (!error) return 'An error occurred';
  const data = error.response?.data;
  if (data?.message) return data.message;
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const first = data.errors[0];
    return typeof first === 'string' ? first : first?.msg || first?.message || 'Validation failed';
  }
  return error.message || 'An error occurred';
}
