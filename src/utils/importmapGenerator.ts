/**
 * Importmap Generator Utility
 * Builds importmap JSON from resolved imports
 */

import { ResolvedImport } from './cdnResolver';

export interface Importmap {
  imports: Record<string, string>;
}

/**
 * Default/base importmap that's always included
 * This is what's currently in preview.html
 */
export const BASE_IMPORTMAP: Importmap = {
  imports: {
    'three': 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js',
    'three/addons/': 'https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/',
    'gsap': 'https://cdn.skypack.dev/gsap',
    'lil-gui': 'https://cdn.skypack.dev/lil-gui',
  },
};

/**
 * Generate importmap from resolved imports
 * @param resolved - Array of resolved imports
 * @param includeBase - Whether to include base imports (default: true)
 * @returns Importmap object ready for injection
 */
export function generateImportmap(
  resolved: ResolvedImport[],
  includeBase: boolean = true
): Importmap {
  const imports: Record<string, string> = {};

  // Include base imports if requested
  if (includeBase) {
    Object.assign(imports, BASE_IMPORTMAP.imports);
  }

  // Get set of base import keys for quick lookup
  const baseKeys = new Set(Object.keys(BASE_IMPORTMAP.imports));

  // Add resolved imports
  for (const resolvedImport of resolved) {
    // Skip if using existing importmap (bundled packages)
    if (resolvedImport.url === '<use-existing-importmap>') {
      continue;
    }

    // Skip if resolution failed
    if (resolvedImport.url === '<resolution-failed>') {
      console.warn(`Skipping failed resolution for: ${resolvedImport.packageName}`);
      continue;
    }

    // Use normalized packageName as the key (e.g., 'three', 'gsap', 'three/addons/controls/OrbitControls.js')
    const key = resolvedImport.packageName;

    // Skip if already in base imports (avoid conflicts)
    // Also check if the key starts with a base key (e.g., 'three/addons/')
    const isDuplicate = baseKeys.has(key) || Array.from(baseKeys).some(baseKey => {
      // Check if base key ends with '/' (like 'three/addons/')
      if (baseKey.endsWith('/')) {
        return key.startsWith(baseKey);
      }
      return false;
    });

    if (!isDuplicate) {
      imports[key] = resolvedImport.url;
    }
  }

  return { imports };
}

/**
 * Merge two importmaps
 * New imports override existing ones
 */
export function mergeImportmaps(base: Importmap, override: Importmap): Importmap {
  return {
    imports: {
      ...base.imports,
      ...override.imports,
    },
  };
}

/**
 * Check if importmap has any user-defined imports
 * (i.e., imports beyond the base)
 */
export function hasUserImports(importmap: Importmap): boolean {
  const baseKeys = Object.keys(BASE_IMPORTMAP.imports);
  const allKeys = Object.keys(importmap.imports);

  return allKeys.some(key => !baseKeys.includes(key));
}

/**
 * Get list of user-added imports (excluding base)
 */
export function getUserImports(importmap: Importmap): Record<string, string> {
  const baseKeys = new Set(Object.keys(BASE_IMPORTMAP.imports));
  const userImports: Record<string, string> = {};

  for (const [key, value] of Object.entries(importmap.imports)) {
    if (!baseKeys.has(key)) {
      userImports[key] = value;
    }
  }

  return userImports;
}

/**
 * Convert importmap to JSON string for injection
 */
export function importmapToJSON(importmap: Importmap): string {
  return JSON.stringify(importmap, null, 2);
}

/**
 * Validate importmap structure
 * Returns array of validation errors
 */
export function validateImportmap(importmap: Importmap): string[] {
  const errors: string[] = [];

  if (!importmap || typeof importmap !== 'object') {
    errors.push('Importmap must be an object');
    return errors;
  }

  if (!importmap.imports || typeof importmap.imports !== 'object') {
    errors.push('Importmap must have an "imports" property that is an object');
    return errors;
  }

  // Validate each import entry
  for (const [key, value] of Object.entries(importmap.imports)) {
    if (typeof key !== 'string' || key.trim() === '') {
      errors.push(`Invalid import key: "${key}"`);
    }

    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`Invalid import value for key "${key}": "${value}"`);
    }

    // Warn about suspicious URLs
    if (value && !value.startsWith('http://') && !value.startsWith('https://')) {
      errors.push(`Import URL for "${key}" should start with http:// or https://: "${value}"`);
    }
  }

  return errors;
}

/**
 * Get a summary of the importmap for logging
 */
export function getImportmapSummary(importmap: Importmap): string {
  const total = Object.keys(importmap.imports).length;
  const base = Object.keys(BASE_IMPORTMAP.imports).length;
  const user = total - base;

  const lines = [
    `Importmap: ${total} total (${base} base + ${user} user)`,
  ];

  const userImports = getUserImports(importmap);
  if (Object.keys(userImports).length > 0) {
    lines.push('User imports:');
    for (const [key, value] of Object.entries(userImports)) {
      const cdn = detectCDN(value);
      lines.push(`  • ${key} → ${cdn}`);
    }
  }

  return lines.join('\n');
}

/**
 * Detect which CDN a URL is from (helper)
 */
function detectCDN(url: string): string {
  if (url.includes('cdn.skypack.dev')) return 'Skypack';
  if (url.includes('unpkg.com')) return 'unpkg';
  if (url.includes('cdn.jsdelivr.net')) return 'jsDelivr';
  if (url.includes('esm.sh')) return 'esm.sh';
  return 'unknown CDN';
}
