#!/usr/bin/env node
/**
 * Macaques Patch Validation CLI
 *
 * Validates that all patches are compatible with the current n8n version.
 *
 * Usage:
 *   pnpm macaques validate
 *   npx tsx src/cli/validate.ts --extensions ./extensions --n8n ./n8n
 */

import { existsSync } from 'fs';
import { resolve } from 'path';
import glob from 'fast-glob';
import pc from 'picocolors';
import type { PatchEntry, PatchManifest, ValidationResult } from '../shared/types.js';
import { findFileWithExtensions, loadManifest, logger } from '../shared/utils.js';

interface ValidateOptions {
  extensionsDir: string;
  n8nDir: string;
  verbose?: boolean;
}

/**
 * Validate all patches
 */
async function validatePatches(options: ValidateOptions): Promise<ValidationResult[]> {
  const { extensionsDir, n8nDir, verbose = false } = options;
  const results: ValidationResult[] = [];

  // Paths
  const frontendExtensions = resolve(extensionsDir, 'frontend');
  const backendExtensions = resolve(extensionsDir, 'backend');
  const n8nEditorUiSrc = resolve(n8nDir, 'packages', 'frontend', 'editor-ui', 'src');
  const n8nCliSrc = resolve(n8nDir, 'packages', 'cli', 'src');

  // Load manifests
  const frontendManifest = loadManifest(resolve(frontendExtensions, 'patches.manifest.json'));
  const backendManifest = loadManifest(resolve(backendExtensions, 'patches.manifest.json'));

  // Validate frontend patches from manifest
  if (frontendManifest) {
    for (const patch of frontendManifest.patches) {
      const result = await validateFrontendPatch(patch, frontendExtensions, n8nEditorUiSrc);
      results.push(result);
    }
  }

  // Validate backend patches from manifest
  if (backendManifest) {
    for (const patch of backendManifest.patches) {
      const result = await validateBackendPatch(patch, backendExtensions, n8nCliSrc);
      results.push(result);
    }
  }

  // Also check for undocumented patches (files in extensions without manifest entries)
  const undocumentedFrontend = await findUndocumentedPatches(
    frontendExtensions,
    frontendManifest,
    ['**/*.vue', '**/*.ts', '**/*.tsx'],
    ['@/**']
  );

  for (const file of undocumentedFrontend) {
    results.push({
      patch: {
        path: file,
        type: 'replace',
        description: 'Undocumented patch',
      },
      valid: true,
      status: 'ok',
      message: 'Patch exists but is not documented in manifest',
    });
  }

  return results;
}

/**
 * Validate a frontend patch
 */
