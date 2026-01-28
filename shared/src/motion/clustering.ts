/**
 * @file clustering.ts
 * @description Spatial clustering for group motion assignment.
 *
 * Implements radius-based clustering algorithm for grouping nearby pegs
 * so they can share motion with staggered phase offsets.
 */

import type { SlopegglePeg } from "../generator/slopeggle/types";

/**
 * Cluster of pegs that will share synchronized motion.
 */
export interface PegCluster {
  /** Unique cluster identifier */
  id: string;
  /** Pegs belonging to this cluster */
  pegs: SlopegglePeg[];
  /** Cluster center position (average of all peg positions) */
  centerX: number;
  centerY: number;
  /** Phase offset for the cluster (base phase for all pegs) */
  clusterPhase: number;
}

/**
 * Clustering configuration options.
 */
export interface ClusteringConfig {
  /** Maximum distance between pegs to be considered in the same cluster */
  clusterRadius: number;
  /** Minimum number of pegs to form a cluster */
  minClusterSize: number;
  /** Maximum number of pegs in a cluster before splitting */
  maxClusterSize: number;
  /** Optional: only cluster pegs of the same type (orange/blue) */
  sameTypeOnly: boolean;
}

/**
 * Default clustering configuration for Slopeggle.
 */
export const DEFAULT_CLUSTERING_CONFIG: ClusteringConfig = {
  clusterRadius: 2.0, // ~16x peg diameter, covers ~3-4 rows of pegs
  minClusterSize: 3,
  maxClusterSize: 12,
  sameTypeOnly: false,
};

/**
 * Find all pegs within a given radius of a position.
 */
function findNearbyPegs(
  pegs: SlopegglePeg[],
  centerX: number,
  centerY: number,
  radius: number,
  excludeIds: Set<number>
): SlopegglePeg[] {
  const nearby: SlopegglePeg[] = [];
  const radiusSquared = radius * radius;

  for (let i = 0; i < pegs.length; i++) {
    if (excludeIds.has(i)) continue;

    const peg = pegs[i];
    const dx = peg.x - centerX;
    const dy = peg.y - centerY;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared <= radiusSquared) {
      nearby.push(peg);
    }
  }

  return nearby;
}

/**
 * Calculate the center position of a group of pegs.
 */
function calculateClusterCenter(pegs: SlopegglePeg[]): { x: number; y: number } {
  if (pegs.length === 0) {
    return { x: 0, y: 0 };
  }

  let sumX = 0;
  let sumY = 0;

  for (const peg of pegs) {
    sumX += peg.x;
    sumY += peg.y;
  }

  return {
    x: sumX / pegs.length,
    y: sumY / pegs.length,
  };
}

/**
 * Simple spatial hash for efficient nearby peg lookup.
 */
function buildSpatialHash(
  pegs: SlopegglePeg[],
  cellSize: number
): Map<string, number[]> {
  const hash = new Map<string, number[]>();

  for (let i = 0; i < pegs.length; i++) {
    const peg = pegs[i];
    const cellX = Math.floor(peg.x / cellSize);
    const cellY = Math.floor(peg.y / cellSize);
    const key = `${cellX},${cellY}`;

    if (!hash.has(key)) {
      hash.set(key, []);
    }
    hash.get(key)!.push(i);
  }

  return hash;
}

/**
 * Get peg indices from nearby hash cells.
 */
function getNearbyFromHash(
  pegs: SlopegglePeg[],
  spatialHash: Map<string, number[]>,
  centerX: number,
  centerY: number,
  radius: number,
  excludeIds: Set<number>
): number[] {
  const cellSize = radius; // Use radius as cell size for efficiency
  const centerCellX = Math.floor(centerX / cellSize);
  const centerCellY = Math.floor(centerY / cellSize);
  const nearby: number[] = [];

  // Check 3x3 grid of cells around the center
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const key = `${centerCellX + dx},${centerCellY + dy}`;
      const cellPegs = spatialHash.get(key);

      if (cellPegs) {
        for (const idx of cellPegs) {
          if (excludeIds.has(idx)) continue;

          const peg = pegs[idx];
          const distX = peg.x - centerX;
          const distY = peg.y - centerY;
          const distanceSquared = distX * distX + distY * distY;

          if (distanceSquared <= radius * radius) {
            nearby.push(idx);
          }
        }
      }
    }
  }

  return nearby;
}

/**
 * Generate a deterministic phase offset based on position.
 *
 * Uses a simple hash function on coordinates to create a consistent
 * phase offset that doesn't require seeded RNG. This ensures that
 * the same peg always gets the same phase offset.
 */
