import {
  removeContainers,
  removeImages,
  removeNetworks,
  removeVolumes,
  pruneBuildCache,
} from './docker.js';
import type { AnalysisResult, CleanOptions, CleanResult } from './types.js';

export async function clean(
  analysis: AnalysisResult,
  opts: CleanOptions,
): Promise<CleanResult> {
  const result: CleanResult = {
    removedImages: [],
    removedContainers: [],
    removedVolumes: [],
    removedNetworks: [],
    errors: [],
    dryRun: opts.dryRun,
  };

  const shouldCleanImages = opts.all || opts.images;
  const shouldCleanContainers = opts.all || opts.containers;
  const shouldCleanVolumes = opts.all || opts.volumes;
  const shouldCleanNetworks = opts.all || opts.networks;
  const shouldCleanCache = opts.all || opts.buildCache;

  // Collect what would be cleaned
  if (shouldCleanContainers) {
    result.removedContainers = analysis.containers.map((c) => c.ID);
  }
  if (shouldCleanImages) {
    result.removedImages = analysis.images.map((i) => i.ID);
  }
  if (shouldCleanVolumes) {
    result.removedVolumes = analysis.volumes.map((v) => v.Name);
  }
  if (shouldCleanNetworks) {
    result.removedNetworks = analysis.networks.map((n) => n.ID);
  }

  if (opts.dryRun) {
    return result;
  }

  // Execute cleanup
  if (shouldCleanContainers && result.removedContainers.length > 0) {
    try {
      removeContainers(result.removedContainers);
    } catch (err) {
      result.errors.push(`Containers: ${String(err)}`);
      result.removedContainers = [];
    }
  }

  if (shouldCleanImages && result.removedImages.length > 0) {
    try {
      removeImages(result.removedImages);
    } catch (err) {
      result.errors.push(`Images: ${String(err)}`);
      result.removedImages = [];
    }
  }

  if (shouldCleanVolumes && result.removedVolumes.length > 0) {
    try {
      removeVolumes(result.removedVolumes);
    } catch (err) {
      result.errors.push(`Volumes: ${String(err)}`);
      result.removedVolumes = [];
    }
  }

  if (shouldCleanNetworks && result.removedNetworks.length > 0) {
    try {
      removeNetworks(result.removedNetworks);
    } catch (err) {
      result.errors.push(`Networks: ${String(err)}`);
      result.removedNetworks = [];
    }
  }

  if (shouldCleanCache) {
    try {
      pruneBuildCache();
    } catch (err) {
      result.errors.push(`Build cache: ${String(err)}`);
    }
  }

  return result;
}
