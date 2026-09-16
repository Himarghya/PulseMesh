import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

console.log(`
\x1b[36m⚡ ==========================================================\x1b[0m
\x1b[36m⚡   PULSEMESH DISTRIBUTED PLATFORM & CYBER COMMAND MATRIX    \x1b[0m
\x1b[36m⚡ ==========================================================\x1b[0m
\x1b[32m✔ Mode: Development (Zero-Config Transactional Engine)\x1b[0m
\x1b[35m🛰 Launching API Server, Worker Fleet, Recovery Watchdog & Vite UI...\x1b[0m
`);

const processes = [];

function startProcess(name, cmd, args, cwd, color) {
  const child = spawn(cmd, args, {
    cwd,
    stdio: 'pipe',
    shell: true,
    env: { ...process.env, NODE_ENV: 'development' },
  });

  child.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        console.log(`${color}[${name}]\x1b[0m ${line}`);
      }
    }
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        console.error(`${color}[${name}:ERR]\x1b[0m ${line}`);
      }
    }
  });

  child.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.log(`${color}[${name}]\x1b[0m Exited with code ${code}`);
    }
  });

  processes.push(child);
  return child;
}

// 1. Start API Server with Embedded Engine (Port 3000)
startProcess('ENGINE', 'node', ['apps/api/src/index.js'], rootDir, '\x1b[36m');

// 2. Start Vite React Dashboard (Port 5173)
startProcess(
  'VITE',
  npmCmd,
  ['run', 'dev', '--workspace=@pulsemesh/dashboard'],
  rootDir,
  '\x1b[35m'
);

console.log(`
\x1b[32m✔ PulseMesh services running concurrently.\x1b[0m
\x1b[1m\x1b[36m🌐 Cyber-Telemetry Dashboard: \x1b[4mhttp://localhost:5173\x1b[0m
\x1b[1m\x1b[34m📡 REST API & Metrics:        \x1b[4mhttp://localhost:3000/metrics\x1b[0m
\x1b[90m(Press Ctrl+C to terminate all services)\x1b[0m
`);

function cleanExit() {
  console.log('\n\x1b[33m[PulseMesh] Gracefully stopping all child processes...\x1b[0m');
  for (const proc of processes) {
    try {
      proc.kill('SIGTERM');
    } catch {
      // ignore
    }
  }
  setTimeout(() => process.exit(0), 1000);
}

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);
