/**
 * HTTP Infrastructure - Public API
 */

export {
  withAdminAuth,
  withDatabase,
  withAdminAuthAndDatabase,
  createErrorResponse,
  createSuccessResponse,
  getDatabase,
  parseIdParam,
  type AuthenticatedHandler,
  type AdminMiddlewareOptions,
} from './AdminAuthMiddleware';
