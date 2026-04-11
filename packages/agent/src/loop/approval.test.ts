/**
 * Tests for approval system
 */

import { describe, it, expect } from 'vitest';
import {
  type ApprovalRequest,
  type ApprovalChange,
  type Approval,
  generateApprovalId,
  createPageApproval,
  createBulkApproval,
  isApprovalExpired,
} from './approval.js';

describe('Approval System', () => {
  describe('generateApprovalId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateApprovalId();
      const id2 = generateApprovalId();
      
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });

    it('should start with approval_ prefix', () => {
      const id = generateApprovalId();
      expect(id.startsWith('approval_')).toBe(true);
    });
  });

  describe('createPageApproval', () => {
    it('should create a create_page approval', () => {
      const approval = createPageApproval('create_page', 'new-entity', 'New Entity', 'Creates a new entity page');
      
      expect(approval.id).toBeTruthy();
      expect(approval.type).toBe('create_page');
      expect(approval.description).toContain('New Entity');
      expect(approval.affectedPages).toContain('new-entity');
      expect(approval.changes).toHaveLength(1);
      expect(approval.changes[0].action).toBe('create');
      expect(approval.changes[0].slug).toBe('new-entity');
      expect(approval.requestedAt).toBeInstanceOf(Date);
    });

    it('should create an update_page approval', () => {
      const approval = createPageApproval('update_page', 'existing-entity', 'Existing Entity', 'Updates entity summary', 'diff content');
      
      expect(approval.type).toBe('update_page');
      expect(approval.changes[0].action).toBe('update');
      expect(approval.changes[0].diff).toBe('diff content');
    });

    it('should create a delete_page approval', () => {
      const approval = createPageApproval('delete_page', 'old-entity', 'Old Entity', 'Removes outdated entity');
      
      expect(approval.type).toBe('delete_page');
      expect(approval.changes[0].action).toBe('delete');
    });
  });

  describe('createBulkApproval', () => {
    it('should create a bulk operation approval', () => {
      const changes: ApprovalChange[] = [
        { action: 'create', slug: 'page-1', title: 'Page 1', summary: 'First page' },
        { action: 'create', slug: 'page-2', title: 'Page 2', summary: 'Second page' },
        { action: 'update', slug: 'page-3', title: 'Page 3', summary: 'Updates page 3' },
      ];

      const approval = createBulkApproval(
        'bulk-update',
        'Bulk Update',
        changes,
        'Creates 2 pages and updates 1'
      );

      expect(approval.id).toBeTruthy();
      expect(approval.type).toBe('bulk_operation');
      expect(approval.description).toBe('Creates 2 pages and updates 1');
      expect(approval.affectedPages).toEqual(['page-1', 'page-2', 'page-3']);
      expect(approval.changes).toHaveLength(3);
      expect(approval.requestedAt).toBeInstanceOf(Date);
    });
  });

  describe('isApprovalExpired', () => {
    it('should return false when no expiration is set', () => {
      const approval: ApprovalRequest = {
        id: 'test',
        type: 'create_page',
        description: 'Test',
        affectedPages: [],
        changes: [],
        requestedAt: new Date(),
      };

      expect(isApprovalExpired(approval)).toBe(false);
    });

    it('should return false when expiration is in the future', () => {
      const approval: ApprovalRequest = {
        id: 'test',
        type: 'create_page',
        description: 'Test',
        affectedPages: [],
        changes: [],
        requestedAt: new Date(),
        expiresAt: new Date(Date.now() + 60000), // 1 minute in future
      };

      expect(isApprovalExpired(approval)).toBe(false);
    });

    it('should return true when expiration is in the past', () => {
      const approval: ApprovalRequest = {
        id: 'test',
        type: 'create_page',
        description: 'Test',
        affectedPages: [],
        changes: [],
        requestedAt: new Date(),
        expiresAt: new Date(Date.now() - 1000), // 1 second in past
      };

      expect(isApprovalExpired(approval)).toBe(true);
    });
  });
});
