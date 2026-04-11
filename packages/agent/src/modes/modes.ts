/**
 * Agent modes
 * 
 * Defines the three agent operating modes:
 * - interactive: Responds to explicit commands only
 * - semi-autonomous: Auto-runs maintenance, pauses for approvals on major changes
 * - autonomous: Continuous self-maintenance
 */

export type AgentMode = 'interactive' | 'semi-autonomous' | 'autonomous';

/**
 * Agent mode configuration
 */
export interface ModeConfig {
  /** The operating mode */
  mode: AgentMode;
  /** Whether to auto-commit changes to git */
  autoGitCommit: boolean;
  /** Whether to log all operations */
  logOperations: boolean;
  /** Interval between autonomous cycles (in ms) */
  cycleIntervalMs: number;
  /** Major change threshold - number of pages changed that triggers approval */
  majorChangeThreshold: number;
}

/**
 * Get default configuration for a mode
 */
export function getModeConfig(mode: AgentMode): ModeConfig {
  switch (mode) {
    case 'interactive':
      return {
        mode: 'interactive',
        autoGitCommit: false,
        logOperations: true,
        cycleIntervalMs: 0, // No automatic cycles
        majorChangeThreshold: 0, // All changes require approval
      };
    case 'semi-autonomous':
      return {
        mode: 'semi-autonomous',
        autoGitCommit: true,
        logOperations: true,
        cycleIntervalMs: 60000, // 1 minute
        majorChangeThreshold: 3, // 3+ pages = major change
      };
    case 'autonomous':
      return {
        mode: 'autonomous',
        autoGitCommit: true,
        logOperations: true,
        cycleIntervalMs: 30000, // 30 seconds
        majorChangeThreshold: 10, // 10+ pages = major change
      };
  }
}

/**
 * Validate a mode transition
 */
export function canTransitionTo(currentMode: AgentMode, newMode: AgentMode): boolean {
  // Can always transition to any mode, including same mode (no-op)
  return true;
}

/**
 * Check if a change is considered "major" based on mode config
 * Note: A change of 0 pages is never considered major (no changes to make)
 */
export function isMajorChange(
  pageCount: number,
  config: ModeConfig
): boolean {
  return pageCount > 0 && pageCount >= config.majorChangeThreshold;
}
