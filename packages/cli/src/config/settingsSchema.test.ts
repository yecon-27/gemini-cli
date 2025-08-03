/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { SETTINGS_SCHEMA, SettingDefinition } from './settingsSchema.js';

describe('SettingsSchema', () => {
  describe('SETTINGS_SCHEMA', () => {
    it('should contain expected top-level and nested settings', () => {
      // Test a few top-level settings
      expect(SETTINGS_SCHEMA.showMemoryUsage).toBeDefined();
      expect(SETTINGS_SCHEMA.vimMode).toBeDefined();

      // Test a few nested settings
      expect(SETTINGS_SCHEMA.accessibility).toBeDefined();
      expect(
        SETTINGS_SCHEMA.accessibility.properties?.disableLoadingPhrases,
      ).toBeDefined();
      expect(
        SETTINGS_SCHEMA.fileFiltering?.properties?.respectGitIgnore,
      ).toBeDefined();
    });

    // Helper function to recursively check all definitions
    const checkAllDefinitions = (schema: object) => {
      Object.values(schema).forEach((definition: SettingDefinition) => {
        expect(definition).toHaveProperty('type');
        expect(definition).toHaveProperty('label');
        expect(definition).toHaveProperty('category');
        expect(definition).toHaveProperty('requiresRestart');
        expect(definition).toHaveProperty('default');
        expect(typeof definition.type).toBe('string');
        expect(typeof definition.label).toBe('string');
        expect(typeof definition.category).toBe('string');
        expect(typeof definition.requiresRestart).toBe('boolean');

        if (definition.properties) {
          checkAllDefinitions(definition.properties);
        }
      });
    };

    it('should have correct structure for each setting', () => {
      checkAllDefinitions(SETTINGS_SCHEMA);
    });

    it('should have correct nested setting structure', () => {
      const accessibility = SETTINGS_SCHEMA.accessibility;
      expect(accessibility.properties).toBeDefined();
      expect(accessibility.properties?.disableLoadingPhrases).toBeDefined();
      expect(accessibility.properties?.disableLoadingPhrases.label).toBe(
        'Disable Loading Phrases',
      );

      const fileFiltering = SETTINGS_SCHEMA.fileFiltering;
      expect(fileFiltering.properties).toBeDefined();
      expect(fileFiltering.properties?.respectGitIgnore).toBeDefined();
      expect(fileFiltering.properties?.respectGeminiIgnore).toBeDefined();
    });

    it('should have all expected categories', () => {
      const categories = new Set<string>();
      const collectCategories = (schema: object) => {
        Object.values(schema).forEach((definition: SettingDefinition) => {
          categories.add(definition.category);
          if (definition.properties) {
            collectCategories(definition.properties);
          }
        });
      };

      collectCategories(SETTINGS_SCHEMA);

      // Should have exactly 8 categories now
      expect(categories.size).toBe(8);
      expect(categories).toContain('General');
      expect(categories).toContain('Accessibility');
      expect(categories).toContain('Checkpointing');
      expect(categories).toContain('File Filtering');
      expect(categories).toContain('UI');
      expect(categories).toContain('Mode');
      expect(categories).toContain('Updates');
      expect(categories).toContain('Advanced');
    });

    it('should have consistent default values for boolean settings', () => {
      const checkBooleanDefaults = (schema: object) => {
        Object.values(schema).forEach((definition: SettingDefinition) => {
          if (definition.type === 'boolean') {
            // Default can be a boolean or undefined, but nothing else
            expect(
              typeof definition.default === 'boolean' ||
                typeof definition.default === 'undefined',
            ).toBe(true);
          }
          if (definition.properties) {
            checkBooleanDefaults(definition.properties);
          }
        });
      };

      checkBooleanDefaults(SETTINGS_SCHEMA);
    });
  });
});
