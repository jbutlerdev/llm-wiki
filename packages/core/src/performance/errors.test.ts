import { describe, it, expect, vi } from 'vitest';
import {
  WikiError,
  PageNotFoundError,
  InvalidPageError,
  SourceNotFoundError,
  InvalidSourceError,
  WikiNotInitializedError,
  PathTraversalError,
  PermissionError,
  ValidationError,
  SearchError,
  IngestError,
  LintError,
  ConfigError,
  isWikiError,
  getErrorCode,
  getErrorMessage,
  getErrorStatusCode,
  formatApiError,
  withErrorHandling,
  withAsyncErrorHandling,
  ok,
  err,
  isOk,
  isErr,
  map,
  mapErr,
  andThen,
  getOrElse,
  unwrap,
  unwrapOrElse,
  retry,
  Result,
} from './errors.js';

describe('Custom Error Classes', () => {
  describe('WikiError', () => {
    it('should create error with code and status', () => {
      const error = new WikiError('Test error', 'TEST_ERROR', 400);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('WikiError');
    });

    it('should serialize to JSON', () => {
      const error = new WikiError('Test error', 'TEST_ERROR', 400);
      const json = error.toJSON();
      expect(json.name).toBe('WikiError');
      expect(json.message).toBe('Test error');
      expect(json.code).toBe('TEST_ERROR');
      expect(json.statusCode).toBe(400);
    });
  });

  describe('PageNotFoundError', () => {
    it('should create 404 error', () => {
      const error = new PageNotFoundError('my-page');
      expect(error.message).toContain('my-page');
      expect(error.code).toBe('PAGE_NOT_FOUND');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('InvalidPageError', () => {
    it('should create 400 error with details', () => {
      const error = new InvalidPageError('Invalid slug', { slug: '123' });
      expect(error.message).toBe('Invalid slug');
      expect(error.code).toBe('INVALID_PAGE');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ slug: '123' });
    });
  });

  describe('SourceNotFoundError', () => {
    it('should create 404 error', () => {
      const error = new SourceNotFoundError('src-123');
      expect(error.message).toContain('src-123');
      expect(error.code).toBe('SOURCE_NOT_FOUND');
      expect(error.statusCode).toBe(404);
    });
  });

  describe('InvalidSourceError', () => {
    it('should create 400 error with details', () => {
      const error = new InvalidSourceError('Invalid URL', { url: 'not-a-url' });
      expect(error.code).toBe('INVALID_SOURCE');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('WikiNotInitializedError', () => {
    it('should create error without path', () => {
      const error = new WikiNotInitializedError();
      expect(error.message).toContain('not initialized');
    });

    it('should create error with path', () => {
      const error = new WikiNotInitializedError('/path/to/wiki');
      expect(error.message).toContain('/path/to/wiki');
    });
  });

  describe('PathTraversalError', () => {
    it('should create 400 error', () => {
      const error = new PathTraversalError('../etc/passwd');
      expect(error.code).toBe('PATH_TRAVERSAL');
      expect(error.statusCode).toBe(400);
    });
  });

  describe('PermissionError', () => {
    it('should create 403 error', () => {
      const error = new PermissionError('Cannot write', '/path');
      expect(error.code).toBe('PERMISSION_DENIED');
      expect(error.statusCode).toBe(403);
      expect(error.path).toBe('/path');
    });
  });

  describe('ValidationError', () => {
    it('should create 400 error with field info', () => {
      const error = new ValidationError('Must be a string', 'name', 'not-a-string');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.field).toBe('name');
      expect(error.value).toBe('not-a-string');
    });
  });

  describe('SearchError', () => {
    it('should create 500 error with query', () => {
      const cause = new Error('QMD failed');
      const error = new SearchError('Search failed', 'my query', cause);
      expect(error.code).toBe('SEARCH_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.query).toBe('my query');
      expect(error.cause).toBe(cause);
    });
  });

  describe('IngestError', () => {
    it('should create 500 error with source', () => {
      const cause = new Error('File not found');
      const error = new IngestError('Ingest failed', 'document.md', cause);
      expect(error.code).toBe('INGEST_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.source).toBe('document.md');
    });
  });

  describe('LintError', () => {
    it('should create 500 error with issues', () => {
      const issues = [{ type: 'orphan', page: 'test' }];
      const error = new LintError('Lint failed', issues);
      expect(error.code).toBe('LINT_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.issues).toEqual(issues);
    });
  });

  describe('ConfigError', () => {
    it('should create 500 error with field', () => {
      const error = new ConfigError('Invalid config', 'qmd.path');
      expect(error.code).toBe('CONFIG_ERROR');
      expect(error.field).toBe('qmd.path');
    });
  });
});

describe('Error Utilities', () => {
  describe('isWikiError', () => {
    it('should return true for WikiError instances', () => {
      expect(isWikiError(new WikiError('test', 'TEST'))).toBe(true);
      expect(isWikiError(new PageNotFoundError('page'))).toBe(true);
    });

    it('should return false for regular errors', () => {
      expect(isWikiError(new Error('test'))).toBe(false);
      expect(isWikiError('string error')).toBe(false);
    });
  });

  describe('getErrorCode', () => {
    it('should get code from WikiError', () => {
      expect(getErrorCode(new WikiError('test', 'MY_CODE'))).toBe('MY_CODE');
    });

    it('should get code from regular error', () => {
      const error = new Error('test');
      error.name = 'TypeError';
      expect(getErrorCode(error)).toBe('TYPEERROR');
    });

    it('should handle strings', () => {
      expect(getErrorCode('string error')).toBe('UNKNOWN_ERROR');
    });
  });

  describe('getErrorMessage', () => {
    it('should get message from Error', () => {
      expect(getErrorMessage(new Error('my message'))).toBe('my message');
    });

    it('should return string as-is', () => {
      expect(getErrorMessage('string error')).toBe('string error');
    });

    it('should handle unknown types', () => {
      expect(getErrorMessage(null)).toBe('An unknown error occurred');
    });
  });

  describe('getErrorStatusCode', () => {
    it('should get status from WikiError', () => {
      const error = new WikiError('test', 'TEST', 404);
      expect(getErrorStatusCode(error)).toBe(404);
    });

    it('should infer status from error name', () => {
      const syntax = new SyntaxError('test');
      expect(getErrorStatusCode(syntax)).toBe(400);

      const type = new TypeError('test');
      expect(getErrorStatusCode(type)).toBe(400);
    });
  });

  describe('formatApiError', () => {
    it('should format WikiError', () => {
      const error = new WikiError('test', 'TEST', 404);
      const formatted = formatApiError(error);
      expect(formatted.error).toBe('TEST');
      expect(formatted.message).toBe('test');
      expect(formatted.statusCode).toBe(404);
    });

    it('should format regular error', () => {
      const formatted = formatApiError(new Error('my error'));
      expect(formatted.error).toBe('ERROR');
      expect(formatted.message).toBe('my error');
      expect(formatted.statusCode).toBe(500);
    });
  });
});

describe('withErrorHandling', () => {
  it('should return function result', () => {
    const fn = withErrorHandling(() => 'result');
    expect(fn()).toBe('result');
  });

  it('should rethrow by default', () => {
    const fn = withErrorHandling(() => {
      throw new Error('test');
    });
    expect(fn).toThrow('test');
  });

  it('should call onError callback', () => {
    const onError = vi.fn();
    const fn = withErrorHandling(() => {
      throw new Error('test');
    }, { onError });
    expect(fn).toThrow('test');
    expect(onError).toHaveBeenCalled();
  });

  it('should return fallback value', () => {
    const fn = withErrorHandling(
      () => {
        throw new Error('test');
      },
      { fallback: () => 'fallback' }
    );
    expect(fn()).toBe('fallback');
  });
});

describe('withAsyncErrorHandling', () => {
  it('should return promise result', async () => {
    const fn = withAsyncErrorHandling(async () => 'result');
    await expect(fn()).resolves.toBe('result');
  });

  it('should rethrow by default', async () => {
    const fn = withAsyncErrorHandling(async () => {
      throw new Error('test');
    });
    await expect(fn()).rejects.toThrow('test');
  });

  it('should return fallback promise', async () => {
    const fn = withAsyncErrorHandling(
      async () => {
        throw new Error('test');
      },
      { fallback: async () => 'fallback' }
    );
    await expect(fn()).resolves.toBe('fallback');
  });
});

describe('Result Type', () => {
  describe('ok/err', () => {
    it('should create ok result', () => {
      const result = ok(42);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(42);
      }
    });

    it('should create err result', () => {
      const result = err(new Error('fail'));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(Error);
      }
    });
  });

  describe('isOk/isErr', () => {
    it('should check result type', () => {
      const okResult = ok(42);
      const errResult = err(new Error('fail'));
      
      expect(isOk(okResult)).toBe(true);
      expect(isOk(errResult)).toBe(false);
      expect(isErr(okResult)).toBe(false);
      expect(isErr(errResult)).toBe(true);
    });
  });

  describe('map', () => {
    it('should transform ok value', () => {
      const okResult = ok(5);
      const result = map(okResult, (n) => n * 2);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(10);
      }
    });

    it('should pass through err', () => {
      const errResult = err(new Error('fail'));
      const result = map(errResult, (n: number) => n * 2);
      expect(isErr(result)).toBe(true);
    });
  });

  describe('mapErr', () => {
    it('should transform err value', () => {
      const errResult = err(new Error('original'));
      const result = mapErr(errResult, (e) => {
        e.message = 'transformed';
        return e;
      });
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('transformed');
      }
    });

    it('should pass through ok', () => {
      const okResult = ok(42);
      const result = mapErr(okResult, (e: Error) => e);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(42);
      }
    });
  });

  describe('andThen', () => {
    it('should chain operations', () => {
      const okResult = ok(10);
      const result = andThen(okResult, (n) => ok(n + 5));
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(15);
      }
    });

    it('should short circuit on err', () => {
      const errResult = err(new Error('fail'));
      const result = andThen(errResult, (n: number) => ok(n + 5));
      expect(isErr(result)).toBe(true);
    });
  });

  describe('getOrElse', () => {
    it('should return value for ok', () => {
      const okResult = ok(42);
      expect(getOrElse(okResult, 0)).toBe(42);
    });

    it('should return default for err', () => {
      const errResult = err(new Error());
      expect(getOrElse(errResult, 0)).toBe(0);
    });
  });

  describe('unwrap', () => {
    it('should return value for ok', () => {
      const okResult = ok(42);
      expect(unwrap(okResult)).toBe(42);
    });

    it('should throw for err', () => {
      const errResult = err(new Error('fail'));
      expect(() => unwrap(errResult)).toThrow('fail');
    });
  });

  describe('unwrapOrElse', () => {
    it('should return value for ok', () => {
      const okResult = ok(42);
      expect(unwrapOrElse(okResult, (e) => 0)).toBe(42);
    });

    it('should compute value for err', () => {
      const errResult = err(new Error());
      expect(unwrapOrElse(errResult, (e) => 42)).toBe(42);
    });
  });
});

describe('retry', () => {
  it('should retry failed operations', async () => {
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts++;
      if (attempts < 3) throw new Error('fail');
      return 'success';
    });

    const result = await retry(fn, {
      maxAttempts: 3,
      initialDelayMs: 10,
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw after max attempts', async () => {
    const fn = vi.fn(async () => {
      throw new Error('always fail');
    });

    await expect(
      retry(fn, { maxAttempts: 2, initialDelayMs: 10 })
    ).rejects.toThrow('always fail');

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should respect shouldRetry', async () => {
    let attempts = 0;
    const fn = vi.fn(async () => {
      attempts++;
      const error = new Error('type1');
      (error as Error & { type: string }).type = 'type1';
      throw error;
    });

    await expect(
      retry(fn, {
        maxAttempts: 3,
        initialDelayMs: 10,
        shouldRetry: (e) => (e as Error & { type: string }).type !== 'type1',
      })
    ).rejects.toThrow('type1');

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
