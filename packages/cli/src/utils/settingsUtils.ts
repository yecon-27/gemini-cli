/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Settings, SettingScope, LoadedSettings } from '../config/settings.js';
import {
  SETTINGS_SCHEMA,
  SettingDefinition,
} from '../config/settingsSchema.js';

/**
 * Get all settings grouped by category
 */
export function getSettingsByCategory(): Record<string, SettingDefinition[]> {
  const categories: Record<string, SettingDefinition[]> = {};

  Object.entries(SETTINGS_SCHEMA).forEach(([key, definition]) => {
    const category = definition.category;
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push({ ...definition, key });
  });

  return categories;
}

/**
 * Get a setting definition by key
 */
export function getSettingDefinition(
  key: string,
): SettingDefinition | undefined {
  return SETTINGS_SCHEMA[key];
}

/**
 * Check if a setting requires restart
 */
export function requiresRestart(key: string): boolean {
  return SETTINGS_SCHEMA[key]?.requiresRestart ?? false;
}

/**
 * Get the default value for a setting
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getDefaultValue(key: string): any {
  return SETTINGS_SCHEMA[key]?.default;
}

/**
 * Get all setting keys that require restart
 */
export function getRestartRequiredSettings(): string[] {
  return Object.entries(SETTINGS_SCHEMA)
    .filter(([, definition]) => definition.requiresRestart)
    .map(([key]) => key);
}

/**
 * Parse a nested setting key (e.g., 'accessibility.disableLoadingPhrases')
 * Returns [parentKey, childKey] or [key, undefined] for top-level settings
 */
export function parseSettingKey(key: string): [string, string | undefined] {
  const parts = key.split('.');
  if (parts.length === 2) {
    return [parts[0], parts[1]];
  }
  return [key, undefined];
}

/**
 * Get the effective value for a setting, considering inheritance from higher scopes
 * Always returns a value (never undefined) - falls back to default if not set anywhere
 */
export function getEffectiveValue(
  key: string,
  settings: Settings,
  mergedSettings: Settings,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  const definition = getSettingDefinition(key);
  if (!definition) {
    return undefined;
  }

  const [parentKey, childKey] = parseSettingKey(key);

  if (childKey) {
    // Nested setting
    const parentValue = settings[parentKey as keyof Settings];
    if (
      parentValue &&
      typeof parentValue === 'object' &&
      parentValue !== null &&
      childKey in parentValue
    ) {
      return (parentValue as Record<string, unknown>)[childKey];
    }

    // Check merged settings for inherited value
    const mergedParent = mergedSettings[parentKey as keyof Settings];
    if (
      mergedParent &&
      typeof mergedParent === 'object' &&
      mergedParent !== null &&
      childKey in mergedParent
    ) {
      return (mergedParent as Record<string, unknown>)[childKey];
    }
  } else {
    // Top-level setting
    if (key in settings) {
      return settings[key as keyof Settings];
    }

    // Check merged settings for inherited value
    if (key in mergedSettings) {
      return mergedSettings[key as keyof Settings];
    }
  }

  // Return default value if no value is set anywhere
  return definition.default;
}

/**
 * Get all setting keys from the schema
 */
export function getAllSettingKeys(): string[] {
  return Object.keys(SETTINGS_SCHEMA);
}

/**
 * Get settings by type
 */
export function getSettingsByType(
  type: SettingDefinition['type'],
): SettingDefinition[] {
  return Object.entries(SETTINGS_SCHEMA)
    .filter(([, definition]) => definition.type === type)
    .map(([key, definition]) => ({ ...definition, key }));
}

/**
 * Get settings that require restart
 */
export function getSettingsRequiringRestart(): SettingDefinition[] {
  return Object.entries(SETTINGS_SCHEMA)
    .filter(([, definition]) => definition.requiresRestart)
    .map(([key, definition]) => ({ ...definition, key }));
}

/**
 * Validate if a setting key exists in the schema
 */
export function isValidSettingKey(key: string): boolean {
  return key in SETTINGS_SCHEMA;
}

/**
 * Get the category for a setting
 */
export function getSettingCategory(key: string): string | undefined {
  return SETTINGS_SCHEMA[key]?.category;
}

// ============================================================================
// BUSINESS LOGIC UTILITIES (Higher-level utilities for setting operations)
// ============================================================================

/**
 * Get the current value for a setting in a specific scope
 * Always returns a value (never undefined) - falls back to default if not set anywhere
 */
export function getSettingValue(
  key: string,
  settings: Settings,
  mergedSettings: Settings,
): boolean {
  const definition = getSettingDefinition(key);
  if (!definition) {
    return false; // Default fallback for invalid settings
  }

  const value = getEffectiveValue(key, settings, mergedSettings);
  return value ?? definition.default;
}

/**
 * Check if a setting value is modified from its default
 */
export function isSettingModified(key: string, value: boolean): boolean {
  const defaultValue = getDefaultValue(key);
  return value !== defaultValue;
}

/**
 * Check if a setting exists in the original settings file for a scope
 */
export function settingExistsInScope(
  key: string,
  scopeSettings: Settings,
): boolean {
  const [parentKey, childKey] = parseSettingKey(key);

  if (childKey) {
    // Nested setting
    const parentValue = scopeSettings[parentKey as keyof Settings];
    return !!(
      parentValue &&
      typeof parentValue === 'object' &&
      parentValue !== null &&
      childKey in parentValue
    );
  } else {
    // Top-level setting
    return key in scopeSettings;
  }
}

