/**
 * @llm-wiki/agent - Embedded Pi agent for LLM Wiki
 * 
 * Provides embedded agent capabilities using the pi-coding-agent SDK
 * with custom wiki tools for maintaining the wiki.
 */

// Session management
export { AgentSessionManager } from './session/agent-session.js';
export type { AgentConfig, AgentStatus, AgentEvent, AgentEventListener, AgentEventType, WikiDirProvider } from './session/agent-session.js';

// Modes
export * from './modes/index.js';

// Loop
export * from './loop/index.js';

// Events
export * from './events/index.js';

// Tools
export * from './tools/index.js';

// Skills
export { getSkills, loadSkill, getSkillContent } from './skills/index.js';
export { generateAgentsTemplate, loadSkillFromFile, createAgentSkills, getSkillFilePaths } from './skills/agents-template.js';
export type { AgentSkill } from './skills/agents-template.js';
