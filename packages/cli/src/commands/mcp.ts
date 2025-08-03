/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CommandModule, Argv } from 'yargs';
import {
  loadSettings,
  SettingScope,
  getSettingsFilePath,
} from '../config/settings.js';
import * as fsp from 'fs/promises';
import { MCPServerConfig } from '@google/gemini-cli-core';

async function addMcpServer(
  name: string,
  commandOrUrl: string,
  args: Array<string | number> | undefined,
  options: {
    scope: string;
    transport: string;
    env: string[] | undefined;
    header: string[] | undefined;
  },
) {
  const { scope, transport, env, header } = options;
  const settingsScope =
    scope === 'user' ? SettingScope.User : SettingScope.Workspace;
  const settingsPath = getSettingsFilePath(settingsScope, process.cwd());
  const settings = loadSettings(process.cwd());

  let newServer: Partial<MCPServerConfig> = {};

  const headers = header?.reduce(
    (acc, curr) => {
      const [key, value] = curr.split(':');
      if (key && value) {
        acc[key.trim()] = value.trim();
      }
      return acc;
    },
    {} as Record<string, string>,
  );

  switch (transport) {
    case 'sse':
      newServer = {
        url: commandOrUrl,
        headers,
      };
      break;
    case 'http':
      newServer = {
        httpUrl: commandOrUrl,
        headers,
      };
      break;
    case 'stdio':
    default:
      newServer = {
        command: commandOrUrl,
        args: args?.map(String),
        env: env?.reduce(
          (acc, curr) => {
            const [key, value] = curr.split('=');
            if (key && value) {
              acc[key] = value;
            }
            return acc;
          },
          {} as Record<string, string>,
        ),
      };
      break;
  }

  const existingSettings = settings.forScope(settingsScope).settings;
  const mcpServers = existingSettings.mcpServers || {};
  mcpServers[name] = newServer as MCPServerConfig;

  settings.setValue(settingsScope, 'mcpServers', mcpServers);

  // The settings object doesn't expose a direct way to save, so we have to do it manually.
  const fileContent = await fsp.readFile(settingsPath, 'utf-8');
  const jsonContent = JSON.parse(fileContent);
  jsonContent.mcpServers = mcpServers;
  await fsp.writeFile(settingsPath, JSON.stringify(jsonContent, null, 2));

  console.log(`Server "${name}" added to ${scope} settings.`);
}

const addCommand: CommandModule = {
  command: 'add <name> <commandOrUrl> [args...]',
  describe: 'Add a server',
  builder: (yargs) =>
    yargs
      .usage('Usage: gemini mcp add [options] <name> <commandOrUrl> [args...]')
      .positional('name', {
        describe: 'Name of the server',
        type: 'string',
        demandOption: true,
      })
      .positional('commandOrUrl', {
        describe: 'Command or URL',
        type: 'string',
        demandOption: true,
      })
      .option('scope', {
        alias: 's',
        describe: 'Configuration scope (user or project)',
        type: 'string',
        default: 'project',
        choices: ['user', 'project'],
      })
      .option('transport', {
        alias: 't',
        describe: 'Transport type (stdio, sse, http)',
        type: 'string',
        default: 'stdio',
        choices: ['stdio', 'sse', 'http'],
      })
      .option('env', {
        alias: 'e',
        describe: 'Set environment variables (e.g. -e KEY=value)',
        type: 'array',
        string: true,
      })
      .option('header', {
        alias: 'H',
        describe:
          'Set HTTP headers for SSE and HTTP transports (e.g. -H "X-Api-Key: abc123" -H "X-Custom: value")',
        type: 'array',
        string: true,
      }),
  handler: async (argv) => {
    await addMcpServer(
      argv.name as string,
      argv.commandOrUrl as string,
      argv.args as Array<string | number>,
      {
        scope: argv.scope as string,
        transport: argv.transport as string,
        env: argv.env as string[],
        header: argv.header as string[],
      },
    );
  },
};

export const mcpCommand: CommandModule = {
  command: 'mcp',
  describe: 'Manage MCP servers',
  builder: (yargs: Argv) =>
    yargs
      .command(addCommand)
      .demandCommand(1, 'You need at least one command before continuing.'),
  handler: () => {
    // yargs will automatically show help if no subcommand is provided
    // thanks to demandCommand(1) in the builder.
  },
};
