/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as fsp from 'fs/promises';
import { mcpCommand } from './mcp.js';
import yargs from 'yargs';
import { getSettingsFilePath, loadSettings } from '../config/settings.js';

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock('../config/settings.js', async () => {
  const actual = await vi.importActual('../config/settings.js');
  return {
    ...actual,
    loadSettings: vi.fn(),
    getSettingsFilePath: vi.fn(),
  };
});

const mockedFsp = fsp as unknown as {
  readFile: vi.Mock;
  writeFile: vi.Mock;
};
const mockedLoadSettings = loadSettings as vi.Mock;
const mockedGetSettingsFilePath = getSettingsFilePath as vi.Mock;

describe('mcp command', () => {
  let parser: yargs.Argv;

  beforeEach(() => {
    vi.resetAllMocks();
    const yargsInstance = yargs([]).command(mcpCommand);
    parser = yargsInstance;
  });

  it('should add a stdio server to project settings', async () => {
    const settingsPath = '/test/project/.gemini/settings.json';
    mockedGetSettingsFilePath.mockReturnValue(settingsPath);
    mockedLoadSettings.mockReturnValue({
      forScope: () => ({ settings: {} }),
      setValue: vi.fn(),
    });
    mockedFsp.readFile.mockResolvedValue('{}');

    await parser.parseAsync(
      'mcp add my-server /path/to/server arg1 arg2 -e FOO=bar',
    );

    expect(mockedFsp.writeFile).toHaveBeenCalledWith(
      settingsPath,
      JSON.stringify(
        {
          mcpServers: {
            'my-server': {
              command: '/path/to/server',
              args: ['arg1', 'arg2'],
              env: { FOO: 'bar' },
            },
          },
        },
        null,
        2,
      ),
    );
  });

  it('should add an sse server to user settings', async () => {
    const settingsPath = '/test/user/.gemini/settings.json';
    mockedGetSettingsFilePath.mockReturnValue(settingsPath);
    mockedLoadSettings.mockReturnValue({
      forScope: () => ({ settings: {} }),
      setValue: vi.fn(),
    });
    mockedFsp.readFile.mockResolvedValue('{}');

    await parser.parseAsync(
      'mcp add --transport sse sse-server https://example.com/sse-endpoint --scope user -H "X-API-Key: your-key"',
    );

    expect(mockedFsp.writeFile).toHaveBeenCalledWith(
      settingsPath,
      JSON.stringify(
        {
          mcpServers: {
            'sse-server': {
              url: 'https://example.com/sse-endpoint',
              headers: { 'X-API-Key': 'your-key' },
            },
          },
        },
        null,
        2,
      ),
    );
  });

  it('should add an http server to project settings', async () => {
    const settingsPath = '/test/project/.gemini/settings.json';
    mockedGetSettingsFilePath.mockReturnValue(settingsPath);
    mockedLoadSettings.mockReturnValue({
      forScope: () => ({ settings: {} }),
      setValue: vi.fn(),
    });
    mockedFsp.readFile.mockResolvedValue('{}');

    await parser.parseAsync(
      'mcp add --transport http http-server https://example.com/mcp -H "Authorization: Bearer your-token"',
    );

    expect(mockedFsp.writeFile).toHaveBeenCalledWith(
      settingsPath,
      JSON.stringify(
        {
          mcpServers: {
            'http-server': {
              httpUrl: 'https://example.com/mcp',
              headers: { Authorization: 'Bearer your-token' },
            },
          },
        },
        null,
        2,
      ),
    );
  });
});
