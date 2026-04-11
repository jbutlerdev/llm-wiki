/**
 * Config API routes
 */

import { Hono } from 'hono';
import { getWikiDir } from '../index.js';
import type { UpdateConfigRequest, EditableConfigField } from '@llm-wiki/core';

function createSuccessResponse<T>(data: T) {
  return { success: true, data };
}

function createErrorResponse(error: string, message: string, statusCode: number) {
  return {
    success: false,
    error: { error, message, statusCode },
  };
}

// Fields that can be edited via API
const EDITABLE_FIELDS: EditableConfigField[] = ['name', 'description'];

export function registerConfigRoutes(app: Hono) {
  // GET /api/config - Get configuration
  app.get('/api/config', async (c) => {
    const wikiDir = getWikiDir();

    try {
      const { loadConfig } = await import('@llm-wiki/core/config');

      const config = await loadConfig(wikiDir);

      return c.json(
        createSuccessResponse({
          config,
          editableFields: EDITABLE_FIELDS,
        })
      );
    } catch (error) {
      console.error('Error loading config:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to load config', 500),
        500
      );
    }
  });

  // PUT /api/config - Update configuration
  app.put('/api/config', async (c) => {
    const wikiDir = getWikiDir();

    try {
      const body = (await c.req.json()) as UpdateConfigRequest;

      // Check for invalid fields
      const providedFields = Object.keys(body);
      const invalidFields = providedFields.filter(
        (f) => !EDITABLE_FIELDS.includes(f as EditableConfigField)
      );

      if (invalidFields.length > 0) {
        return c.json(
          createErrorResponse(
            'Bad Request',
            `Invalid config fields: ${invalidFields.join(', ')}. Editable fields: ${EDITABLE_FIELDS.join(', ')}`,
            400
          ),
          400
        );
      }

      // If no valid fields provided, return error
      if (providedFields.length === 0) {
        return c.json(
          createErrorResponse('Bad Request', 'No valid config fields provided', 400),
          400
        );
      }

      const { loadConfig, saveConfig } = await import('@llm-wiki/core/config');

      const config = await loadConfig(wikiDir);

      // Update editable fields
      if (body.name !== undefined) {
        config.name = body.name;
      }
      if (body.description !== undefined) {
        config.description = body.description;
      }

      await saveConfig(wikiDir, config);

      return c.json(
        createSuccessResponse({
          config,
          editableFields: EDITABLE_FIELDS,
        })
      );
    } catch (error) {
      console.error('Error updating config:', error);
      return c.json(
        createErrorResponse('Internal Server Error', 'Failed to update config', 500),
        500
      );
    }
  });
}
