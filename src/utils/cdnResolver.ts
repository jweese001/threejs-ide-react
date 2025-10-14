/**
 * CDN Resolver Utility
 * Maps package names to CDN URLs with version resolution
 */

import { ImportStatement, normalizePackageName } from './importParser';

export interface CDNConfig {
  primary: 'jsdelivr' | 'skypack' | 'unpkg' | 'esm.sh';
  fallbacks: Array<'jsdelivr' | 'skypack' | 'unpkg' | 'esm.sh'>;
}

export interface ResolvedImport {
  packageName: string;
  url: string;
  version: string;
  cdn: string;
  originalSource: string;
}

/**
 * Default CDN configuration
 * Primary: Skypack (auto-resolves versions, optimized for browsers)
 * Fallbacks: unpkg, esm.sh
 */
export const DEFAULT_CDN_CONFIG: CDNConfig = {
  primary: 'skypack',
  fallbacks: ['unpkg', 'esm.sh'],
};

/**
 * Packages that should always use the IDE's bundled version
 */
const BUNDLED_PACKAGES = new Set(['three', 'three/addons']);

/**
 * Resolve a single import statement to a CDN URL
 * @param importStmt - Parsed import statement
 * @param config - CDN configuration
 * @returns Resolved import with CDN URL
 */
export async function resolveCDN(
  importStmt: ImportStatement,
  config: CDNConfig = DEFAULT_CDN_CONFIG
): Promise<ResolvedImport> {
  const packageName = normalizePackageName(importStmt.source);

  // Handle Three.js specially - use IDE's bundled version
  if (packageName === 'three' || packageName.startsWith('three/')) {
    return {
      packageName: packageName,  // Use normalized package name, not original source
      url: '<use-existing-importmap>',
      version: '0.157.0',
      cdn: 'jsdelivr',
      originalSource: importStmt.source,
    };
  }

  // If already a full URL, normalize it
  if (importStmt.isUrl) {
    return normalizeUrlImport(importStmt);
  }

  // Resolve from CDN
  return resolveFromCDN(importStmt.source, config, importStmt.version);
}

/**
 * Normalize a URL import to standard format
 */
function normalizeUrlImport(importStmt: ImportStatement): ResolvedImport {
  const packageName = normalizePackageName(importStmt.source);
  const detectedCdn = detectCDN(importStmt.source);

  return {
    packageName,
    url: importStmt.source,
    version: importStmt.version || 'latest',
    cdn: detectedCdn,
    originalSource: importStmt.source,
  };
}

/**
 * Detect which CDN a URL is from
 */
function detectCDN(url: string): string {
  if (url.includes('cdn.skypack.dev')) return 'skypack';
  if (url.includes('unpkg.com')) return 'unpkg';
  if (url.includes('cdn.jsdelivr.net')) return 'jsdelivr';
  if (url.includes('esm.sh')) return 'esm.sh';
  return 'unknown';
}

/**
 * Resolve package from CDN
 */
async function resolveFromCDN(
  packageName: string,
  config: CDNConfig,
  requestedVersion?: string
): Promise<ResolvedImport> {
  const version = requestedVersion || 'latest';

  // Build URL based on primary CDN
  const url = buildCdnUrl(packageName, version, config.primary);

  return {
    packageName,
    url,
    version,
    cdn: config.primary,
    originalSource: packageName,
  };
}

/**
 * Build CDN URL for package
 */
function buildCdnUrl(packageName: string, version: string, cdn: string): string {
  const versionStr = version === 'latest' ? '' : `@${version}`;

  switch (cdn) {
    case 'skypack':
      return `https://cdn.skypack.dev/${packageName}${versionStr}`;

    case 'unpkg':
      return `https://unpkg.com/${packageName}${versionStr}`;

    case 'jsdelivr':
      return `https://cdn.jsdelivr.net/npm/${packageName}${versionStr}`;

    case 'esm.sh':
      return `https://esm.sh/${packageName}${versionStr}`;

    default:
      // Default to Skypack
      return `https://cdn.skypack.dev/${packageName}${versionStr}`;
  }
}

/**
 * Resolve multiple imports
 */
export async function resolveImports(
  imports: ImportStatement[],
  config: CDNConfig = DEFAULT_CDN_CONFIG
): Promise<ResolvedImport[]> {
  const resolved: ResolvedImport[] = [];

  for (const importStmt of imports) {
    try {
      const resolvedImport = await resolveCDN(importStmt, config);
      resolved.push(resolvedImport);
    } catch (error) {
      console.error(`Failed to resolve import: ${importStmt.source}`, error);
      // Add placeholder for failed resolution
      resolved.push({
        packageName: importStmt.source,
        url: '<resolution-failed>',
        version: 'unknown',
        cdn: 'none',
        originalSource: importStmt.source,
      });
    }
  }

  return resolved;
}

/**
 * Check for version conflicts
 * Returns array of warnings for packages with conflicting versions
 */
export function checkVersionConflicts(resolved: ResolvedImport[]): string[] {
  const warnings: string[] = [];
  const packageVersions = new Map<string, Set<string>>();

  for (const resolvedImport of resolved) {
    const pkg = resolvedImport.packageName;
    if (!packageVersions.has(pkg)) {
      packageVersions.set(pkg, new Set());
    }
    packageVersions.get(pkg)!.add(resolvedImport.version);
  }

  for (const [pkg, versions] of packageVersions.entries()) {
    if (versions.size > 1) {
      warnings.push(
        `Version conflict for "${pkg}": ${Array.from(versions).join(', ')}`
      );
    }
  }

  // Special warning for Three.js version mismatch
  for (const resolvedImport of resolved) {
    if (resolvedImport.packageName === 'three' &&
        resolvedImport.version !== '0.157.0' &&
        resolvedImport.version !== 'latest') {
      warnings.push(
        `Three.js version mismatch: requested ${resolvedImport.version}, IDE uses 0.157.0`
      );
    }
  }

  return warnings;
}

/**
 * Get console-friendly summary of resolved imports
 */
export function getResolutionSummary(resolved: ResolvedImport[]): string {
  const lines = ['ℹ Resolved dependencies:'];

  for (const res of resolved) {
    if (res.url === '<use-existing-importmap>') {
      lines.push(`  • ${res.packageName}@${res.version} (bundled)`);
    } else if (res.url === '<resolution-failed>') {
      lines.push(`  ✗ ${res.packageName} (failed to resolve)`);
    } else {
      lines.push(`  • ${res.packageName}@${res.version} (${res.cdn})`);
    }
  }

  return lines.join('\n');
}
