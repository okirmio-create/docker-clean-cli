import { execSync } from 'child_process';
import type {
  DockerImage,
  DockerContainer,
  DockerVolume,
  DockerNetwork,
  SystemDfEntry,
} from './types.js';

function exec(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (err: unknown) {
    const e = err as { stderr?: string; message?: string };
    throw new Error(e.stderr?.trim() || e.message || String(err));
  }
}

function parseJsonLines<T>(raw: string): T[] {
  if (!raw) return [];
  return raw
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line) as T;
      } catch {
        return null;
      }
    })
    .filter((item): item is T => item !== null);
}

export function getDanglingImages(): DockerImage[] {
  const raw = exec('docker images -f dangling=true --format "{{json .}}"');
  return parseJsonLines<DockerImage>(raw);
}

export function getStoppedContainers(): DockerContainer[] {
  const raw = exec('docker ps -a --filter status=exited --filter status=created --format "{{json .}}"');
  return parseJsonLines<DockerContainer>(raw);
}

export function getUnusedVolumes(): DockerVolume[] {
  const raw = exec('docker volume ls -f dangling=true --format "{{json .}}"');
  return parseJsonLines<DockerVolume>(raw);
}

const DEFAULT_NETWORKS = new Set(['bridge', 'host', 'none']);

export function getUnusedNetworks(): DockerNetwork[] {
  const raw = exec('docker network ls --format "{{json .}}"');
  const all = parseJsonLines<DockerNetwork>(raw);
  return all.filter((n) => !DEFAULT_NETWORKS.has(n.Name));
}

export interface RawSystemDf {
  Images: {
    TotalCount: number;
    Active: number;
    Reclaimable: string;
    TotalSize: string;
  };
  Containers: {
    TotalCount: number;
    Active: number;
    Reclaimable: string;
    TotalSize: string;
  };
  Volumes: {
    TotalCount: number;
    Active: number;
    Reclaimable: string;
    TotalSize: string;
  };
  BuildCache: {
    TotalCount: number;
    Active: number;
    Reclaimable: string;
    TotalSize: string;
  };
}

export function getSystemDf(): SystemDfEntry[] {
  const raw = exec('docker system df --format "{{json .}}"');
  const entries = parseJsonLines<Record<string, unknown>>(raw);

  // docker system df --format json outputs one JSON per line for each type
  if (entries.length > 0) {
    return entries.map((e) => ({
      Type: String(e.Type ?? e.type ?? ''),
      Total: Number(e.TotalCount ?? e.Total ?? 0),
      Active: Number(e.Active ?? e.active ?? 0),
      Size: String(e.TotalSize ?? e.Size ?? '0B'),
      Reclaimable: String(e.Reclaimable ?? e.reclaimable ?? '0B'),
    }));
  }

  // Fallback: parse text output
  const text = exec('docker system df');
  return parseSystemDfText(text);
}

function parseSystemDfText(text: string): SystemDfEntry[] {
  const lines = text.split('\n').filter((l) => l.trim());
  const result: SystemDfEntry[] = [];

  for (const line of lines.slice(1)) {
    const parts = line.split(/\s{2,}/);
    if (parts.length >= 4) {
      result.push({
        Type: parts[0]?.trim() ?? '',
        Total: parseInt(parts[1] ?? '0', 10) || 0,
        Active: parseInt(parts[2] ?? '0', 10) || 0,
        Size: parts[3]?.trim() ?? '0B',
        Reclaimable: parts[4]?.trim() ?? '0B',
      });
    }
  }

  return result;
}

export function removeContainers(ids: string[]): void {
  if (ids.length === 0) return;
  exec(`docker rm ${ids.join(' ')}`);
}

export function removeImages(ids: string[]): void {
  if (ids.length === 0) return;
  exec(`docker rmi ${ids.join(' ')}`);
}

export function removeVolumes(names: string[]): void {
  if (names.length === 0) return;
  exec(`docker volume rm ${names.join(' ')}`);
}

export function removeNetworks(names: string[]): void {
  if (names.length === 0) return;
  exec(`docker network rm ${names.join(' ')}`);
}

export function pruneBuildCache(): string {
  return exec('docker builder prune -f');
}

export function isDockerAvailable(): boolean {
  try {
    execSync('docker info', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}
