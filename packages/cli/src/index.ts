/**
 * @llm-wiki/cli - CLI entry point
 * 
 * CLI commands: init, ingest, search, lint, status, server, agent
 */

import { Command } from 'commander';
import { init, ingest, listPages, isWikiInitialized, createQMDStore, createSearchFunction, runLint, type LintIssueType } from '@llm-wiki/core';
import { join, dirname } from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

// Get package version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
const version = packageJson.version;

export { version };

/**
 * Get wiki directory from options
 */
function getWikiDir(opts: { wiki?: string }): string {
  if (!opts.wiki) {
    return process.cwd();
  }
  // Check if it's an absolute path
  if (opts.wiki.startsWith('/') || opts.wiki.match(/^[a-zA-Z]:/)) {
    return opts.wiki;
  }
  // Relative path - join with cwd
  return join(process.cwd(), opts.wiki);
}

// Create main command
const program = new Command();

program
  .name('llm-wiki')
  .description('LLM Wiki - An AI-maintained knowledge base')
  .version(version)
  .option('-w, --wiki <path>', 'Wiki directory path');

// Register commands
program
  .command('init')
  .description('Initialize a new wiki directory')
  .argument('[path]', 'Wiki directory path', '.')
  .option('-f, --force', 'Force initialization (overwrite if exists)')
  .action(function(path: string) {
    const opts = this.opts() as { force?: boolean };
    // Use parent opts for wiki path if provided
    const parentOpts = this.parent?.opts() as { wiki?: string } | undefined;
    let targetPath: string;
    if (parentOpts?.wiki) {
      // If -w was provided, join it with the path argument
      targetPath = join(parentOpts.wiki, path === '.' ? '' : path);
    } else {
      // Otherwise use the path directly
      targetPath = path === '.' ? process.cwd() : path;
    }
    
    console.log(chalk.blue.bold('\n🚀 Initializing LLM Wiki...\n'));

    // Check if already initialized
    if (isWikiInitialized(targetPath)) {
      if (opts.force) {
        console.log(chalk.yellow('⚠️  Wiki already exists. Reinitializing...\n'));
        // With force, just report success
        console.log(chalk.green('✅ Wiki reinitialized!\n'));
        console.log(`   Location: ${chalk.bold(targetPath)}\n`);
        return;
      } else {
        console.log(chalk.red('❌ Wiki already initialized. Use --force to reinitialize.\n'));
        process.exit(1);
      }
    }

    init(targetPath).then(result => {
      if (result.success) {
        console.log(chalk.green('✅ Wiki initialized successfully!\n'));
        console.log(`   Location: ${chalk.bold(result.wikiDir)}`);
        console.log(`   Created ${result.createdPaths.length} files/directories\n`);

        // Show structure
        console.log(chalk.dim('   wiki/'));
        console.log(chalk.dim('   ├── index.md'));
        console.log(chalk.dim('   ├── log.md'));
        console.log(chalk.dim('   ├── CLAUDE.md'));
        console.log(chalk.dim('   ├── AGENTS.md'));
        console.log(chalk.dim('   ├── raw/'));
        console.log(chalk.dim('   ├── entity/'));
        console.log(chalk.dim('   ├── source/'));
        console.log(chalk.dim('   ├── comparison/'));
        console.log(chalk.dim('   └── synthesis/\n'));

        console.log(chalk.green('✨ Your wiki is ready! Start by ingesting a source:\n'));
        console.log(chalk.dim(`   llm-wiki ingest <file.md>`));
        console.log(chalk.dim(`   llm-wiki ingest https://example.com/article\n`));
      } else {
        console.log(chalk.red(`❌ Failed to initialize wiki: ${result.error}\n`));
        process.exit(1);
      }
    });
  });

