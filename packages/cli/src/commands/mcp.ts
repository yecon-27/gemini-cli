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
import {
  MCPServerConfig,
  MCPServerStatus,
  createTransport,
} from '@google/gemini-cli-core';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { loadExtensions } from '../config/extension.js';

const COLOR_GREEN = '\u001b[32m';
const COLOR_YELLOW = '\u001b[33m';
const COLOR_RED = '\u001b[31m';
const RESET_COLOR = '\u001b[0m';

async function getMcpServersFromConfig(): Promise<
  Record<string, MCPServerConfig>
> {
  const settings = loadSettings(process.cwd());
  const extensions = loadExtensions(process.cwd());
  const mcpServers = { ...(settings.merged.mcpServers || {}) };
  for (const extension of extensions) {
    Object.entries(extension.config.mcpServers || {}).forEach(
      ([key, server]) => {
        if (mcpServers[key]) {
          return;
        }
        mcpServers[key] = {
          ...server,
          extensionName: extension.config.name,
        };
      },
    );
  }
  return mcpServers;
}

async function testMCPConnection(
  serverName: string,
  config: MCPServerConfig,
): Promise<void> {
  const client = new Client({
    name: 'mcp-test-client',
    version: '0.0.1',
  });

  try {
    // Use the same transport creation logic as core
    const transport = await createTransport(serverName, config, false);

    try {
      // Attempt actual MCP connection with short timeout
      await client.connect(transport, { timeout: 5000 }); // 5s timeout

      // Test basic MCP protocol by listing tools
      await client.listTools();

      await client.close();
    } catch (error) {
      await transport.close();
      throw error;
    }
  } catch (error) {
    await client.close();
    throw error;
  }
}

async function getServerStatus(
  serverName: string,
  server: MCPServerConfig,
): Promise<MCPServerStatus> {
  // Test all server types by attempting actual connection
  try {
    await testMCPConnection(serverName, server);
    return MCPServerStatus.CONNECTED;
  } catch (_error) {
    return MCPServerStatus.DISCONNECTED;
  }
}

async function listMcpServers(): Promise<void> {
  const mcpServers = await getMcpServersFromConfig();
  const serverNames = Object.keys(mcpServers);

  if (serverNames.length === 0) {
    console.log('No MCP servers configured.');
    return;
  }

  console.log('Configured MCP servers:\n');

  for (const serverName of serverNames) {
    const server = mcpServers[serverName];

    let status: MCPServerStatus;

    try {
      status = await getServerStatus(serverName, server);
    } catch (_error) {
      status = MCPServerStatus.DISCONNECTED;
    }

    let statusIndicator = '';
    let statusText = '';
    switch (status) {
      case MCPServerStatus.CONNECTED:
        statusIndicator = COLOR_GREEN + '✓' + RESET_COLOR;
        statusText = 'Connected';
        break;
      case MCPServerStatus.CONNECTING:
        statusIndicator = COLOR_YELLOW + '…' + RESET_COLOR;
        statusText = 'Connecting';
        break;
      case MCPServerStatus.DISCONNECTED:
      default:
        statusIndicator = COLOR_RED + '✗' + RESET_COLOR;
        statusText = 'Disconnected';
        break;
    }

    let serverInfo = `${serverName}: `;
    if (server.httpUrl) {
      serverInfo += `${server.httpUrl} (HTTP)`;
    } else if (server.url) {
      serverInfo += `${server.url} (SSE)`;
    } else if (server.command) {
      serverInfo += `command: ${server.command} ${server.args?.join(' ') || ''} (stdio)`;
    }

    console.log(`${statusIndicator} ${serverInfo} - ${statusText}`);
  }
}

