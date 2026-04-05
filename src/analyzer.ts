import {
  getDanglingImages,
  getStoppedContainers,
  getUnusedVolumes,
  getUnusedNetworks,
  getSystemDf,
} from './docker.js';
import type {
  AnalysisResult,
  DockerContainer,
  DockerImage,
  DockerNetwork,
  DockerVolume,
  ParsedAge,
} from './types.js';

export function parseOlderThan(value: string): ParsedAge {
  const match = value.match(/^(\d+)(d|h|m|w)$/i);
  if (!match) {
    throw new Error(`Invalid --older-than value: "${value}". Use format like 7d, 24h, 2w.`);
  }

  const amount = parseInt(match[1]!, 10);
  const unit = match[2]!.toLowerCase();

  let days: number;
  switch (unit) {
    case 'h':
      days = amount / 24;
      break;
    case 'd':
      days = amount;
      break;
    case 'w':
      days = amount * 7;
      break;
    case 'm':
      days = amount * 30;
      break;
    default:
      days = amount;
  }

  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return { days, cutoffDate };
}

function parseDockerDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  // Docker dates come in formats like "2024-01-15 10:23:45 +0000 UTC" or ISO 8601
  const cleaned = dateStr.replace(/ \+\d{4} UTC$/, 'Z').replace(' ', 'T');
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

function isOlderThan(dateStr: string, cutoff: Date): boolean {
  const date = parseDockerDate(dateStr);
  if (!date) return false;
  return date < cutoff;
}

export function filterByAge<T extends { CreatedAt?: string; createdAt?: string }>(
  items: T[],
  cutoff: Date,
): T[] {
  return items.filter((item) => {
    const dateStr = item.CreatedAt ?? item.createdAt ?? '';
    return isOlderThan(dateStr, cutoff);
  });
}

export async function analyze(olderThan?: string): Promise<AnalysisResult> {
  const cutoff = olderThan ? parseOlderThan(olderThan) : null;

  let images: DockerImage[] = getDanglingImages();
  let containers: DockerContainer[] = getStoppedContainers();
  let volumes: DockerVolume[] = getUnusedVolumes();
  let networks: DockerNetwork[] = getUnusedNetworks();

  if (cutoff) {
    images = filterByAge(images, cutoff.cutoffDate);
    containers = filterByAge(containers, cutoff.cutoffDate);
    volumes = filterByAge(volumes, cutoff.cutoffDate);
    networks = filterByAge(networks, cutoff.cutoffDate);
  }

  const systemDf = getSystemDf();

  const reclaimableParts: number[] = systemDf
    .map((entry) => {
      const match = entry.Reclaimable.match(/^([\d.]+)\s*(B|KB|MB|GB|TB)/i);
      if (!match) return 0;
      const val = parseFloat(match[1]!);
      const unit = match[2]!.toUpperCase();
      const multipliers: Record<string, number> = {
        B: 1,
        KB: 1024,
        MB: 1024 ** 2,
        GB: 1024 ** 3,
        TB: 1024 ** 4,
      };
      return val * (multipliers[unit] ?? 1);
    });

  const totalBytes = reclaimableParts.reduce((a, b) => a + b, 0);
  const totalReclaimable = formatBytes(totalBytes);

  return {
    images,
    containers,
    volumes,
    networks,
    systemDf,
    totalReclaimable,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)}MB`;
  if (bytes < 1024 ** 4) return `${(bytes / 1024 ** 3).toFixed(1)}GB`;
  return `${(bytes / 1024 ** 4).toFixed(1)}TB`;
}
