/**
 * Error handling utilities and custom error types
 * @module @llm-wiki/core/performance/errors
 */

// ============================================================================
// Custom Error Classes
// ============================================================================

/**
 * Base error class for wiki operations
 */
export class WikiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'WikiError';
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Error for page not found operations
 */
export class PageNotFoundError extends WikiError {
  constructor(slugOrId: string) {
    super(
      `Page not found: ${slugOrId}`,
      'PAGE_NOT_FOUND',
      404
    );
    this.name = 'PageNotFoundError';
  }
}

/**
 * Error for invalid page operations
 */
export class InvalidPageError extends WikiError {
  constructor(
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message, 'INVALID_PAGE', 400);
    this.name = 'InvalidPageError';
  }
}

/**
 * Error for source not found operations
 */
export class SourceNotFoundError extends WikiError {
  constructor(sourceId: string) {
    super(
      `Source not found: ${sourceId}`,
      'SOURCE_NOT_FOUND',
      404
    );
    this.name = 'SourceNotFoundError';
  }
}

/**
 * Error for invalid source operations
 */
export class InvalidSourceError extends WikiError {
  constructor(
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message, 'INVALID_SOURCE', 400);
    this.name = 'InvalidSourceError';
  }
}

/**
 * Error for wiki initialization issues
 */
export class WikiNotInitializedError extends WikiError {
  constructor(path?: string) {
    super(
      path
        ? `Wiki not initialized at path: ${path}`
        : 'Wiki not initialized. Run "llm-wiki init" first.',
      'WIKI_NOT_INITIALIZED',
      500
    );
    this.name = 'WikiNotInitializedError';
  }
}

/**
 * Error for path traversal attempts
 */
export class PathTraversalError extends WikiError {
  constructor(path: string) {
    super(
      `Path traversal attempt detected: ${path}`,
      'PATH_TRAVERSAL',
      400
    );
    this.name = 'PathTraversalError';
  }
}

/**
 * Error for permission issues
 */
export class PermissionError extends WikiError {
  constructor(
    message: string,
    public readonly path?: string
  ) {
    super(message, 'PERMISSION_DENIED', 403);
    this.name = 'PermissionError';
  }
}

/**
 * Error for validation failures
 */
export class ValidationError extends WikiError {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown
  ) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

/**
 * Error for search operations
 */
export class SearchError extends WikiError {
  constructor(
    message: string,
    public readonly query?: string,
    public readonly cause?: Error
  ) {
    super(message, 'SEARCH_ERROR', 500);
    this.name = 'SearchError';
  }
}

/**
 * Error for ingest operations
 */
export class IngestError extends WikiError {
  constructor(
    message: string,
    public readonly source?: string,
    public readonly cause?: Error
  ) {
    super(message, 'INGEST_ERROR', 500);
    this.name = 'IngestError';
  }
}

/**
 * Error for lint operations
 */
export class LintError extends WikiError {
  constructor(
    message: string,
    public readonly issues?: unknown[]
  ) {
    super(message, 'LINT_ERROR', 500);
    this.name = 'LintError';
  }
}

/**
 * Error for configuration issues
 */
export class ConfigError extends WikiError {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message, 'CONFIG_ERROR', 500);
    this.name = 'ConfigError';
  }
}

// ============================================================================
// Error Handler Utilities
// ============================================================================

/**
 * Check if an error is a WikiError
 */
export function isWikiError(error: unknown): error is WikiError {
  return error instanceof WikiError;
}

/**
 * Get error code from any error
 */
export function getErrorCode(error: unknown): string {
  if (isWikiError(error)) {
    return error.code;
  }
  if (error instanceof Error) {
    return error.name.toUpperCase().replace(/ /g, '_');
  }
  return 'UNKNOWN_ERROR';
}

/**
 * Get error message from any error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

/**
 * Get HTTP status code from any error
 */
export function getErrorStatusCode(error: unknown): number {
  if (isWikiError(error)) {
    return error.statusCode;
  }
  if (error instanceof Error) {
    // Common error types
    if (error.name === 'SyntaxError') return 400;
    if (error.name === 'TypeError') return 400;
    if (error.name === 'ReferenceError') return 500;
    if (error.name === 'RangeError') return 400;
  }
  return 500;
}

/**
 * Format error for API response
 */
export function formatApiError(error: unknown): {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
} {
  if (isWikiError(error)) {
    return {
      error: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: 'details' in error ? (error as { details?: Record<string, unknown> }).details : undefined,
    };
  }

  return {
    error: getErrorCode(error),
    message: getErrorMessage(error),
    statusCode: getErrorStatusCode(error),
  };
}

/**
 * Wrap a function to handle errors
 */
export function withErrorHandling<T extends (...args: unknown[]) => unknown, R = ReturnType<T>>(
  fn: T,
  options?: {
    onError?: (error: unknown) => void;
    fallback?: () => R;
    rethrow?: boolean;
  }
): (...args: Parameters<T>) => R {
  return (...args: Parameters<T>) => {
    try {
      return fn(...args) as R;
    } catch (error) {
      options?.onError?.(error);
      if (options?.rethrow) throw error;
      if (options?.fallback) return options.fallback();
      throw error;
    }
  };
}

/**
 * Wrap an async function to handle errors
 */
export function withAsyncErrorHandling<T>(
  fn: () => Promise<T>,
  options?: {
    onError?: (error: unknown) => void;
    fallback?: () => Promise<T>;
    rethrow?: boolean;
  }
): () => Promise<T> {
  return async () => {
    try {
      return await fn();
    } catch (error) {
      options?.onError?.(error);
      if (options?.rethrow) throw error;
      if (options?.fallback) return options.fallback();
      throw error;
    }
  };
}

// ============================================================================
// Result Type (Functional Error Handling)
// ============================================================================

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Create a successful result
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Create an error result
 */
export function err<E = Error>(error: E): Result<never, E> {
  return { ok: false, error };
}

/**
 * Check if result is ok
 */
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok === true;
}

/**
 * Check if result is error
 */
export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return result.ok === false;
}

/**
 * Map over ok value
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  if (isOk(result)) {
    return ok(fn(result.value));
  }
  return result;
}

/**
 * Map over error value
 */
export function mapErr<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  if (isOk(result)) {
    return result;
  }
  return err(fn(result.error));
}

/**
 * Chain operations on result
 */
export function andThen<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  if (isOk(result)) {
    return fn(result.value);
  }
  return result;
}

/**
 * Get value or default
 */
export function getOrElse<T, E>(
  result: Result<T, E>,
  defaultValue: T
): T {
  if (isOk(result)) {
    return result.value;
  }
  return defaultValue;
}

/**
 * Get value or throw
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.value;
  }
  throw result.error;
}

/**
 * Get value or call a function
 */
export function unwrapOrElse<T, E>(
  result: Result<T, E>,
  fn: (error: E) => T
): T {
  if (isOk(result)) {
    return result.value;
  }
  return fn(result.error);
}

// ============================================================================
// Retry Utilities
// ============================================================================

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 100,
    maxDelayMs = 5000,
    backoffMultiplier = 2,
    shouldRetry = () => true,
  } = options;

  let lastError: unknown;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts - 1 || !shouldRetry(error)) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError;
}
