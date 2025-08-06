/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoadingIndicator } from './LoadingIndicator.js';
import * as StreamingContext from '../contexts/StreamingContext.js';
import * as useTerminalSize from '../hooks/useTerminalSize.js';
import { StreamingState } from '../types.js';
import { Box, Text } from 'ink';

// Mock hooks
vi.mock('../contexts/StreamingContext.js', () => ({
  useStreamingContext: vi.fn(),
}));

vi.mock('../hooks/useTerminalSize.js', () => ({
  useTerminalSize: vi.fn(),
}));

const useStreamingContextMock = vi.mocked(StreamingContext.useStreamingContext);
const useTerminalSizeMock = vi.mocked(useTerminalSize.useTerminalSize);

const renderWithMocks = (
  props: React.ComponentProps<typeof LoadingIndicator>,
  terminalWidth: number,
  streamingState: StreamingState,
) => {
  useTerminalSizeMock.mockReturnValue({ columns: terminalWidth, rows: 24 });
  useStreamingContextMock.mockReturnValue(streamingState);
  return render(<LoadingIndicator {...props} />);
};

describe('<LoadingIndicator />', () => {
  const rightContent = (
    <Box>
      <Text>Right Content</Text>
    </Box>
  );

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should not render when streaming state is Idle', () => {
    const { lastFrame } = renderWithMocks(
      { elapsedTime: 10, rightContent },
      120,
      StreamingState.Idle,
    );
    expect(lastFrame()).toBe('');
  });

  describe('Responsiveness', () => {
    it('should render rightContent on the same line on a wide screen', () => {
      const { lastFrame } = renderWithMocks(
        {
          currentLoadingPhrase: 'Loading...',
          elapsedTime: 10,
          rightContent,
        },
        120,
        StreamingState.Streaming,
      );

      const output = lastFrame();
      expect(output).toContain('Loading...');
      expect(output).toContain('Right Content');
      // Expect a single line containing both
      const lines = output.split('\n');
      const lineWithContent = lines.find(
        (l) => l.includes('Loading...') && l.includes('Right Content'),
      );
      expect(lineWithContent).toBeDefined();
    });

    it('should render rightContent on a new line on a narrow screen', () => {
      const { lastFrame } = renderWithMocks(
        {
          currentLoadingPhrase: 'Loading...',
          elapsedTime: 10,
          rightContent,
        },
        60, // Narrow width
        StreamingState.Streaming,
      );

      const output = lastFrame();
      expect(output).toContain('Loading...');
      expect(output).toContain('Right Content');
      expect(output).toContain('esc to cancel');

      // Expect three separate lines
      const lines = output.split('\n');
      const line1 = lines.find((l) => l.includes('Loading...'));
      const line2 = lines.find((l) => l.includes('esc to cancel'));
      const line3 = lines.find((l) => l.includes('Right Content'));
      expect(line1).toBeDefined();
      expect(line2).toBeDefined();
      expect(line3).toBeDefined();
      expect(line1).not.toContain('Right Content');
      expect(line1).not.toContain('esc to cancel');
    });

    it('should switch layout at the 80-column breakpoint', () => {
      // At 80 columns, should be on one line
      const { lastFrame: wideFrame } = renderWithMocks(
        {
          currentLoadingPhrase: 'Loading...',
          elapsedTime: 10,
          rightContent,
        },
        80,
        StreamingState.Streaming,
      );
      const wideOutput = wideFrame();
      const wideLine = wideOutput
        .split('\n')
        .find((l) => l.includes('Loading...') && l.includes('Right Content'));
      expect(wideLine).toBeDefined();

      // At 79 columns, should be on two lines
      const { lastFrame: narrowFrame } = renderWithMocks(
        {
          currentLoadingPhrase: 'Loading...',
          elapsedTime: 10,
          rightContent,
        },
        79,
        StreamingState.Streaming,
      );
      const narrowOutput = narrowFrame();
      const narrowLine1 = narrowOutput
        .split('\n')
        .find((l) => l.includes('Loading...'));
      const narrowLine2 = narrowOutput
        .split('\n')
        .find((l) => l.includes('Right Content'));
      expect(narrowLine1).toBeDefined();
      expect(narrowLine2).toBeDefined();
      expect(narrowLine1).not.toContain('Right Content');
    });
  });
});
