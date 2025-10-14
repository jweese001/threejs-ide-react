/**
 * Import Parser Utility
 * Extracts import statements from JavaScript/TypeScript code
 * for dynamic importmap generation
 */

export interface ImportStatement {
  source: string;           // 'three' or 'https://cdn.skypack.dev/three'
  specifiers: string[];     // ['THREE'] or ['OrbitControls']
  isUrl: boolean;           // true if source is full URL
  version?: string;         // extracted from URL if present (e.g., '0.136.0')
  rawStatement: string;     // original import statement for debugging
  type: 'namespace' | 'named' | 'default'; // import type
}

/**
 * Parse all import statements from JavaScript code
 * @param code - JavaScript code string
 * @returns Array of parsed import statements
 */
export function parseImports(code: string): ImportStatement[] {
  const imports: ImportStatement[] = [];

  // Remove comments to avoid false positives
  const codeWithoutComments = removeComments(code);

  // Regex patterns for different import types
  const patterns = [
    // import * as Name from 'module'
    /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
    // import { Name1, Name2 } from 'module'
    /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g,
    // import Name from 'module'
    /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g,
    // import 'module' (side-effect only)
    /import\s+['"]([^'"]+)['"]/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(codeWithoutComments)) !== null) {
      const parsed = parseImportMatch(match, pattern);
      if (parsed && !isDuplicate(imports, parsed)) {
        imports.push(parsed);
      }
    }
  }

  return imports;
}

/**
 * Parse a regex match into an ImportStatement
 */
function parseImportMatch(match: RegExpExecArray, pattern: RegExp): ImportStatement | null {
  const fullMatch = match[0];

  // Determine import type and extract source
  if (fullMatch.includes('* as')) {
    // import * as Name from 'source'
    const specifier = match[1];
    const source = match[2];
    return createImportStatement(source, [specifier], 'namespace', fullMatch);
  } else if (fullMatch.includes('{')) {
    // import { Name1, Name2 } from 'source'
    const specifiersStr = match[1];
    const source = match[2];
    const specifiers = specifiersStr.split(',').map(s => s.trim().split(/\s+as\s+/)[0]);
    return createImportStatement(source, specifiers, 'named', fullMatch);
  } else if (match.length === 3) {
    // import Name from 'source'
    const specifier = match[1];
    const source = match[2];
    return createImportStatement(source, [specifier], 'default', fullMatch);
  } else if (match.length === 2) {
    // import 'source' (side-effect)
    const source = match[1];
    return createImportStatement(source, [], 'default', fullMatch);
  }

  return null;
}

/**
 * Create an ImportStatement object
 */
function createImportStatement(
  source: string,
  specifiers: string[],
  type: ImportStatement['type'],
  rawStatement: string
): ImportStatement {
  const isUrl = source.startsWith('http://') || source.startsWith('https://');
  const version = isUrl ? extractVersionFromUrl(source) : undefined;

  return {
    source,
    specifiers,
    isUrl,
    version,
    rawStatement,
    type,
  };
}

/**
 * Extract version from CDN URL
 * e.g., 'https://cdn.skypack.dev/three@0.136.0' -> '0.136.0'
 */
function extractVersionFromUrl(url: string): string | undefined {
  const versionMatch = url.match(/@([\d.]+)/);
  return versionMatch ? versionMatch[1] : undefined;
}

/**
 * Check if import is duplicate
 */
function isDuplicate(imports: ImportStatement[], newImport: ImportStatement): boolean {
  return imports.some(imp =>
    imp.source === newImport.source &&
    imp.type === newImport.type
  );
}

/**
 * Remove JavaScript comments from code
 * Handles both single-line (//) and multi-line (/* *\/) comments
 */
function removeComments(code: string): string {
  // Remove multi-line comments
  let result = code.replace(/\/\*[\s\S]*?\*\//g, '');

  // Remove single-line comments (but not URLs with //)
  result = result.replace(/\/\/(?![^\n]*['"])[^\n]*/g, '');

  return result;
}

/**
 * Normalize package name from various formats
 * e.g., 'three/addons/controls/OrbitControls.js' -> 'three/addons/controls/OrbitControls.js'
 * e.g., 'https://cdn.skypack.dev/three@0.136.0' -> 'three'
 */
export function normalizePackageName(source: string): string {
  if (!source.startsWith('http://') && !source.startsWith('https://')) {
    return source; // Already a package name
  }

  // Extract package name from URL
  const urlPatterns = [
    /cdn\.skypack\.dev\/(@?[^@/]+)/,
    /unpkg\.com\/(@?[^@/]+)/,
    /cdn\.jsdelivr\.net\/npm\/(@?[^@/]+)/,
    /esm\.sh\/(@?[^@/]+)/,
  ];

  for (const pattern of urlPatterns) {
    const match = source.match(pattern);
    if (match) {
      return match[1];
    }
  }

  // Fallback: try to extract anything after last domain segment
  const lastSlash = source.lastIndexOf('/');
  if (lastSlash !== -1) {
    const potential = source.substring(lastSlash + 1);
    // Remove version and file extension
    return potential.split('@')[0].split('.js')[0];
  }

  return source;
}

/**
 * Get a summary of imports for logging/debugging
 */
export function getImportSummary(imports: ImportStatement[]): string {
  const packages = imports.map(imp => {
    const pkg = normalizePackageName(imp.source);
    const version = imp.version ? `@${imp.version}` : '';
    return `${pkg}${version}`;
  });

  return packages.join(', ');
}
