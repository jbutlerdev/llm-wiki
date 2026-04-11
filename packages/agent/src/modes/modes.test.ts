/**
 * Tests for agent modes
 */

import { describe, it, expect } from 'vitest';
import {
  type AgentMode,
  type ModeConfig,
  getModeConfig,
  canTransitionTo,
  isMajorChange,
} from '../modes/modes.js';

describe('Agent Modes', () => {
  describe('AgentMode type', () => {
    it('should allow interactive mode', () => {
      const mode: AgentMode = 'interactive';
      expect(mode).toBe('interactive');
    });

    it('should allow semi-autonomous mode', () => {
      const mode: AgentMode = 'semi-autonomous';
      expect(mode).toBe('semi-autonomous');
    });

    it('should allow autonomous mode', () => {
      const mode: AgentMode = 'autonomous';
      expect(mode).toBe('autonomous');
    });
  });

  describe('getModeConfig', () => {
    it('should return interactive mode config', () => {
      const config = getModeConfig('interactive');
      
      expect(config.mode).toBe('interactive');
      expect(config.autoGitCommit).toBe(false);
      expect(config.logOperations).toBe(true);
      expect(config.cycleIntervalMs).toBe(0);
      expect(config.majorChangeThreshold).toBe(0);
    });

    it('should return semi-autonomous mode config', () => {
      const config = getModeConfig('semi-autonomous');
      
      expect(config.mode).toBe('semi-autonomous');
      expect(config.autoGitCommit).toBe(true);
      expect(config.logOperations).toBe(true);
      expect(config.cycleIntervalMs).toBe(60000);
      expect(config.majorChangeThreshold).toBe(3);
    });

    it('should return autonomous mode config', () => {
      const config = getModeConfig('autonomous');
      
      expect(config.mode).toBe('autonomous');
      expect(config.autoGitCommit).toBe(true);
      expect(config.logOperations).toBe(true);
      expect(config.cycleIntervalMs).toBe(30000);
      expect(config.majorChangeThreshold).toBe(10);
    });
  });

  describe('canTransitionTo', () => {
    it('should allow transition from interactive to autonomous', () => {
      expect(canTransitionTo('interactive', 'autonomous')).toBe(true);
    });

    it('should allow transition from autonomous to semi-autonomous', () => {
      expect(canTransitionTo('autonomous', 'semi-autonomous')).toBe(true);
    });

    it('should allow transition from semi-autonomous to interactive', () => {
      expect(canTransitionTo('semi-autonomous', 'interactive')).toBe(true);
    });

    it('should allow transition to same mode (no-op)', () => {
      expect(canTransitionTo('interactive', 'interactive')).toBe(true);
      expect(canTransitionTo('semi-autonomous', 'semi-autonomous')).toBe(true);
      expect(canTransitionTo('autonomous', 'autonomous')).toBe(true);
    });
  });

  describe('isMajorChange', () => {
    it('should detect major change in interactive mode (threshold 0)', () => {
      const config = getModeConfig('interactive');
      expect(isMajorChange(1, config)).toBe(true);
      expect(isMajorChange(0, config)).toBe(false);
    });

    it('should detect major change in semi-autonomous mode (threshold 3)', () => {
      const config = getModeConfig('semi-autonomous');
      expect(isMajorChange(5, config)).toBe(true);
      expect(isMajorChange(3, config)).toBe(true);
      expect(isMajorChange(2, config)).toBe(false);
      expect(isMajorChange(0, config)).toBe(false);
    });

    it('should detect major change in autonomous mode (threshold 10)', () => {
      const config = getModeConfig('autonomous');
      expect(isMajorChange(15, config)).toBe(true);
      expect(isMajorChange(10, config)).toBe(true);
      expect(isMajorChange(9, config)).toBe(false);
      expect(isMajorChange(0, config)).toBe(false);
    });
  });
});
