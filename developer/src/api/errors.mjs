export class ApiError extends Error {
  constructor(status, code, messageKey, {retryable = false, cause} = {}) {
    super(code, {cause});
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.messageKey = messageKey;
    this.retryable = retryable;
  }
}

export const badRequest = (code = 'VALIDATION_ERROR', messageKey = 'error.validation') =>
  new ApiError(400, code, messageKey);

export const forbidden = () => new ApiError(403, 'FORBIDDEN', 'error.forbidden');
export const notFound = () => new ApiError(404, 'NOT_FOUND', 'error.not_found');
export const conflict = (code = 'CONFLICT') => new ApiError(409, code, 'error.conflict');
