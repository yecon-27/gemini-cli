import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';
import { LoadedSettings, SettingScope, Settings } from '../../config/settings.js';
import process from 'node:process';

interface SettingsDialogProps {
    settings: LoadedSettings;
    onExit?: () => void;
}

interface FileFilteringSettings {
    respectGitIgnore?: boolean;
    respectGeminiIgnore?: boolean;
    enableRecursiveFileSearch?: boolean;
}

const SCOPE_LABELS = {
    [SettingScope.User]: 'User Settings',
    [SettingScope.Workspace]: 'Workspace Settings',
    [SettingScope.System]: 'System Settings',
};

const maxItemsToShow = 8;

export default function SettingsDialog({ settings, onExit }: SettingsDialogProps): React.JSX.Element {
    // Provide a default no-op for onExit
    onExit = onExit || (() => { });
    // Focus state: 'settings' or 'scope'
    const [focusSection, setFocusSection] = useState<'settings' | 'scope'>('settings');
    // Scope selector state (User by default)
    const [selectedScope, setSelectedScope] = useState<SettingScope>(SettingScope.User);
    // Active indices
    const [activeSettingIndex, setActiveSettingIndex] = useState(0);
    const [activeScopeIndex, setActiveScopeIndex] = useState(0);
    // Scroll offset for settings
    const [scrollOffset, setScrollOffset] = useState(0);
    // Version state to force re-render
    const [version, setVersion] = useState(0);
    const [showRestartPrompt, setShowRestartPrompt] = useState(false);

    // Helper to get value for a given scope
    const getScopedValue = (key: keyof Settings): boolean | undefined => {
        return settings.forScope(selectedScope).settings[key] as boolean | undefined;
    };
    const getScopedNestedValue = <T extends object, K extends keyof T>(parentKey: keyof Settings, nestedKey: K): boolean | undefined => {
        const parent = settings.forScope(selectedScope).settings[parentKey] as T | undefined;
        return parent ? (parent[nestedKey] as boolean | undefined) : undefined;
    };

    // Update helpers (with ts-ignore for now)
    const updateAccessibility = (key: 'disableLoadingPhrases', value: boolean) => {
        // @ts-ignore
        const parent = settings.forScope(selectedScope).settings.accessibility || {};
        const updated = { ...parent, [key]: value };
        settings.setValue(selectedScope, 'accessibility', updated);
    };
    const updateCheckpointing = (key: 'enabled', value: boolean) => {
        // @ts-ignore
        const parent = settings.forScope(selectedScope).settings.checkpointing || {};
        const updated = { ...parent, [key]: value };
        settings.setValue(selectedScope, 'checkpointing', updated);
    };
    const updateFileFiltering = (
        key: 'respectGitIgnore' | 'respectGeminiIgnore' | 'enableRecursiveFileSearch',
        value: boolean
    ) => {
        // @ts-ignore
        const parent = settings.forScope(selectedScope).settings.fileFiltering || {};
        const updated = { ...parent, [key]: value };
        settings.setValue(selectedScope, 'fileFiltering', updated);
    };
    const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
        settings.setValue(selectedScope, key, value);
    };

    // List of boolean settings (with default false if undefined)
    const items = [
        {
            label: 'Show Memory Usage',
            value: 'showMemoryUsage',
            checked: getScopedValue('showMemoryUsage') ?? false,
            toggle: () => { updateSetting('showMemoryUsage', !(getScopedValue('showMemoryUsage') ?? false)); setVersion(v => v + 1); setShowRestartPrompt(true); },
        },
        {
            label: 'Disable Loading Phrases (Accessibility)',
            value: 'accessibility.disableLoadingPhrases',
            // @ts-ignore
            checked: getScopedNestedValue('accessibility', 'disableLoadingPhrases') ?? false,
            // @ts-ignore
            toggle: () => { updateAccessibility('disableLoadingPhrases', !(getScopedNestedValue('accessibility', 'disableLoadingPhrases') ?? false)); setVersion(v => v + 1); setShowRestartPrompt(true); },
        },
        {
            label: 'Enable Usage Statistics',
            value: 'usageStatisticsEnabled',
            checked: getScopedValue('usageStatisticsEnabled') ?? false,
            toggle: () => { updateSetting('usageStatisticsEnabled', !(getScopedValue('usageStatisticsEnabled') ?? false)); setVersion(v => v + 1); setShowRestartPrompt(true); },
        },
        {
            label: 'Enable Checkpointing',
            value: 'checkpointing.enabled',
            // @ts-ignore
            checked: getScopedNestedValue('checkpointing', 'enabled') ?? false,
            // @ts-ignore
            toggle: () => { updateCheckpointing('enabled', !(getScopedNestedValue('checkpointing', 'enabled') ?? false)); setVersion(v => v + 1); setShowRestartPrompt(true); },
        },
        {
            label: 'Auto Configure Max Old Space Size',
            value: 'autoConfigureMaxOldSpaceSize',
            checked: getScopedValue('autoConfigureMaxOldSpaceSize') ?? false,
            toggle: () => { updateSetting('autoConfigureMaxOldSpaceSize', !(getScopedValue('autoConfigureMaxOldSpaceSize') ?? false)); setVersion(v => v + 1); setShowRestartPrompt(true); },
        },
        {
            label: 'Respect .gitignore',
            value: 'fileFiltering.respectGitIgnore',
            // @ts-ignore
            checked: getScopedNestedValue('fileFiltering', 'respectGitIgnore') ?? false,
            // @ts-ignore
            toggle: () => { updateFileFiltering('respectGitIgnore', !(getScopedNestedValue('fileFiltering', 'respectGitIgnore') ?? false)); setVersion(v => v + 1); setShowRestartPrompt(true); },
        },
        {
            label: 'Respect .geminiignore',
            value: 'fileFiltering.respectGeminiIgnore',
            // @ts-ignore
            checked: getScopedNestedValue('fileFiltering', 'respectGeminiIgnore') ?? false,
            // @ts-ignore
            toggle: () => { updateFileFiltering('respectGeminiIgnore', !(getScopedNestedValue('fileFiltering', 'respectGeminiIgnore') ?? false)); setVersion(v => v + 1); setShowRestartPrompt(true); },
        },
        {
            label: 'Enable Recursive File Search',
            value: 'fileFiltering.enableRecursiveFileSearch',
            // @ts-ignore
            checked: getScopedNestedValue('fileFiltering', 'enableRecursiveFileSearch') ?? false,
            // @ts-ignore
            toggle: () => { updateFileFiltering('enableRecursiveFileSearch', !(getScopedNestedValue('fileFiltering', 'enableRecursiveFileSearch') ?? false)); setVersion(v => v + 1); setShowRestartPrompt(true); },
        },
        {
            label: 'Hide Window Title',
            value: 'hideWindowTitle',
            checked: getScopedValue('hideWindowTitle') ?? false,
            toggle: () => { updateSetting('hideWindowTitle', !(getScopedValue('hideWindowTitle') ?? false)); setVersion(v => v + 1); setShowRestartPrompt(true); },
        },
        {
            label: 'Hide Tips',
            value: 'hideTips',
            checked: getScopedValue('hideTips') ?? false,
            toggle: () => { updateSetting('hideTips', !(getScopedValue('hideTips') ?? false)); setVersion(v => v + 1); setShowRestartPrompt(true); },
        },
        {
            label: 'Hide Banner',
            value: 'hideBanner',
            checked: getScopedValue('hideBanner') ?? false,
            toggle: () => { updateSetting('hideBanner', !(getScopedValue('hideBanner') ?? false)); setVersion(v => v + 1); setShowRestartPrompt(true); },
        },
        {
            label: 'IDE Mode',
            value: 'ideMode',
            checked: getScopedValue('ideMode') ?? false,
            toggle: () => { updateSetting('ideMode', !(getScopedValue('ideMode') ?? false)); setVersion(v => v + 1); setShowRestartPrompt(true); },
        },
    ];

    // Scope selector items
    const scopeItems = [
        { label: SCOPE_LABELS[SettingScope.User], value: SettingScope.User },
        { label: SCOPE_LABELS[SettingScope.Workspace], value: SettingScope.Workspace },
        { label: SCOPE_LABELS[SettingScope.System], value: SettingScope.System },
    ];

    // Scroll logic for settings
    const visibleItems = items.slice(scrollOffset, scrollOffset + maxItemsToShow);
    const showScrollUp = scrollOffset > 0;
    const showScrollDown = scrollOffset + maxItemsToShow < items.length;

    useInput((input, key) => {
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
                visibleItems[activeSettingIndex - scrollOffset]?.toggle();
            } else if (key.tab) {
                setFocusSection('scope');
            }
        } else if (focusSection === 'scope') {
            if (key.upArrow || input === 'k') {
                if (activeScopeIndex > 0) setActiveScopeIndex(activeScopeIndex - 1);
            } else if (key.downArrow || input === 'j') {
                if (activeScopeIndex < scopeItems.length - 1) setActiveScopeIndex(activeScopeIndex + 1);
            } else if (key.return || input === ' ') {
                setSelectedScope(scopeItems[activeScopeIndex].value);
                setFocusSection('settings');
            } else if (key.tab) {
                setFocusSection('settings');
            }
        }
        if (showRestartPrompt && input === 'r') {
            process.exit(0);
        }
        if (key.escape) {
            if (onExit) onExit();
        }
    });

    return (
        <Box borderStyle="round" borderColor={Colors.Gray} flexDirection="column" padding={1} width="100%">
            <Text bold color={Colors.AccentBlue}>Settings</Text>
            <Box height={1} />
            {showScrollUp && <Text color={Colors.Gray}>▲</Text>}
            {visibleItems.map((item, idx) => {
                const isActive = focusSection === 'settings' && activeSettingIndex === idx + scrollOffset;
                return (
                    <Box key={item.value} flexDirection="row" alignItems="center">
                        <Box minWidth={2} flexShrink={0}>
                            <Text color={isActive ? Colors.AccentGreen : Colors.Gray}>{isActive ? '●' : ''}</Text>
                        </Box>
                        <Text color={isActive ? Colors.AccentGreen : Colors.Foreground}>{item.label}</Text>
                        <Box flexGrow={1} />
                        {item.checked && <Text color={Colors.AccentGreen}>✓</Text>}
                    </Box>
                );
            })}
            {showScrollDown && <Text color={Colors.Gray}>▼</Text>}
            <Box height={1} />
            <Text bold color={Colors.AccentBlue}>Apply To</Text>
            {scopeItems.map((item, idx) => {
                const isActive = focusSection === 'scope' && activeScopeIndex === idx;
                const isSelected = selectedScope === item.value;
                return (
                    <Box key={item.value} flexDirection="row" alignItems="center">
                        <Box minWidth={2} flexShrink={0}>
                            <Text color={Colors.AccentGreen}>{isSelected ? '●' : ''}</Text>
                        </Box>
                        <Text color={isActive ? Colors.AccentGreen : Colors.Foreground}>{item.label}</Text>
                        <Box flexGrow={1} />
                        {/* No checkmark for scope selector */}
                    </Box>
                );
            })}
            <Box height={1} />
            <Text color={Colors.Gray}>Tab: Switch Section  ↑/↓/j/k: Navigate  Enter: Toggle/Select  Esc: Exit</Text>
            {showRestartPrompt && (
                <Text color={Colors.AccentYellow}>Some changes may require a restart to take effect. Press r to restart now.</Text>
            )}
        </Box>
    );
} 