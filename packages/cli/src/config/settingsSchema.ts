/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AuthType,
  BugCommandSettings,
  MCPServerConfig,
  TelemetrySettings,
} from '@google/gemini-cli-core';
import { CustomTheme } from '../ui/themes/theme.js';

// This file is now the single source of truth for all CLI settings.
// The `Settings` type in `settings.ts` is automatically inferred from this schema.

export type DnsResolutionOrder = 'ipv4first' | 'verbatim';
export type MemoryImportFormat = 'tree' | 'flat';

/**
 * Defines the metadata for a setting.
 * `type` and `default` are used to infer the TypeScript type.
 * Other properties are for UI rendering or behavior control.
 */
export interface SettingDefinition {
  type: 'boolean' | 'string' | 'number' | 'array' | 'object';
  label: string;
  category: string;
  requiresRestart: boolean;
  default: unknown;
  description?: string;
  properties?: SettingsSchema; // For nested objects
}

export interface SettingsSchema {
  [key: string]: SettingDefinition;
}

/**
 * The canonical schema for all settings.
 * The structure of this object defines the structure of the `Settings` type.
 * `as const` is crucial for TypeScript to infer the most specific types possible.
 */
export const SETTINGS_SCHEMA = {
  // UI Settings
  theme: {
    type: 'string',
    label: 'Theme',
    category: 'UI',
    requiresRestart: false,
    default: undefined as string | undefined,
    description: 'The color theme for the UI.',
  },
  customThemes: {
    type: 'object',
    label: 'Custom Themes',
    category: 'UI',
    requiresRestart: false,
    default: {} as Record<string, CustomTheme>,
    description: 'Custom theme definitions.',
  },
  hideWindowTitle: {
    type: 'boolean',
    label: 'Hide Window Title',
    category: 'UI',
    requiresRestart: true,
    default: false,
    description: 'Hide the window title bar',
  },
  hideTips: {
    type: 'boolean',
    label: 'Hide Tips',
    category: 'UI',
    requiresRestart: false,
    default: false,
    description: 'Hide helpful tips in the UI',
  },
  hideBanner: {
    type: 'boolean',
    label: 'Hide Banner',
    category: 'UI',
    requiresRestart: false,
    default: false,
    description: 'Hide the application banner',
  },
  showMemoryUsage: {
    type: 'boolean',
    label: 'Show Memory Usage',
    category: 'UI',
    requiresRestart: false,
    default: false,
    description: 'Display memory usage information in the UI',
  },

  // General Settings
  usageStatisticsEnabled: {
    type: 'boolean',
    label: 'Enable Usage Statistics',
    category: 'General',
    requiresRestart: true,
    default: false,
    description: 'Enable collection of usage statistics',
  },
  autoConfigureMaxOldSpaceSize: {
    type: 'boolean',
    label: 'Auto Configure Max Old Space Size',
    category: 'General',
    requiresRestart: true,
    default: false,
    description: 'Automatically configure Node.js memory limits',
  },
  preferredEditor: {
    type: 'string',
    label: 'Preferred Editor',
    category: 'General',
    requiresRestart: false,
    default: undefined as string | undefined,
    description: 'The preferred editor to open files in.',
  },
  maxSessionTurns: {
    type: 'number',
    label: 'Max Session Turns',
    category: 'General',
    requiresRestart: false,
    default: undefined as number | undefined,
    description:
      'Maximum number of user/model/tool turns to keep in a session.',
  },
  memoryImportFormat: {
    type: 'string',
    label: 'Memory Import Format',
    category: 'General',
    requiresRestart: false,
    default: undefined as MemoryImportFormat | undefined,
    description: 'The format to use when importing memory.',
  },
  memoryDiscoveryMaxDirs: {
    type: 'number',
    label: 'Memory Discovery Max Dirs',
    category: 'General',
    requiresRestart: false,
    default: undefined as number | undefined,
    description: 'Maximum number of directories to search for memory.',
  },
  contextFileName: {
    type: 'object',
    label: 'Context File Name',
    category: 'General',
    requiresRestart: false,
    default: undefined as string | string[] | undefined,
    description: 'The name of the context file.',
  },

  // Mode Settings
  vimMode: {
    type: 'boolean',
    label: 'Vim Mode',
    category: 'Mode',
    requiresRestart: false,
    default: false,
    description: 'Enable Vim keybindings',
  },
  ideMode: {
    type: 'boolean',
    label: 'IDE Mode',
    category: 'Mode',
    requiresRestart: true,
    default: false,
    description: 'Enable IDE integration mode',
  },

  // Nested Settings Objects
  accessibility: {
    type: 'object',
    label: 'Accessibility',
    category: 'Accessibility',
    requiresRestart: true,
    default: {},
    description: 'Accessibility settings.',
    properties: {
      disableLoadingPhrases: {
        type: 'boolean',
        label: 'Disable Loading Phrases',
        category: 'Accessibility',
        requiresRestart: true,
        default: false,
        description: 'Disable loading phrases for accessibility',
      },
    },
  },
  checkpointing: {
    type: 'object',
    label: 'Checkpointing',
    category: 'Checkpointing',
    requiresRestart: true,
    default: {},
    description: 'Session checkpointing settings.',
    properties: {
      enabled: {
        type: 'boolean',
        label: 'Enable Checkpointing',
        category: 'Checkpointing',
        requiresRestart: true,
        default: false,
        description: 'Enable session checkpointing for recovery',
      },
    },
  },
  fileFiltering: {
    type: 'object',
    label: 'File Filtering',
    category: 'File Filtering',
    requiresRestart: true,
    default: {},
    description: 'Settings for git-aware file filtering.',
    properties: {
      respectGitIgnore: {
        type: 'boolean',
        label: 'Respect .gitignore',
        category: 'File Filtering',
        requiresRestart: true,
        default: false,
        description: 'Respect .gitignore files when searching',
      },
      respectGeminiIgnore: {
        type: 'boolean',
        label: 'Respect .geminiignore',
        category: 'File Filtering',
        requiresRestart: true,
        default: false,
        description: 'Respect .geminiignore files when searching',
      },
      enableRecursiveFileSearch: {
        type: 'boolean',
        label: 'Enable Recursive File Search',
        category: 'File Filtering',
        requiresRestart: true,
        default: true,
        description: 'Enable recursive file search functionality',
      },
    },
  },

  // Update Settings
  disableAutoUpdate: {
    type: 'boolean',
    label: 'Disable Auto Update',
    category: 'Updates',
    requiresRestart: false,
    default: false,
    description: 'Disable automatic updates',
  },

  // Advanced/Hidden Settings (not typically exposed in a UI)
  selectedAuthType: {
    type: 'string',
    label: 'Selected Auth Type',
    category: 'Advanced',
    requiresRestart: true,
    default: undefined as AuthType | undefined,
    description: 'The currently selected authentication type.',
  },
  useExternalAuth: {
    type: 'boolean',
    label: 'Use External Auth',
    category: 'Advanced',
    requiresRestart: true,
    default: undefined as boolean | undefined,
    description: 'Whether to use an external authentication flow.',
  },
  sandbox: {
    type: 'object',
    label: 'Sandbox',
    category: 'Advanced',
    requiresRestart: true,
    default: undefined as boolean | string | undefined,
    description:
      'Sandbox execution environment (can be a boolean or a path string).',
  },
  coreTools: {
    type: 'array',
    label: 'Core Tools',
    category: 'Advanced',
    requiresRestart: true,
    default: undefined as string[] | undefined,
    description: 'Paths to core tool definitions.',
  },
  excludeTools: {
    type: 'array',
    label: 'Exclude Tools',
    category: 'Advanced',
    requiresRestart: true,
    default: undefined as string[] | undefined,
    description: 'Tool names to exclude from discovery.',
  },
  toolDiscoveryCommand: {
    type: 'string',
    label: 'Tool Discovery Command',
    category: 'Advanced',
    requiresRestart: true,
    default: undefined as string | undefined,
    description: 'Command to run for tool discovery.',
  },
  toolCallCommand: {
    type: 'string',
    label: 'Tool Call Command',
    category: 'Advanced',
    requiresRestart: true,
    default: undefined as string | undefined,
    description: 'Command to run for tool calls.',
  },
  mcpServerCommand: {
    type: 'string',
    label: 'MCP Server Command',
    category: 'Advanced',
    requiresRestart: true,
    default: undefined as string | undefined,
    description: 'Command to start an MCP server.',
  },
  mcpServers: {
    type: 'object',
    label: 'MCP Servers',
    category: 'Advanced',
    requiresRestart: true,
    default: {} as Record<string, MCPServerConfig>,
    description: 'Configuration for MCP servers.',
  },
  allowMCPServers: {
    type: 'array',
    label: 'Allow MCP Servers',
    category: 'Advanced',
    requiresRestart: true,
    default: undefined as string[] | undefined,
    description: 'A whitelist of MCP servers to allow.',
  },
  excludeMCPServers: {
    type: 'array',
    label: 'Exclude MCP Servers',
    category: 'Advanced',
    requiresRestart: true,
    default: undefined as string[] | undefined,
    description: 'A blacklist of MCP servers to exclude.',
  },
  telemetry: {
    type: 'object',
    label: 'Telemetry',
    category: 'Advanced',
    requiresRestart: true,
    default: undefined as TelemetrySettings | undefined,
    description: 'Telemetry configuration.',
  },
  bugCommand: {
    type: 'object',
    label: 'Bug Command',
    category: 'Advanced',
    requiresRestart: false,
    default: undefined as BugCommandSettings | undefined,
    description: 'Configuration for the bug report command.',
  },
  summarizeToolOutput: {
    type: 'object',
    label: 'Summarize Tool Output',
    category: 'Advanced',
    requiresRestart: false,
    default: undefined as Record<string, { tokenBudget?: number }> | undefined,
    description: 'Settings for summarizing tool output.',
  },
  ideModeFeature: {
    type: 'boolean',
    label: 'IDE Mode Feature Flag',
    category: 'Advanced',
    requiresRestart: true,
    default: undefined as boolean | undefined,
    description: 'Internal feature flag for IDE mode.',
  },
  dnsResolutionOrder: {
    type: 'string',
    label: 'DNS Resolution Order',
    category: 'Advanced',
    requiresRestart: true,
    default: undefined as DnsResolutionOrder | undefined,
    description: 'The DNS resolution order.',
  },
} as const;

// Utility types to infer the Settings type from the schema.
// This uses the `default` value to infer the type, which is more precise
// than just using the `type` string. It also widens boolean literals to the
// general `boolean` type to avoid type errors when setting state.
type InferSettings<T extends SettingsSchema> = {
  -readonly [K in keyof T]?: T[K] extends { properties: SettingsSchema }
    ? InferSettings<T[K]['properties']>
    : T[K]['default'] extends boolean
      ? boolean
      : T[K]['default'];
};

// The generated Settings type, inferred from SETTINGS_SCHEMA.
export type Settings = InferSettings<typeof SETTINGS_SCHEMA>;