export function positionToPhase(x: number, y: number, clusterPhase: number): number {
  // Use FNV-1a style hashing for position
  const scaledX = Math.floor(x * 1000);
  const scaledY = Math.floor(y * 1000);

  let hash = 2166136261 >>> 0;
  hash ^= scaledX;
  hash = Math.imul(hash, 16777619);
  hash ^= scaledY;
  hash = Math.imul(hash, 16777619);

  // Normalize to [0, 2π) and add cluster phase
  const normalizedPhase = ((hash >>> 0) / 4294967296) * Math.PI * 2;
  return (normalizedPhase + clusterPhase) % (Math.PI * 2);
}

/**
 * Cluster pegs using greedy algorithm with spatial optimization.
 *
 * Algorithm:
 * 1. Build spatial hash for efficient nearby lookup
 * 2. Iterate through unclustered pegs
 * 3. For each unclustered peg, find nearby pegs within clusterRadius
 * 4. If enough nearby pegs exist, form a cluster
 * 5. Otherwise, skip this peg (it will remain unclustered)
 */
export function clusterPegs(
  pegs: SlopegglePeg[],
  config: Partial<ClusteringConfig> = {}
): PegCluster[] {
  const fullConfig = { ...DEFAULT_CLUSTERING_CONFIG, ...config };

  if (pegs.length === 0) {
    return [];
  }

  // Build spatial hash for efficient lookup
  const spatialHash = buildSpatialHash(pegs, fullConfig.clusterRadius);

  const clusters: PegCluster[] = [];
  const clustered = new Set<number>();

  // Greedy clustering
  for (let i = 0; i < pegs.length; i++) {
    if (clustered.has(i)) continue;

    // Find nearby pegs using spatial hash
    const peg = pegs[i];
    const nearbyIndices = getNearbyFromHash(
      pegs,
      spatialHash,
      peg.x,
      peg.y,
      fullConfig.clusterRadius,
      clustered
    );

    // Filter by same type if configured
    let clusterPegs = nearbyIndices.map((idx) => pegs[idx]);
    if (fullConfig.sameTypeOnly) {
      clusterPegs = clusterPegs.filter((p) => p.isOrange === peg.isOrange);
    }

    // Check if we have enough pegs to form a cluster
    if (clusterPegs.length + 1 >= fullConfig.minClusterSize) {
      // Limit cluster size
      if (clusterPegs.length + 1 > fullConfig.maxClusterSize) {
        clusterPegs = clusterPegs.slice(0, fullConfig.maxClusterSize - 1);
      }

      // Mark all cluster pegs as clustered
      for (const clusterPeg of clusterPegs) {
        const clusterIdx = pegs.indexOf(clusterPeg);
        if (clusterIdx >= 0) {
          clustered.add(clusterIdx);
        }
      }
      clustered.add(i);

      // Calculate cluster center
      const allPegs = [peg, ...clusterPegs];
      const center = calculateClusterCenter(allPegs);

      // Generate cluster phase using center position
      const clusterPhase = ((center.x + center.y) * 0.5) % (Math.PI * 2);

      clusters.push({
        id: `cluster-${clusters.length}`,
        pegs: allPegs,
        centerX: center.x,
        centerY: center.y,
        clusterPhase,
      });
    }
  }

  return clusters;
}

/**
 * Get pegs that don't belong to any cluster.
 */
export function getUnclusteredPegs(
  pegs: SlopegglePeg[],
  clusters: PegCluster[]
): SlopegglePeg[] {
  const clusterPegSet = new Set<SlopegglePeg>();

  for (const cluster of clusters) {
    for (const peg of cluster.pegs) {
      clusterPegSet.add(peg);
    }
  }

  return pegs.filter((peg) => !clusterPegSet.has(peg));
}

/**
 * Calculate clustering statistics for analysis.
 */
export interface ClusteringStats {
  totalPegs: number;
  clusteredPegs: number;
  unclusteredPegs: number;
  clusterCount: number;
  averageClusterSize: number;
  largestClusterSize: number;
  smallestClusterSize: number;
}

export function getClusteringStats(
  pegs: SlopegglePeg[],
  clusters: PegCluster[]
): ClusteringStats {
  const clusterPegSet = new Set<SlopegglePeg>();

  for (const cluster of clusters) {
    for (const peg of cluster.pegs) {
      clusterPegSet.add(peg);
    }
  }

  const clusterSizes = clusters.map((c) => c.pegs.length);

  return {
    totalPegs: pegs.length,
    clusteredPegs: clusterPegSet.size,
    unclusteredPegs: pegs.length - clusterPegSet.size,
    clusterCount: clusters.length,
    averageClusterSize:
      clusters.length > 0
        ? clusterSizes.reduce((a, b) => a + b, 0) / clusters.length
        : 0,
    largestClusterSize: clusters.length > 0 ? Math.max(...clusterSizes) : 0,
    smallestClusterSize:
      clusters.length > 0 ? Math.min(...clusterSizes) : 0,
  };
}
