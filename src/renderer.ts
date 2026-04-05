import chalk from 'chalk';
import type { AnalysisResult, CleanResult, SystemDfEntry } from './types.js';

function padEnd(str: string, len: number): string {
  return str.length >= len ? str : str + ' '.repeat(len - str.length);
}

function padStart(str: string, len: number): string {
  return str.length >= len ? str : ' '.repeat(len - str.length) + str;
}

function separator(width = 60): string {
  return chalk.dim('─'.repeat(width));
}

export function renderAnalysis(analysis: AnalysisResult, olderThan?: string): void {
  console.log();
  console.log(chalk.bold.cyan('  Docker Disk Usage Analysis'));
  if (olderThan) {
    console.log(chalk.dim(`  Filtered: items older than ${olderThan}`));
  }
  console.log(separator());

  renderSystemDf(analysis.systemDf);

  console.log();
  console.log(chalk.bold('  Reclaimable Resources'));
  console.log(separator());

  if (analysis.containers.length > 0) {
    console.log(chalk.yellow(`  Stopped containers: ${analysis.containers.length}`));
    for (const c of analysis.containers.slice(0, 5)) {
      console.log(chalk.dim(`    • ${c.Names || c.ID}  ${c.Status}`));
    }
    if (analysis.containers.length > 5) {
      console.log(chalk.dim(`    ... and ${analysis.containers.length - 5} more`));
    }
  } else {
    console.log(chalk.green('  Stopped containers: none'));
  }

  console.log();
  if (analysis.images.length > 0) {
    console.log(chalk.yellow(`  Dangling images: ${analysis.images.length}`));
    for (const img of analysis.images.slice(0, 5)) {
      console.log(chalk.dim(`    • ${img.ID.substring(7, 19)}  ${img.Size}`));
    }
    if (analysis.images.length > 5) {
      console.log(chalk.dim(`    ... and ${analysis.images.length - 5} more`));
    }
  } else {
    console.log(chalk.green('  Dangling images: none'));
  }

  console.log();
  if (analysis.volumes.length > 0) {
    console.log(chalk.yellow(`  Unused volumes: ${analysis.volumes.length}`));
    for (const v of analysis.volumes.slice(0, 5)) {
      console.log(chalk.dim(`    • ${v.Name}`));
    }
    if (analysis.volumes.length > 5) {
      console.log(chalk.dim(`    ... and ${analysis.volumes.length - 5} more`));
    }
  } else {
    console.log(chalk.green('  Unused volumes: none'));
  }

  console.log();
  if (analysis.networks.length > 0) {
    console.log(chalk.yellow(`  Custom networks: ${analysis.networks.length}`));
    for (const n of analysis.networks.slice(0, 5)) {
      console.log(chalk.dim(`    • ${n.Name}  (${n.Driver})`));
    }
  } else {
    console.log(chalk.green('  Custom networks: none'));
  }

  console.log();
  console.log(separator());
  const hasAnything =
    analysis.images.length > 0 ||
    analysis.containers.length > 0 ||
    analysis.volumes.length > 0 ||
    analysis.networks.length > 0;

  if (hasAnything) {
    console.log(
      chalk.bold(`  Total reclaimable: `) + chalk.bold.yellow(analysis.totalReclaimable),
    );
    console.log();
    console.log(chalk.dim('  Run with --clean to remove safe-to-clean items.'));
    console.log(chalk.dim('  Run with --all to also prune build cache.'));
  } else {
    console.log(chalk.bold.green('  Nothing to clean — Docker is tidy!'));
  }
  console.log();
}

function renderSystemDf(entries: SystemDfEntry[]): void {
  if (entries.length === 0) return;

  const header = [
    padEnd('  Type', 16),
    padStart('Total', 7),
    padStart('Active', 8),
    padStart('Size', 10),
    padStart('Reclaimable', 14),
  ].join('');

  console.log(chalk.bold(header));

  for (const e of entries) {
    const line = [
      padEnd(`  ${e.Type}`, 16),
      chalk.dim(padStart(String(e.Total), 7)),
      chalk.dim(padStart(String(e.Active), 8)),
      padStart(e.Size, 10),
      chalk.yellow(padStart(e.Reclaimable, 14)),
    ].join('');
    console.log(line);
  }
}

export function renderCleanResult(result: CleanResult): void {
  console.log();

  if (result.dryRun) {
    console.log(chalk.bold.cyan('  Dry Run — nothing was deleted'));
    console.log(separator());
  } else {
    console.log(chalk.bold.green('  Cleanup Complete'));
    console.log(separator());
  }

  const prefix = result.dryRun ? chalk.dim('  Would remove') : chalk.green('  Removed');

  if (result.removedContainers.length > 0) {
    console.log(`${prefix} ${chalk.bold(result.removedContainers.length)} container(s)`);
    for (const id of result.removedContainers) {
      console.log(chalk.dim(`    • ${id}`));
    }
  }
  if (result.removedImages.length > 0) {
    console.log(`${prefix} ${chalk.bold(result.removedImages.length)} image(s)`);
    for (const id of result.removedImages) {
      console.log(chalk.dim(`    • ${id}`));
    }
  }
  if (result.removedVolumes.length > 0) {
    console.log(`${prefix} ${chalk.bold(result.removedVolumes.length)} volume(s)`);
    for (const name of result.removedVolumes) {
      console.log(chalk.dim(`    • ${name}`));
    }
  }
  if (result.removedNetworks.length > 0) {
    console.log(`${prefix} ${chalk.bold(result.removedNetworks.length)} network(s)`);
    for (const id of result.removedNetworks) {
      console.log(chalk.dim(`    • ${id}`));
    }
  }

  const totalItems =
    result.removedContainers.length +
    result.removedImages.length +
    result.removedVolumes.length +
    result.removedNetworks.length;

  if (totalItems === 0) {
    console.log(chalk.green('  Nothing to remove.'));
  }

  if (result.errors.length > 0) {
    console.log();
    console.log(chalk.red('  Errors:'));
    for (const err of result.errors) {
      console.log(chalk.red(`    • ${err}`));
    }
  }

  if (result.dryRun && totalItems > 0) {
    console.log();
    console.log(chalk.dim('  Pass --clean (without --dry-run) to actually delete.'));
  }

  console.log();
}

export function renderError(msg: string): void {
  console.error(chalk.red(`\n  Error: ${msg}\n`));
}
