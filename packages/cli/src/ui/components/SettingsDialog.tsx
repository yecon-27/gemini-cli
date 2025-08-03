/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';
import {
  LoadedSettings,
  SettingScope,
  Settings,
} from '../../config/settings.js';
import { getScopeItems } from '../../utils/dialogScopeUtils.js';
import { RadioButtonSelect } from './shared/RadioButtonSelect.js';
import {
  getAllSettingKeys,
  getSettingValue,
  setPendingSettingValue,
  getDisplayValue,
  hasRestartRequiredSettings,
  saveModifiedSettings,
  getSettingDefinition,
  isDefaultValue,
  requiresRestart,
  getRestartRequiredFromModified,
} from '../../utils/settingsUtils.js';
import { useVimMode } from '../contexts/VimModeContext.js';

interface SettingsDialogProps {
  settings: LoadedSettings;
  onSelect: (settingName: string | undefined, scope: SettingScope) => void;
  onRestartRequest?: () => void;
}

const maxItemsToShow = 8;

export function SettingsDialog({
  settings,
  onSelect,
  onRestartRequest,
}: SettingsDialogProps): React.JSX.Element {
  // Get vim mode context to sync vim mode changes
  const { vimEnabled, toggleVimEnabled } = useVimMode();

  // Focus state: 'settings' or 'scope'
  const [focusSection, setFocusSection] = useState<'settings' | 'scope'>(
    'settings',
  );
  // Scope selector state (User by default)
  const [selectedScope, setSelectedScope] = useState<SettingScope>(
    SettingScope.User,
  );
  // Active indices
  const [activeSettingIndex, setActiveSettingIndex] = useState(0);
  // Scroll offset for settings
  const [scrollOffset, setScrollOffset] = useState(0);
  const [showRestartPrompt, setShowRestartPrompt] = useState(false);

  // Local pending settings state for the selected scope
  const [pendingSettings, setPendingSettings] = useState<Settings>(() =>
    // Deep clone to avoid mutation
    structuredClone(settings.forScope(selectedScope).settings),
  );

  // Track which settings have been modified by the user
  const [modifiedSettings, setModifiedSettings] = useState<Set<string>>(
    new Set(),
  );

  // Track restart-required settings across scope changes
  const [restartRequiredSettings, setRestartRequiredSettings] = useState<
    Set<string>
  >(new Set());

  useEffect(() => {
    setPendingSettings(
      structuredClone(settings.forScope(selectedScope).settings),
    );
    setModifiedSettings(new Set());
    // Only reset restart prompt if there are no restart-required settings
    if (restartRequiredSettings.size === 0) {
      setShowRestartPrompt(false);
    }
  }, [selectedScope, settings, restartRequiredSettings]);

  const generateSettingsItems = () => {
    const settingKeys = getAllSettingKeys();

    return settingKeys.map((key) => {
      const currentValue = getSettingValue(key, pendingSettings, {});

      const definition = getSettingDefinition(key);

      return {
        label: definition?.label || key,
        value: key,
        checked: currentValue,
        toggle: () => {
          const newValue = !currentValue;

          setPendingSettings((prev) =>
            setPendingSettingValue(key, newValue, prev),
          );

          if (!requiresRestart(key)) {
            const immediateSettings = new Set([key]);
            const immediateSettingsObject = setPendingSettingValue(
              key,
              newValue,
              {},
            );

            console.log(
              `[DEBUG SettingsDialog] Saving ${key} immediately with value:`,
              newValue,
            );
            saveModifiedSettings(
              immediateSettings,
              immediateSettingsObject,
              settings,
              selectedScope,
            );

            // Special handling for vim mode to sync with VimModeContext
            if (key === 'vimMode' && newValue !== vimEnabled) {
              // Call toggleVimEnabled to sync the VimModeContext local state
              toggleVimEnabled().catch((error) => {
                console.error('Failed to toggle vim mode:', error);
              });
            }

            // Capture the current modified settings before updating state
            const currentModifiedSettings = new Set(modifiedSettings);

            // Remove the saved setting from modifiedSettings since it's now saved
            setModifiedSettings((prev) => {
              const updated = new Set(prev);
              updated.delete(key);
              return updated;
            });

            // Also remove from restart-required settings if it was there
            setRestartRequiredSettings((prev) => {
              const updated = new Set(prev);
              updated.delete(key);
              return updated;
            });

            // Update pending settings to reflect the newly saved state
            // while preserving other pending changes by reapplying them
            setPendingSettings((prevPending) => {
              // Start with the current saved state (which now includes our just-saved change)
              let updatedPending = structuredClone(
                settings.forScope(selectedScope).settings,
              );

              // Reapply any other pending changes that weren't just saved
              currentModifiedSettings.forEach((modifiedKey) => {
                if (modifiedKey !== key) {
                  const modifiedValue = getSettingValue(
                    modifiedKey,
                    prevPending,
                    {},
                  );
                  updatedPending = setPendingSettingValue(
                    modifiedKey,
                    modifiedValue,
                    updatedPending,
                  );
                }
              });

              return updatedPending;
            });
          } else {
            setModifiedSettings((prev) => {
              const updated = new Set(prev).add(key);
              const needsRestart = hasRestartRequiredSettings(updated);
              console.log(
                `[DEBUG SettingsDialog] Modified settings:`,
                Array.from(updated),
                'Needs restart:',
                needsRestart,
              );
              if (needsRestart) {
                console.log(
                  `[DEBUG SettingsDialog] Setting showRestartPrompt to true`,
                );
                setShowRestartPrompt(true);
                // Track restart-required settings separately
                setRestartRequiredSettings((prevRestart) =>
                  new Set(prevRestart).add(key),
                );
              }
              return updated;
            });
          }
        },
      };
    });
  };

  const items = generateSettingsItems();

  // Scope selector items
  const scopeItems = getScopeItems();

  // Scope handling functions (similar to ThemeDialog)
  const handleScopeHighlight = (scope: SettingScope) => {
    setSelectedScope(scope);
  };

  const handleScopeSelect = (scope: SettingScope) => {
    handleScopeHighlight(scope);
    setFocusSection('settings'); // Reset focus to settings section
  };

  // Scroll logic for settings
  const visibleItems = items.slice(scrollOffset, scrollOffset + maxItemsToShow);
  const showScrollUp = scrollOffset > 0;
  const showScrollDown = scrollOffset + maxItemsToShow < items.length;

  useInput((input, key) => {
    if (key.tab) {
      setFocusSection((prev) => (prev === 'settings' ? 'scope' : 'settings'));
    }
    if (focusSection === 'settings') {
      if (key.upArrow || input === 'k') {
        if (activeSettingIndex > 0) {
          setActiveSettingIndex(activeSettingIndex - 1);
          if (activeSettingIndex - 1 < scrollOffset) {
            setScrollOffset(scrollOffset - 1);
          }
        }
      } else if (key.downArrow || input === 'j') {
        if (activeSettingIndex < items.length - 1) {
          setActiveSettingIndex(activeSettingIndex + 1);
          if (activeSettingIndex + 1 >= scrollOffset + maxItemsToShow) {
            setScrollOffset(scrollOffset + 1);
          }
        }
      } else if (key.return || input === ' ') {
        items[activeSettingIndex]?.toggle();
      }
    }
    if (showRestartPrompt && input === 'r') {
      // Only save settings that require restart (non-restart settings were already saved immediately)
      const restartRequiredSettings =
        getRestartRequiredFromModified(modifiedSettings);
      const restartRequiredSet = new Set(restartRequiredSettings);

      if (restartRequiredSet.size > 0) {
        saveModifiedSettings(
          restartRequiredSet,
          pendingSettings,
          settings,
          selectedScope,
        );
      }

      setShowRestartPrompt(false);
      setRestartRequiredSettings(new Set()); // Clear restart-required settings
      if (onRestartRequest) onRestartRequest();
    }
    if (key.escape) {
      onSelect(undefined, selectedScope);
    }
  });

  return (
    <Box
      borderStyle="round"
      borderColor={Colors.Gray}
      flexDirection="row"
      padding={1}
      width="100%"
      height="100%"
    >
      <Box flexDirection="column" flexGrow={1}>
        <Text bold color={Colors.AccentBlue}>
          Settings
        </Text>
        <Box height={1} />
        {showScrollUp && <Text color={Colors.Gray}>▲</Text>}
        {visibleItems.map((item, idx) => {
          const isActive =
            focusSection === 'settings' &&
            activeSettingIndex === idx + scrollOffset;

          const scopeSettings = settings.forScope(selectedScope).settings;
          const mergedSettings = settings.merged;
          const displayValue = getDisplayValue(
            item.value,
            scopeSettings,
            mergedSettings,
            modifiedSettings,
            pendingSettings,
          );
          const shouldBeGreyedOut = isDefaultValue(item.value, scopeSettings);

          return (
            <React.Fragment key={item.value}>
              <Box flexDirection="row" alignItems="center">
                <Box minWidth={2} flexShrink={0}>
                  <Text color={isActive ? Colors.AccentGreen : Colors.Gray}>
                    {isActive ? '●' : ''}
                  </Text>
                </Box>
                <Box minWidth={50}>
                  <Text
                    color={isActive ? Colors.AccentGreen : Colors.Foreground}
                  >
                    {item.label}
                  </Text>
                </Box>
                <Box minWidth={3} />
                <Text
                  color={
                    isActive
                      ? Colors.AccentGreen
                      : shouldBeGreyedOut
                        ? Colors.Gray
                        : Colors.Foreground
                  }
                >
                  {displayValue}
                </Text>
              </Box>
              <Box height={1} />
            </React.Fragment>
          );
        })}
        {showScrollDown && <Text color={Colors.Gray}>▼</Text>}

        <Box height={1} />

        <Box marginTop={1} flexDirection="column">
          <Text bold={focusSection === 'scope'} wrap="truncate">
            {focusSection === 'scope' ? '> ' : '  '}Apply To
          </Text>
          <RadioButtonSelect
            items={scopeItems}
            initialIndex={0}
            onSelect={handleScopeSelect}
            onHighlight={handleScopeHighlight}
            isFocused={focusSection === 'scope'}
            showNumbers={focusSection === 'scope'}
          />
        </Box>

        <Box height={1} />
        <Text color={Colors.Gray}>
          (Use Enter to select, Tab to change focus)
        </Text>
        {showRestartPrompt && (
          <Text color={Colors.AccentYellow}>
            To see changes, Gemini CLI must be restarted. Press r to exit and
            apply changes now.
          </Text>
        )}
      </Box>
    </Box>
  );
}
