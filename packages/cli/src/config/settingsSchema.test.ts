/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { SETTINGS_SCHEMA } from './settingsSchema.js';

describe('SettingsSchema', () => {
  describe('SETTINGS_SCHEMA', () => {
    it('should contain all expected settings', () => {
      const expectedSettings = [
        'showMemoryUsage',
        'usageStatisticsEnabled',
        'autoConfigureMaxOldSpaceSize',
        'accessibility.disableLoadingPhrases',
        'checkpointing.enabled',
        'fileFiltering.respectGitIgnore',
        'fileFiltering.respectGeminiIgnore',
        'fileFiltering.enableRecursiveFileSearch',
        'hideWindowTitle',
        'hideTips',
        'hideBanner',
        'ideMode',
        'vimMode',
        'disableAutoUpdate',
      ];

      expectedSettings.forEach((setting) => {
        expect(SETTINGS_SCHEMA[setting]).toBeDefined();
      });
    });

    it('should have correct structure for each setting', () => {
      Object.entries(SETTINGS_SCHEMA).forEach(([_key, definition]) => {
        expect(definition).toHaveProperty('type');
        expect(definition).toHaveProperty('label');
        expect(definition).toHaveProperty('category');
        expect(definition).toHaveProperty('requiresRestart');
        expect(definition).toHaveProperty('default');
        expect(typeof definition.type).toBe('string');
        expect(typeof definition.label).toBe('string');
        expect(typeof definition.category).toBe('string');
        expect(typeof definition.requiresRestart).toBe('boolean');
      });
    });

    it('should have correct nested setting structure', () => {
      const nestedSettings = [
        'accessibility.disableLoadingPhrases',
        'checkpointing.enabled',
        'fileFiltering.respectGitIgnore',
        'fileFiltering.respectGeminiIgnore',
        'fileFiltering.enableRecursiveFileSearch',
      ];

      nestedSettings.forEach((setting) => {
        const definition = SETTINGS_SCHEMA[setting];
        expect(definition.parentKey).toBeDefined();
        expect(definition.childKey).toBeDefined();
        expect(typeof definition.parentKey).toBe('string');
        expect(typeof definition.childKey).toBe('string');
      });
    });

    it('should have unique categories', () => {
      const categories = new Set();
      Object.values(SETTINGS_SCHEMA).forEach((definition) => {
        categories.add(definition.category);
      });

      // Should have exactly 7 categories
      expect(categories.size).toBe(7);
      expect(categories).toContain('General');
      expect(categories).toContain('Accessibility');
      expect(categories).toContain('Checkpointing');
      expect(categories).toContain('File Filtering');
      expect(categories).toContain('UI');
      expect(categories).toContain('Mode');
      expect(categories).toContain('Updates');
    });

    it('should have consistent default values for boolean settings', () => {
      Object.entries(SETTINGS_SCHEMA).forEach(([_key, definition]) => {
        if (definition.type === 'boolean') {
          expect(typeof definition.default).toBe('boolean');
        }
      });
    });
  });
});