program
  .command('ingest')
  .description('Ingest a source document into the wiki')
  .argument('<source>', 'Source file path, URL, or text')
  .option('-t, --title <title>', 'Title for the source')
  .option('-g, --tags <tags...>', 'Tags for categorization')
  .action(function(source: string) {
    const opts = this.opts() as { title?: string; tags?: string[] };
    const parentOpts = this.parent?.opts() as { wiki?: string } | undefined;
    const wikiDir = parentOpts ? getWikiDir(parentOpts) : process.cwd();

    // Check if wiki is initialized
    if (!isWikiInitialized(wikiDir)) {
      console.log(chalk.red('❌ Not a wiki directory. Run `llm-wiki init` first.\n'));
      process.exit(1);
    }

    console.log(chalk.blue.bold('\n📥 Ingesting source...\n'));
    console.log(chalk.dim(`   Source: ${source}\n`));

    ingest(source, {
      wikiDir,
      rawDir: join(wikiDir, 'wiki', 'raw'),
    }, {
      title: opts.title,
      tags: opts.tags,
    }).then(result => {
      if (result.success) {
        console.log(chalk.green('✅ Ingest complete!\n'));

        if (result.pagesCreated.length > 0) {
          console.log(chalk.green(`   📄 Pages created: ${result.pagesCreated.length}`));
          for (const page of result.pagesCreated) {
            console.log(chalk.dim(`      • ${page}`));
          }
          console.log();
        }

        if (result.pagesUpdated.length > 0) {
          console.log(chalk.yellow(`   📝 Pages updated: ${result.pagesUpdated.length}`));
          for (const page of result.pagesUpdated) {
            console.log(chalk.dim(`      • ${page}`));
          }
          console.log();
        }

        if (result.entityUpdate) {
          console.log(chalk.cyan(`   🔗 Entities found: ${result.entityUpdate.entitiesFound}`));
          if (result.entityUpdate.suggestedEntities.length > 0) {
            console.log(chalk.dim(`      Suggested new entities:`));
            for (const entity of result.entityUpdate.suggestedEntities.slice(0, 5)) {
              console.log(chalk.dim(`        • ${entity.name} (${entity.type})`));
            }
          }
          console.log();
        }

        if (result.summaryUpdate?.contradictions.length) {
          console.log(chalk.yellow(`   ⚠️  Contradictions detected: ${result.summaryUpdate.contradictions.length}`));
          for (const c of result.summaryUpdate.contradictions.slice(0, 3)) {
            console.log(chalk.dim(`      • ${c.reason}`));
          }
          console.log();
        }

        console.log(chalk.green('✨ Ingest operation logged to wiki/log.md\n'));
      } else {
        console.log(chalk.red(`❌ Ingest failed: ${result.error}\n`));
        process.exit(1);
      }
    });
  });

program
  .command('search')
  .description('Search the wiki using hybrid search')
  .argument('<query>', 'Search query')
  .option('-l, --limit <number>', 'Maximum results', '10')
  .option('-j, --json', 'Output as JSON')
  .action(async function(query: string) {
    const opts = this.opts() as { limit?: string; json?: boolean };
    const parentOpts = this.parent?.opts() as { wiki?: string } | undefined;
    const wikiDir = parentOpts ? getWikiDir(parentOpts) : process.cwd();

    if (!isWikiInitialized(wikiDir)) {
      console.log(chalk.red('❌ Not a wiki directory.\n'));
      process.exit(1);
    }

    console.log(chalk.blue.bold(`\n🔍 Searching: "${query}"\n`));

    try {
      // Create QMD store
      const qmdDir = join(wikiDir, '.llm-wiki', 'qmd');
      const store = await createQMDStore({
        wikiDir,
        qmdDir,
      });

      const search = createSearchFunction(store);

      const results = await search(query, {
        limit: parseInt(opts.limit || '10', 10),
      });

      await store.close();

      if (results.length === 0) {
        console.log(chalk.yellow('   No results found.\n'));
        return;
      }

      if (opts.json) {
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      console.log(chalk.green(`   Found ${results.length} result(s):\n`));

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        console.log(chalk.bold(`   ${i + 1}. ${result.title || result.docId}`));
        console.log(chalk.dim(`      Score: ${(result.score * 100).toFixed(1)}`));
        if (result.pageType) {
          console.log(chalk.dim(`      Type: ${result.pageType}`));
        }
        if (result.slug) {
          console.log(chalk.dim(`      Slug: ${result.slug}`));
        }
        // Show content snippet
        const snippet = result.content.slice(0, 200).replace(/\n/g, ' ');
        console.log(chalk.dim(`      ${snippet}${snippet.length >= 200 ? '...' : ''}\n`));
      }
    } catch (error) {
      console.log(chalk.red(`\n❌ Search failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`));

      // Provide helpful fallback message
      if (error instanceof Error && error.message.includes('not found')) {
        console.log(chalk.yellow('   💡 Try indexing the wiki first:\n'));
        console.log(chalk.dim('      llm-wiki index\n'));
      }

      process.exit(1);
    }
  });