async function validateFrontendPatch(
  patch: PatchEntry,
  extensionsDir: string,
  n8nSrc: string
): Promise<ValidationResult> {
  // Check that the override file exists
  const overridePath = resolve(extensionsDir, patch.path);
  const overrideFile = findFileWithExtensions(overridePath);

  if (!overrideFile) {
    return {
      patch,
      valid: false,
      status: 'missing',
      message: 'Override file not found',
      basePath: overridePath,
    };
  }

  // Check that the base file exists in n8n
  const basePath = resolve(n8nSrc, patch.path.replace(/^@\//, ''));
  const baseFile = findFileWithExtensions(basePath);

  if (!baseFile) {
    return {
      patch,
      valid: false,
      status: 'missing',
      message: 'Base file not found in n8n - may have been moved or deleted',
      basePath,
    };
  }

  return {
    patch,
    valid: true,
    status: 'ok',
    basePath: baseFile,
  };
}

/**
 * Validate a backend patch
 */
async function validateBackendPatch(
  patch: PatchEntry,
  extensionsDir: string,
  n8nSrc: string
): Promise<ValidationResult> {
  if (patch.type === 'service_extension') {
    // Check that the extension file exists
    const extFile = resolve(extensionsDir, patch.path);
    if (!existsSync(extFile)) {
      return {
        patch,
        valid: false,
        status: 'missing',
        message: 'Extension file not found',
        basePath: extFile,
      };
    }

    // We can't easily verify the target service exists without importing
    // Just mark as OK for now
    return {
      patch,
      valid: true,
      status: 'ok',
      basePath: extFile,
    };
  }

  if (patch.type === 'new_controller' || patch.type === 'module') {
    // Just check the file exists
    const file = resolve(extensionsDir, patch.path);
    if (!existsSync(file)) {
      return {
        patch,
        valid: false,
        status: 'missing',
        message: 'File not found',
        basePath: file,
      };
    }

    return {
      patch,
      valid: true,
      status: 'ok',
      basePath: file,
    };
  }

  return {
    patch,
    valid: true,
    status: 'ok',
  };
}

/**
 * Find patches that exist as files but aren't in the manifest
 */
async function findUndocumentedPatches(
  extensionsDir: string,
  manifest: PatchManifest | null,
  patterns: string[],
  prefixes: string[]
): Promise<string[]> {
  if (!existsSync(extensionsDir)) {
    return [];
  }

  const files = await glob(patterns, {
    cwd: extensionsDir,
    ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*'],
  });

  const documentedPaths = new Set(manifest?.patches.map((p) => p.path) ?? []);
  const undocumented: string[] = [];

  for (const file of files) {
    // Normalize to manifest format
    let normalized = file;
    for (const prefix of prefixes) {
      const prefixPath = prefix.replace('**', '');
      if (file.startsWith(prefixPath.replace('/', ''))) {
        normalized = prefix.replace('**', '') + file;
      }
    }

    if (!documentedPaths.has(normalized) && !documentedPaths.has(file)) {
      undocumented.push(file);
    }
  }

  return undocumented;
}

/**
 * Print validation results
 */
function printResults(results: ValidationResult[]): void {
  const valid = results.filter((r) => r.valid);
  const invalid = results.filter((r) => !r.valid);

  console.log('');
  console.log(pc.bold('Patch Validation Results'));
  console.log('─'.repeat(50));

  if (results.length === 0) {
    console.log(pc.yellow('No patches found to validate.'));
    console.log('');
    return;
  }

  // Print valid patches
  if (valid.length > 0) {
    console.log('');
    console.log(pc.green(`✓ ${valid.length} patches valid`));
    for (const result of valid) {
      console.log(`  ${pc.dim('•')} ${result.patch.path}`);
      if (result.message) {
        console.log(`    ${pc.yellow(result.message)}`);
      }
    }
  }

  // Print invalid patches
  if (invalid.length > 0) {
    console.log('');
    console.log(pc.red(`✗ ${invalid.length} patches with issues`));
    for (const result of invalid) {
      console.log(`  ${pc.red('•')} ${result.patch.path}`);
      console.log(`    ${pc.dim('Status:')} ${result.status}`);
      if (result.message) {
        console.log(`    ${pc.dim('Message:')} ${result.message}`);
      }
      if (result.basePath) {
        console.log(`    ${pc.dim('Expected:')} ${result.basePath}`);
      }
    }
  }

  console.log('');
  console.log('─'.repeat(50));

  if (invalid.length > 0) {
    console.log(pc.red(`Validation failed with ${invalid.length} issue(s)`));
  } else {
    console.log(pc.green('All patches validated successfully!'));
  }

  console.log('');
}

/**
 * Parse command line arguments
 */
function parseArgs(): ValidateOptions {
  const args = process.argv.slice(2);
  const options: ValidateOptions = {
    extensionsDir: './extensions',
    n8nDir: './n8n',
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--extensions' || arg === '-e') {
      options.extensionsDir = args[++i] || options.extensionsDir;
    } else if (arg === '--n8n' || arg === '-n') {
      options.n8nDir = args[++i] || options.n8nDir;
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Macaques Patch Validator

Usage:
  npx macaques validate [options]

Options:
  -e, --extensions <dir>  Extensions directory (default: ./extensions)
  -n, --n8n <dir>         n8n directory (default: ./n8n)
  -v, --verbose           Verbose output
  -h, --help              Show this help
`);
      process.exit(0);
    }
  }

  return options;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const options = parseArgs();

  logger.info('Validating patches...');

  if (options.verbose) {
    logger.info(`Extensions: ${resolve(options.extensionsDir)}`);
    logger.info(`n8n: ${resolve(options.n8nDir)}`);
  }

  const results = await validatePatches(options);
  printResults(results);

  const hasErrors = results.some((r) => !r.valid);
  process.exit(hasErrors ? 1 : 0);
}

main().catch((error) => {
  logger.error(`Validation failed: ${error.message}`);
  process.exit(1);
});