/**
 * Set a setting value in the pending settings
 */
export function setPendingSettingValue(
  key: string,
  value: boolean,
  pendingSettings: Settings,
): Settings {
  const [parentKey, childKey] = parseSettingKey(key);

  if (childKey) {
    // Nested setting
    const currentParent = pendingSettings[parentKey as keyof Settings];
    const parentObject =
      currentParent && typeof currentParent === 'object'
        ? (currentParent as Record<string, unknown>)
        : {};

    return {
      ...pendingSettings,
      [parentKey]: {
        ...parentObject,
        [childKey]: value,
      },
    };
  } else {
    // Top-level setting
    return {
      ...pendingSettings,
      [key]: value,
    };
  }
}

/**
 * Check if any modified settings require a restart
 */
export function hasRestartRequiredSettings(
  modifiedSettings: Set<string>,
): boolean {
  return Array.from(modifiedSettings).some((key) => requiresRestart(key));
}

/**
 * Get the restart required settings from a set of modified settings
 */
export function getRestartRequiredFromModified(
  modifiedSettings: Set<string>,
): string[] {
  return Array.from(modifiedSettings).filter((key) => requiresRestart(key));
}

/**
 * Save modified settings to the appropriate scope
 */
export function saveModifiedSettings(
  modifiedSettings: Set<string>,
  pendingSettings: Settings,
  loadedSettings: LoadedSettings,
  scope: SettingScope,
): void {
  modifiedSettings.forEach((settingKey) => {
    const [parentKey, childKey] = parseSettingKey(settingKey);

    if (childKey) {
      // Nested setting (e.g., accessibility.disableLoadingPhrases)
      const parentValue = pendingSettings[parentKey as keyof Settings];
      if (parentValue && typeof parentValue === 'object') {
        const childValue = (parentValue as Record<string, unknown>)[childKey];
        if (childValue !== undefined) {
          // Check if this setting already exists in the original file
          const originalParent =
            loadedSettings.forScope(scope).settings[
              parentKey as keyof Settings
            ];
          const existsInOriginalFile =
            originalParent &&
            typeof originalParent === 'object' &&
            originalParent !== null &&
            childKey in originalParent;

          // Save if it exists in original file OR if it's not the default value
          const isDefaultValue = childValue === getDefaultValue(settingKey);
          if (existsInOriginalFile || !isDefaultValue) {
            const currentParent =
              loadedSettings.forScope(scope).settings[
                parentKey as keyof Settings
              ];
            const parentObject =
              currentParent && typeof currentParent === 'object'
                ? (currentParent as Record<string, unknown>)
                : {};
            loadedSettings.setValue(scope, parentKey as keyof Settings, {
              ...parentObject,
              [childKey]: childValue,
            });
          }
        }
      }
    } else {
      // Top-level setting
      const value = pendingSettings[parentKey as keyof Settings];
      if (value !== undefined) {
        // Check if this setting already exists in the original file
        const existsInOriginalFile =
          loadedSettings.forScope(scope).settings[
            parentKey as keyof Settings
          ] !== undefined;

        // Save if it exists in original file OR if it's not the default value
        const isDefaultValue = value === getDefaultValue(settingKey);
        if (existsInOriginalFile || !isDefaultValue) {
          loadedSettings.setValue(scope, parentKey as keyof Settings, value);
        }
      }
    }
  });
}

/**
 * Get the display value for a setting, showing current scope value with default change indicator
 */
export function getDisplayValue(
  key: string,
  settings: Settings,
  _mergedSettings: Settings,
  _modifiedSettings: Set<string>,
  pendingSettings?: Settings,
): string {
  // Prioritize pending changes if user has modified this setting
  let value: boolean;
  if (pendingSettings && settingExistsInScope(key, pendingSettings)) {
    // Show the value from the pending (unsaved) edits when it exists
    value = getSettingValue(key, pendingSettings, {});
  } else if (settingExistsInScope(key, settings)) {
    // Show the value defined at the current scope if present
    value = getSettingValue(key, settings, {});
  } else {
    // Fall back to the schema default when the key is unset in this scope
    value = getDefaultValue(key) ?? false;
  }

  const valueString = String(value);

  // Check if value is different from default
  const defaultValue = getDefaultValue(key);
  const isChangedFromDefault = value !== defaultValue;

  // Add * indicator when value differs from default
  if (isChangedFromDefault) {
    return `${valueString}*`; // * indicates changed from default value
  }

  return valueString;
}

/**
 * Check if a setting doesn't exist in current scope (should be greyed out)
 */
export function isDefaultValue(key: string, settings: Settings): boolean {
  return !settingExistsInScope(key, settings);
}

/**
 * Check if a setting value is inherited (not set at current scope)
 */
export function isValueInherited(
  key: string,
  settings: Settings,
  _mergedSettings: Settings,
): boolean {
  const [parentKey, childKey] = parseSettingKey(key);

  if (childKey) {
    // Nested setting
    const parentValue = settings[parentKey as keyof Settings];
    return !(
      parentValue &&
      typeof parentValue === 'object' &&
      childKey in parentValue
    );
  } else {
    // Top-level setting
    return !(key in settings);
  }
}

/**
 * Get the effective value for display, considering inheritance
 * Always returns a boolean value (never undefined)
 */
export function getEffectiveDisplayValue(
  key: string,
  settings: Settings,
  mergedSettings: Settings,
): boolean {
  return getSettingValue(key, settings, mergedSettings);
}
