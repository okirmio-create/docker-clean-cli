export interface DockerImage {
  ID: string;
  Repository: string;
  Tag: string;
  CreatedAt: string;
  Size: string;
  Digest?: string;
}

export interface DockerContainer {
  ID: string;
  Names: string;
  Image: string;
  Status: string;
  CreatedAt: string;
  Size?: string;
  State?: string;
}

export interface DockerVolume {
  Name: string;
  Driver: string;
  Mountpoint: string;
  CreatedAt?: string;
  Size?: string;
  Labels?: string;
  Scope?: string;
  Links?: string;
}

export interface DockerNetwork {
  ID: string;
  Name: string;
  Driver: string;
  Scope: string;
  CreatedAt?: string;
  Labels?: string;
}

export interface SystemDfEntry {
  Type: string;
  Total: number;
  Active: number;
  Size: string;
  Reclaimable: string;
}

export interface AnalysisResult {
  images: DockerImage[];
  containers: DockerContainer[];
  volumes: DockerVolume[];
  networks: DockerNetwork[];
  systemDf: SystemDfEntry[];
  totalReclaimable: string;
}

export interface CleanOptions {
  images: boolean;
  containers: boolean;
  volumes: boolean;
  networks: boolean;
  buildCache: boolean;
  all: boolean;
  dryRun: boolean;
  olderThan?: string;
  json: boolean;
  force: boolean;
}

export interface CleanResult {
  removedImages: string[];
  removedContainers: string[];
  removedVolumes: string[];
  removedNetworks: string[];
  errors: string[];
  dryRun: boolean;
}

export interface ParsedAge {
  days: number;
  cutoffDate: Date;
}
