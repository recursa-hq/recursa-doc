import { spawn, type ChildProcess } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { getFreePort } from './test-util';
import simpleGit from 'simple-git';

export interface InspectorHarnessContext {
  graphPath: string;
  queuePath: string;
  cleanup: () => Promise<void>;
  runQuery: (
    query: string,
    mockResponses: string[],
    transport?: 'stdio' | 'sse'
  ) => Promise<any>;
}

/**
 * Creates an isolated environment for running Inspector E2E tests.
 * Sets up a temp Git repo and mock queue file.
 */
export const createInspectorHarness = async (): Promise<InspectorHarnessContext> => {
  // 1. Create isolated temp directory
  const tempPrefix = path.join(os.tmpdir(), 'recursa-inspector-test-');
  const graphPath = await fs.mkdtemp(tempPrefix);
  const queuePath = path.join(graphPath, 'mock-queue.json');

  // 2. Initialize Git Repo (required for git ops to work)
  const git = simpleGit(graphPath);
  await git.init();
  await git.addConfig('user.name', 'Test User');
  await git.addConfig('user.email', 'test@example.com');

  // Create initial commit so we have a HEAD
  await fs.writeFile(path.join(graphPath, '.gitignore'), 'node_modules/\n');
  await git.add('.');
  await git.commit('Initial commit');

  const cleanup = async () => {
    try {
      await fs.rm(graphPath, { recursive: true, force: true });
    } catch (e) {
      console.error(`Cleanup warning: ${e}`);
    }
  };

  const runQuery = async (
    query: string,
    mockResponses: string[],
    transport: 'stdio' | 'sse' = 'stdio'
  ): Promise<any> => {
    // 1. Write the sequence of mock LLM responses to the queue file
    await fs.writeFile(queuePath, JSON.stringify(mockResponses));

    let serverProcess: ChildProcess | null = null;
    let inspectorUrl = '';

    try {
      // 2. Setup Transport
      if (transport === 'sse') {
        const port = await getFreePort();
        
        // Start the server as a background process
        serverProcess = spawn('npx', ['tsx', 'src/server.ts'], {
          env: {
            ...process.env,
            PORT: port.toString(),
            TRANSPORT_TYPE: 'sse',
            OPENROUTER_API_KEY: 'TEST_MOCK_KEY',
            MOCK_QUEUE_FILE: queuePath,
            KNOWLEDGE_GRAPH_PATH: graphPath,
            CI: 'true', // Suppress interactive prompts
          },
          stdio: 'pipe',
        });

        // Wait for the "running on SSE" log message
        await new Promise<void>((resolve, reject) => {
          if (!serverProcess) return reject(new Error('Failed to spawn server'));

          let started = false;
          const onData = (data: Buffer) => {
            if (data.toString().includes('running on SSE')) {
              started = true;
              resolve();
            }
          };

          serverProcess.stdout?.on('data', onData);
          serverProcess.stderr?.on('data', onData);

          serverProcess.on('error', reject);
          serverProcess.on('exit', (code) => {
            if (!started)
              reject(new Error(`Server exited early with code ${code}`));
          });

          // 10s timeout for startup
          setTimeout(() => {
            if (!started) reject(new Error('Timeout waiting for SSE server'));
          }, 10000);
        });

        inspectorUrl = `http://localhost:${port}/sse`;
      }

      // 3. Build Inspector Command
      // usage: npx @modelcontextprotocol/inspector --cli [server_command | url] --method ...
      const args = ['-y', '@modelcontextprotocol/inspector', '--cli'];

      if (transport === 'stdio') {
        // Pass Env Vars via -e flags to the Inspector
        args.push('-e', 'OPENROUTER_API_KEY=TEST_MOCK_KEY');
        args.push('-e', `MOCK_QUEUE_FILE=${queuePath}`);
        args.push('-e', `KNOWLEDGE_GRAPH_PATH=${graphPath}`);

        // Server Command
        args.push('npx', 'tsx', 'src/server.ts');
      } else {
        // SSE URL
        args.push(inspectorUrl);
      }

      // 4. Add Method Arguments
      args.push('--method', 'tools/call');
      args.push('--tool-name', 'process_query');
      // Tool arguments are passed as key=value pairs
      args.push('--tool-arg', `query=${query}`);
      args.push('--tool-arg', `runId=test-${Date.now()}`);

      // 5. Execute Inspector
      const resultJson = await new Promise<string>((resolve, reject) => {
        const proc = spawn('npx', args, {
          env: { ...process.env, CI: 'true', PATH: process.env.PATH },
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (d) => (stdout += d));
        proc.stderr.on('data', (d) => (stderr += d));

        proc.on('close', (code) => {
          if (code === 0) {
            resolve(stdout);
          } else {
            reject(new Error(`Inspector failed (code ${code}): ${stderr}`));
          }
        });
        proc.on('error', reject);
      });

      // 6. Parse and Return
      try {
        return JSON.parse(resultJson);
      } catch (e) {
        throw new Error(`Failed to parse inspector JSON output: ${resultJson}`);
      }
    } finally {
      // Cleanup background process if needed
      if (serverProcess) {
        serverProcess.kill();
      }
    }
  };

  return {
    graphPath,
    queuePath,
    cleanup,
    runQuery,
  };
};