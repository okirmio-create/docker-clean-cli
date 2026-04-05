#!/usr/bin/env node
import { Command } from 'commander';
import { analyze } from './analyzer.js';
import { clean } from './cleaner.js';
import { renderAnalysis, renderCleanResult, renderError } from './renderer.js';
import { isDockerAvailable } from './docker.js';
import type { CleanOptions } from './types.js';

const program = new Command();

program
  .name('docker-clean-cli')
  .description('Smart Docker cleanup tool — analyze and reclaim disk space')
  .version('1.0.0')
  .option('--clean', 'Remove all safe-to-clean items (containers, dangling images, unused volumes/networks)')
  .option('--images', 'Clean only dangling images')
  .option('--containers', 'Clean only stopped containers')
  .option('--volumes', 'Clean only unused volumes')
  .option('--networks', 'Clean only unused networks')
  .option('--all', 'Clean everything including build cache')
  .option('--older-than <age>', 'Only clean items older than specified age (e.g. 7d, 24h, 2w)')
  .option('--dry-run', 'Show what would be cleaned without deleting (default when no action flags)')
  .option('--force', 'Alias for --clean, skip dry-run mode')
  .option('--json', 'Output results as JSON');

program.parse(process.argv);

const opts = program.opts<{
  clean?: boolean;
  images?: boolean;
  containers?: boolean;
  volumes?: boolean;
  networks?: boolean;
  all?: boolean;
  olderThan?: string;
  dryRun?: boolean;
  force?: boolean;
  json?: boolean;
}>();

async function main(): Promise<void> {
  if (!isDockerAvailable()) {
    renderError('Docker is not running or not installed. Please start Docker and try again.');
    process.exit(1);
  }

  const isCleanAction =
    opts.clean || opts.images || opts.containers || opts.volumes || opts.networks || opts.all || opts.force;

  const dryRun = !isCleanAction || !!opts.dryRun;

  const cleanOptions: CleanOptions = {
    images: !!(opts.images || opts.all || opts.clean || opts.force),
    containers: !!(opts.containers || opts.all || opts.clean || opts.force),
    volumes: !!(opts.volumes || opts.all || opts.clean || opts.force),
    networks: !!(opts.networks || opts.all),
    buildCache: !!opts.all,
    all: !!opts.all,
    dryRun,
    olderThan: opts.olderThan,
    json: !!opts.json,
    force: !!(opts.force || opts.clean),
  };

  try {
    const analysis = await analyze(opts.olderThan);

    if (!isCleanAction) {
      // Analysis-only mode
      if (opts.json) {
        console.log(JSON.stringify(analysis, null, 2));
        return;
      }
      renderAnalysis(analysis, opts.olderThan);
      return;
    }

    const result = await clean(analysis, cleanOptions);

    if (opts.json) {
      console.log(JSON.stringify({ analysis, result }, null, 2));
      return;
    }

    if (dryRun) {
      renderAnalysis(analysis, opts.olderThan);
    }
    renderCleanResult(result);
  } catch (err) {
    renderError(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