async function addMcpServer(
  name: string,
  commandOrUrl: string,
  args: Array<string | number> | undefined,
  options: {
    scope: string;
    transport: string;
    env: string[] | undefined;
    header: string[] | undefined;
    timeout?: number;
    trust?: boolean;
  },
) {
  const { scope, transport, env, header, timeout, trust } = options;
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
        timeout,
        trust,
      };
      break;
    case 'http':
      newServer = {
        httpUrl: commandOrUrl,
        headers,
        timeout,
        trust,
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
        timeout,
        trust,
      };
      break;
  }

  const existingSettings = settings.forScope(settingsScope).settings;
  const mcpServers = existingSettings.mcpServers || {};

  const isExistingServer = !!mcpServers[name];
  if (isExistingServer) {
    console.log(
      `MCP server "${name}" is already configured within ${scope} settings.`,
    );
  }

  mcpServers[name] = newServer as MCPServerConfig;

  settings.setValue(settingsScope, 'mcpServers', mcpServers);

  // The settings object doesn't expose a direct way to save, so we have to do it manually.
  const fileContent = await fsp.readFile(settingsPath, 'utf-8');
  const jsonContent = JSON.parse(fileContent);
  jsonContent.mcpServers = mcpServers;
  await fsp.writeFile(settingsPath, JSON.stringify(jsonContent, null, 2));

  if (isExistingServer) {
    console.log(`MCP server "${name}" updated in ${scope} settings.`);
  } else {
    console.log(
      `MCP server "${name}" added to ${scope} settings. (${transport})`,
    );
  }
}

async function removeMcpServer(
  name: string,
  options: {
    scope: string;
  },
) {
  const { scope } = options;
  const settingsScope =
    scope === 'user' ? SettingScope.User : SettingScope.Workspace;
  const settingsPath = getSettingsFilePath(settingsScope, process.cwd());
  const settings = loadSettings(process.cwd());

  const existingSettings = settings.forScope(settingsScope).settings;
  const mcpServers = existingSettings.mcpServers || {};

  if (!mcpServers[name]) {
    console.log(`Server "${name}" not found in ${scope} settings.`);
    return;
  }

  delete mcpServers[name];

  settings.setValue(settingsScope, 'mcpServers', mcpServers);

  // The settings object doesn't expose a direct way to save, so we have to do it manually.
  const fileContent = await fsp.readFile(settingsPath, 'utf-8');
  const jsonContent = JSON.parse(fileContent);
  jsonContent.mcpServers = mcpServers;
  await fsp.writeFile(settingsPath, JSON.stringify(jsonContent, null, 2));

  console.log(`Server "${name}" removed from ${scope} settings.`);
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
        describe: 'Command (stdio) or URL (sse, http)',
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
          'Set HTTP headers for SSE and HTTP transports (e.g. -H "X-Api-Key: abc123" -H "Authorization: Bearer abc123")',
        type: 'array',
        string: true,
      })
      .option('timeout', {
        describe: 'Set connection timeout in milliseconds',
        type: 'number',
      })
      .option('trust', {
        describe: 'Trust the server',
        type: 'boolean',
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
        timeout: argv.timeout as number | undefined,
        trust: argv.trust as boolean | undefined,
      },
    );
  },
};

const removeCommand: CommandModule = {
  command: 'remove <name>',
  describe: 'Remove a server',
  builder: (yargs) =>
    yargs
      .usage('Usage: gemini mcp remove [options] <name>')
      .positional('name', {
        describe: 'Name of the server',
        type: 'string',
        demandOption: true,
      })
      .option('scope', {
        alias: 's',
        describe: 'Configuration scope (user or project)',
        type: 'string',
        default: 'project',
        choices: ['user', 'project'],
      }),
  handler: async (argv) => {
    await removeMcpServer(argv.name as string, {
      scope: argv.scope as string,
    });
  },
};

const listCommand: CommandModule = {
  command: 'list',
  describe: 'List all configured MCP servers',
  handler: async () => {
    await listMcpServers();
  },
};

export const mcpCommand: CommandModule = {
  command: 'mcp',
  describe: 'Manage MCP servers',
  builder: (yargs: Argv) =>
    yargs
      .command(addCommand)
      .command(removeCommand)
      .command(listCommand)
      .demandCommand(1, 'You need at least one command before continuing.')
      .version(false),
  handler: () => {
    // yargs will automatically show help if no subcommand is provided
    // thanks to demandCommand(1) in the builder.
  },
};
