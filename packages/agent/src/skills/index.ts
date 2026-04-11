/**
 * Agent skills module
 * 
 * Provides workflow definitions for agent operations:
 * - Ingest: Process and add new sources
 * - Query: Answer questions using wiki knowledge
 * - Lint: Check and maintain wiki health
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Skill types
 */
export interface Skill {
  name: string;
  description: string;
  filePath: string;
  content?: string;
}

/**
 * Get skill file paths
 */
function getSkillFilePaths(): Record<string, string> {
  return {
    ingest: join(__dirname, 'ingest', 'SKILL.md'),
    query: join(__dirname, 'query', 'SKILL.md'),
    lint: join(__dirname, 'lint', 'SKILL.md'),
  };
}

/**
 * Get all available skills
 */
export function getSkills(): Skill[] {
  const paths = getSkillFilePaths();
  
  return [
    {
      name: 'ingest',
      description: 'Ingest new sources into the wiki',
      filePath: paths.ingest,
    },
    {
      name: 'query',
      description: 'Answer questions using wiki knowledge',
      filePath: paths.query,
    },
    {
      name: 'lint',
      description: 'Check and maintain wiki health',
      filePath: paths.lint,
    },
  ];
}

/**
 * Load a skill by name
 */
export function loadSkill(name: string): Skill | null {
  const skills = getSkills();
  const skill = skills.find(s => s.name === name);
  
  if (!skill) {
    return null;
  }

  try {
    const content = readFileSync(skill.filePath, 'utf-8');
    return {
      ...skill,
      content,
    };
  } catch {
    return null;
  }
}

/**
 * Get skill content by name
 */
export function getSkillContent(name: string): string | null {
  const skill = loadSkill(name);
  return skill?.content ?? null;
}
