/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { escapePath, FileDiscoveryService } from '@google/gemini-cli-core';
import { Suggestion } from '../components/SuggestionsDisplay.js';

export interface FileFilterOptions {
  respectGitIgnore?: boolean;
  respectGeminiIgnore?: boolean;
}

/**
 * Recursively searches for files matching a prefix with optimized performance
 */
export const findFilesRecursively = async (
  startDir: string,
  searchPrefix: string,
  fileDiscovery: FileDiscoveryService | null,
  filterOptions: FileFilterOptions,
  currentRelativePath = '',
  depth = 0,
  maxDepth = 10,
  maxResults = 50,
): Promise<Suggestion[]> => {
  if (depth > maxDepth) {
    return [];
  }

  const lowerSearchPrefix = searchPrefix.toLowerCase();
  const foundSuggestions: Suggestion[] = [];

  try {
    const entries = await fs.readdir(startDir, { withFileTypes: true });

    for (const entry of entries) {
      if (foundSuggestions.length >= maxResults) break;

      const entryPathRelative = path.join(currentRelativePath, entry.name);
      const entryPathFromRoot = path.relative(
        startDir,
        path.join(startDir, entry.name),
      );

      // Conditionally ignore dotfiles
      if (!searchPrefix.startsWith('.') && entry.name.startsWith('.')) {
        continue;
      }

      // Check if this entry should be ignored by filtering options
      if (
        fileDiscovery &&
        fileDiscovery.shouldIgnoreFile(entryPathFromRoot, filterOptions)
      ) {
        continue;
      }

      if (entry.name.toLowerCase().startsWith(lowerSearchPrefix)) {
        foundSuggestions.push({
          label: entryPathRelative + (entry.isDirectory() ? '/' : ''),
          value: escapePath(
            entryPathRelative + (entry.isDirectory() ? '/' : ''),
          ),
        });
      }

      if (
        entry.isDirectory() &&
        entry.name !== 'node_modules' &&
        !entry.name.startsWith('.') &&
        foundSuggestions.length < maxResults
      ) {
        const recursiveResults = await findFilesRecursively(
          path.join(startDir, entry.name),
          searchPrefix,
          fileDiscovery,
          filterOptions,
          entryPathRelative,
          depth + 1,
          maxDepth,
          maxResults - foundSuggestions.length,
        );
        foundSuggestions.push(...recursiveResults);
      }
    }
  } catch (_err) {
    // Ignore errors like permission denied or ENOENT during recursive search
  }

  return foundSuggestions;
};

/**
 * Uses glob pattern matching to find files with optimized filtering
 */
export const findFilesWithGlob = async (
  searchPrefix: string,
  fileDiscoveryService: FileDiscoveryService,
  filterOptions: FileFilterOptions,
  searchDir: string,
  cwd: string,
  maxResults = 50,
): Promise<Suggestion[]> => {
  const globPattern = `**/${searchPrefix}*`;
  const files = await glob(globPattern, {
    cwd: searchDir,
    dot: searchPrefix.startsWith('.'),
    nocase: true,
  });

  // Pre-filter and limit results early to avoid processing large arrays
  const filteredFiles = files
    .filter((file) => {
      if (fileDiscoveryService) {
        return !fileDiscoveryService.shouldIgnoreFile(file, filterOptions);
      }
      return true;
    })
    .slice(0, maxResults);

  return filteredFiles.map((file: string) => {
    const absolutePath = path.resolve(searchDir, file);
    const label = path.relative(cwd, absolutePath);
    return {
      label,
      value: escapePath(label),
    };
  });
};