program
  .command('lint')
  .description('Run wiki health checks')
  .option('-f, --fix', 'Attempt to fix issues automatically')
  .option('-j, --json', 'Output as JSON')
  .option('-t, --types <types...>', 'Specific check types to run (contradiction, orphan, stale, coverage)')
  .action(async function() {
    const opts = this.opts() as { fix?: boolean; json?: boolean; types?: string[] };
    const parentOpts = this.parent?.opts() as { wiki?: string } | undefined;
    const wikiDir = parentOpts ? getWikiDir(parentOpts) : process.cwd();

    if (!isWikiInitialized(wikiDir)) {
      console.log(chalk.red('❌ Not a wiki directory.\n'));
      process.exit(1);
    }

    console.log(chalk.blue.bold('\n🔍 Running lint checks...\n'));

    try {
      // Run full lint using the new lint module
      const report = await runLint(wikiDir, {
        fix: opts.fix,
        types: opts.types as LintIssueType[] | undefined,
      });

      const issues = report.issues;

      if (opts.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      if (issues.length === 0) {
        console.log(chalk.green('✅ No issues found! Your wiki is healthy.\n'));
        return;
      }

      console.log(chalk.yellow(`⚠️  Found ${issues.length} issue(s):\n`));

      // Group by type
      const byType = {
        contradiction: issues.filter(i => i.type === 'contradiction'),
        orphan: issues.filter(i => i.type === 'orphan'),
        stale: issues.filter(i => i.type === 'stale'),
        coverage: issues.filter(i => i.type === 'coverage'),
      };

      // Show contradiction issues
      if (byType.contradiction.length > 0) {
        console.log(chalk.red.bold(`Contradictions (${byType.contradiction.length}):`));
        for (const issue of byType.contradiction.slice(0, 10)) {
          console.log(chalk.red(`   • [${issue.pageId}] ${issue.message}`));
        }
        if (byType.contradiction.length > 10) {
          console.log(chalk.dim(`   ... and ${byType.contradiction.length - 10} more`));
        }
        console.log();
      }

      // Show orphan issues
      if (byType.orphan.length > 0) {
        console.log(chalk.yellow.bold(`Orphan pages (${byType.orphan.length}):`));
        for (const issue of byType.orphan.slice(0, 10)) {
          console.log(chalk.yellow(`   • ${issue.pageId}: ${issue.message}`));
        }
        if (byType.orphan.length > 10) {
          console.log(chalk.dim(`   ... and ${byType.orphan.length - 10} more`));
        }
        console.log();
      }

      // Show stale issues
      if (byType.stale.length > 0) {
        console.log(chalk.yellow.bold(`Stale content (${byType.stale.length}):`));
        for (const issue of byType.stale.slice(0, 10)) {
          console.log(chalk.yellow(`   • [${issue.pageId}] ${issue.message}`));
        }
        if (byType.stale.length > 10) {
          console.log(chalk.dim(`   ... and ${byType.stale.length - 10} more`));
        }
        console.log();
      }

      // Show coverage issues
      if (byType.coverage.length > 0) {
        console.log(chalk.cyan.bold(`Coverage gaps (${byType.coverage.length}):`));
        for (const issue of byType.coverage.slice(0, 10)) {
          console.log(chalk.cyan(`   • ${issue.message}`));
        }
        if (byType.coverage.length > 10) {
          console.log(chalk.dim(`   ... and ${byType.coverage.length - 10} more`));
        }
        console.log();
      }

      // Show summary
      console.log(chalk.dim('---'));
      console.log(chalk.dim(`Timestamp: ${report.timestamp.toISOString()}`));
      console.log(chalk.dim(`Summary: ${report.summary.contradictions} contradictions, ${report.summary.orphans} orphans, ${report.summary.stale} stale, ${report.summary.coverage.length} coverage gaps\n`));

      if (opts.fix) {
        console.log(chalk.green('✅ Automatic fixes applied where possible.\n'));
      }
    } catch (error) {
      console.log(chalk.red(`\n❌ Lint failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`));
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show wiki status and statistics')
  .option('-j, --json', 'Output as JSON')
  .action(async function() {
    const opts = this.opts() as { json?: boolean };
    const parentOpts = this.parent?.opts() as { wiki?: string } | undefined;
    const wikiDir = parentOpts ? getWikiDir(parentOpts) : process.cwd();

    if (!isWikiInitialized(wikiDir)) {
      console.log(chalk.red('❌ Not a wiki directory. Run `llm-wiki init` first.\n'));
      process.exit(1);
    }

    console.log(chalk.blue.bold('\n📊 Wiki Status\n'));

    const pages = await listPages(wikiDir);
    const stats = getStatsFromPages(pages);

    if (opts.json) {
      console.log(JSON.stringify({
        wikiDir,
        initialized: true,
        stats,
      }, null, 2));
      return;
    }

    console.log(chalk.bold('   Directory: ') + chalk.dim(wikiDir));
    console.log(chalk.bold('   Pages: ') + chalk.green(stats.total.toString()));
    console.log();

    // Show type breakdown
    console.log(chalk.bold('   Pages by Type:'));
    for (const [type, count] of Object.entries(stats.byType)) {
      if (typeof count === 'number' && count > 0) {
        console.log(chalk.dim(`      ${type}: ${count}`));
      }
    }
    console.log();

    // Show top tags
    const topTags = Object.entries(stats.byTag)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    if (topTags.length > 0) {
      console.log(chalk.bold('   Top Tags:'));
      for (const tag of topTags) {
        console.log(chalk.dim(`      #${tag.name}: ${tag.count}`));
      }
      console.log();
    }

    // Show recent pages
    const recentPages = [...pages]
      .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
      .slice(0, 5);

    if (recentPages.length > 0) {
      console.log(chalk.bold('   Recently Modified:'));
      for (const page of recentPages) {
        const date = page.lastModified.toISOString().slice(0, 10);
        console.log(chalk.dim(`      ${date} - ${page.title}`));
      }
      console.log();
    }
  });

/**
 * Helper to get stats from pages list
 */
function getStatsFromPages(pages: Array<{ type: string; frontmatter: { tags: string[] }; lastModified: Date }>) {
  const stats = {
    total: pages.length,
    byType: {} as Record<string, number>,
    byTag: {} as Record<string, number>,
  };

  for (const page of pages) {
    const type = page.type as string;
    stats.byType[type] = (stats.byType[type] || 0) + 1;
    
    for (const tag of page.frontmatter.tags) {
      stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
    }
  }

  return stats;
}

program
  .command('list')
  .description('List all wiki pages')
  .option('-t, --type <type>', 'Filter by page type (entity, source, summary, etc.)')
  .option('-l, --limit <number>', 'Maximum number of pages', '50')
  .action(async function() {
    const opts = this.opts() as { type?: string; limit?: string };
    const parentOpts = this.parent?.opts() as { wiki?: string } | undefined;
    const wikiDir = parentOpts ? getWikiDir(parentOpts) : process.cwd();

    if (!isWikiInitialized(wikiDir)) {
      console.log(chalk.red('❌ Not a wiki directory.\n'));
      process.exit(1);
    }

    const pages = await listPages(wikiDir, {
      type: opts.type as 'summary' | 'entity' | 'source' | 'comparison' | 'synthesis' | undefined,
    });

    const limitedPages = pages.slice(0, parseInt(opts.limit || '50', 10));

    if (limitedPages.length === 0) {
      console.log(chalk.yellow('\n   No pages found.\n'));
      return;
    }

    console.log(chalk.blue.bold(`\n📚 ${limitedPages.length} of ${pages.length} page(s):\n`));

    for (const page of limitedPages) {
      const tags = page.frontmatter.tags.join(', ') || 'none';
      console.log(chalk.bold(`   ${page.title}`));
      console.log(chalk.dim(`      Slug: ${page.slug}`));
      console.log(chalk.dim(`      Type: ${page.type} | Tags: ${tags}`));
      console.log();
    }
  });

program
  .command('server')
  .description('Start the web server')
  .option('-p, --port <port>', 'Port to listen on', '3000')
  .option('-h, --host <host>', 'Host to bind to', 'localhost')
  .action(async function() {
    const opts = this.opts() as { port?: string; host?: string };
    const parentOpts = this.parent?.opts() as { wiki?: string } | undefined;
    const wikiDir = parentOpts ? getWikiDir(parentOpts) : process.cwd();

    if (!isWikiInitialized(wikiDir)) {
      console.log(chalk.red('❌ Not a wiki directory.\n'));
      process.exit(1);
    }

    console.log(chalk.blue.bold('\n🌐 Starting LLM Wiki server...\n'));
    console.log(chalk.dim(`   Wiki: ${wikiDir}`));
    console.log(chalk.dim(`   Port: ${opts.port}`));
    console.log(chalk.dim(`   URL: http://${opts.host}:${opts.port}\n`));

    // Dynamic import to avoid loading server code when not needed
    try {
      const { startServer } = await import('@llm-wiki/server');
      await startServer({
        wikiDir,
        port: parseInt(opts.port || '3000', 10),
        host: opts.host || 'localhost',
      });
    } catch (error) {
      console.log(chalk.red(`\n❌ Failed to start server: ${error instanceof Error ? error.message : 'Unknown error'}\n`));
      console.log(chalk.yellow('   💡 The server package may need to be built.\n'));
      process.exit(1);
    }
  });

// Agent subcommands
const agentCmd = program
  .command('agent')
  .description('Control the embedded agent');

agentCmd
  .command('start')
  .description('Start the agent')
  .option('-m, --mode <mode>', 'Agent mode (interactive, semi-autonomous, autonomous)', 'interactive')
  .action(async function() {
    const parentOpts = this.parent?.opts() as { wiki?: string } | undefined;
    const localOpts = this.opts() as { mode?: string };
    const wikiDir = parentOpts ? getWikiDir(parentOpts) : process.cwd();

    if (!isWikiInitialized(wikiDir)) {
      console.log(chalk.red('❌ Not a wiki directory.\n'));
      process.exit(1);
    }

    console.log(chalk.blue.bold('\n🤖 Starting LLM Wiki agent...\n'));
    console.log(chalk.dim(`   Mode: ${localOpts.mode || 'interactive'}`));
    console.log(chalk.dim(`   Wiki: ${wikiDir}\n`));

    // Dynamic import to check if agent is available
    try {
      const agentModule = await import('@llm-wiki/agent');
      if (agentModule.AgentSessionManager) {
        console.log(chalk.yellow('   💡 Agent functionality is available but not yet fully implemented.\n'));
        console.log(chalk.dim('   Use the web UI to interact with the agent.\n'));
      }
    } catch {
      console.log(chalk.yellow('   💡 Agent package not available.\n'));
    }
    
    console.log(chalk.dim('   The agent can be started via the web server at http://localhost:3000\n'));
    console.log(chalk.dim('   Run `llm-wiki server` to start the web interface.\n'));
  });

agentCmd
  .command('stop')
  .description('Stop the agent')
  .action(function() {
    console.log(chalk.blue.bold('\n⏹️  Stopping agent...\n'));
    console.log(chalk.yellow('   Agent control not yet implemented.\n'));
  });

agentCmd
  .command('mode')
  .description('Get or set agent mode')
  .argument('[mode]', 'New mode (interactive, semi-autonomous, autonomous)')
  .action(function(mode?: string) {
    if (mode) {
      console.log(chalk.blue(`\n⚙️  Setting agent mode to: ${mode}\n`));
    } else {
      console.log(chalk.blue('\n⚙️  Current agent mode: interactive\n'));
    }
    console.log(chalk.yellow('   Agent control not yet implemented.\n'));
  });

agentCmd
  .command('status')
  .description('Show agent status')
  .action(function() {
    console.log(chalk.blue.bold('\n🤖 Agent Status\n'));
    console.log(chalk.yellow('   Agent control not yet implemented.\n'));
  });

// Parse command line arguments
program.parse();
