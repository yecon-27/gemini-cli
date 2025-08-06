/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Colors } from '../colors.js';
import { shortenPath, tildeifyPath, tokenLimit } from '@google/gemini-cli-core';
import { ConsoleSummaryDisplay } from './ConsoleSummaryDisplay.js';
import process from 'node:process';
import Gradient from 'ink-gradient';
import { MemoryUsageDisplay } from './MemoryUsageDisplay.js';

import { DebugProfiler } from './DebugProfiler.js';

import { useTerminalSize } from '../hooks/useTerminalSize.js';
import { NARROW_BREAKPOINT } from '../constants.js';

interface FooterProps {
  model: string;
  targetDir: string;
  branchName?: string;
  debugMode: boolean;
  debugMessage: string;
  corgiMode: boolean;
  errorCount: number;
  showErrorDetails: boolean;
  showMemoryUsage?: boolean;
  promptTokenCount: number;
  nightly: boolean;
  vimMode?: string;
}

export const Footer: React.FC<FooterProps> = ({
  model,
  targetDir,
  branchName,
  debugMode,
  debugMessage,
  corgiMode,
  errorCount,
  showErrorDetails,
  showMemoryUsage,
  promptTokenCount,
  nightly,
  vimMode,
}) => {
  const { columns: terminalWidth } = useTerminalSize();
  const limit = tokenLimit(model);
  const percentage = promptTokenCount / limit;

  const isNarrow = terminalWidth < NARROW_BREAKPOINT;

  // Adjust path length based on terminal width
  const pathLength = Math.max(20, Math.floor(terminalWidth * 0.4));

  return (
    <Box
      justifyContent="space-between"
      width="100%"
      flexDirection={isNarrow ? 'column' : 'row'}
      alignItems={isNarrow ? 'flex-start' : 'center'}
    >
      <Box>
        {debugMode && <DebugProfiler />}
        {vimMode && <Text color={Colors.Gray}>[{vimMode}] </Text>}
        {nightly ? (
          <Gradient colors={Colors.GradientColors}>
            <Text>
              {shortenPath(tildeifyPath(targetDir), pathLength)}
              {branchName && <Text> ({branchName}*)</Text>}
            </Text>
          </Gradient>
        ) : (
          <Text color={Colors.LightBlue}>
            {shortenPath(tildeifyPath(targetDir), pathLength)}
            {branchName && <Text color={Colors.Gray}> ({branchName}*)</Text>}
          </Text>
        )}
        {debugMode && (
          <Text color={Colors.AccentRed}>
            {' ' + (debugMessage || '--debug')}
          </Text>
        )}
      </Box>

      {/* Middle Section: Centered Sandbox Info */}
      <Box
        flexGrow={isNarrow ? 0 : 1}
        alignItems="center"
        justifyContent={isNarrow ? 'flex-start' : 'center'}
        display="flex"
        paddingX={isNarrow ? 0 : 1}
        paddingTop={isNarrow ? 1 : 0}
      >
        {process.env.SANDBOX && process.env.SANDBOX !== 'sandbox-exec' ? (
          <Text color="green">
            {process.env.SANDBOX.replace(/^gemini-(?:cli-)?/, '')}
          </Text>
        ) : process.env.SANDBOX === 'sandbox-exec' ? (
          <Text color={Colors.AccentYellow}>
            macOS Seatbelt{' '}
            <Text color={Colors.Gray}>({process.env.SEATBELT_PROFILE})</Text>
          </Text>
        ) : (
          <Text color={Colors.AccentRed}>
            no sandbox <Text color={Colors.Gray}>(see /docs)</Text>
          </Text>
        )}
      </Box>

      {/* Right Section: Gemini Label and Console Summary */}
      <Box alignItems="center" paddingTop={isNarrow ? 1 : 0}>
        <Text color={Colors.AccentBlue}>
          {isNarrow ? '' : ' '}
          {model}{' '}
          <Text color={Colors.Gray}>
            ({((1 - percentage) * 100).toFixed(0)}% context left)
          </Text>
        </Text>
        {corgiMode && (
          <Text>
            <Text color={Colors.Gray}>| </Text>
            <Text color={Colors.AccentRed}>▼</Text>
            <Text color={Colors.Foreground}>(´</Text>
            <Text color={Colors.AccentRed}>ᴥ</Text>
            <Text color={Colors.Foreground}>`)</Text>
            <Text color={Colors.AccentRed}>▼ </Text>
          </Text>
        )}
        {!showErrorDetails && errorCount > 0 && (
          <Box>
            <Text color={Colors.Gray}>| </Text>
            <ConsoleSummaryDisplay errorCount={errorCount} />
          </Box>
        )}
        {showMemoryUsage && <MemoryUsageDisplay />}
      </Box>
    </Box>
  );
};
