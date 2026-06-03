import { spawn } from 'node:child_process';
import { once } from 'node:events';
import process from 'node:process';

const runOnce = async (command, args) => {
  const child = spawn(command, args, {
    stdio: 'inherit',
  });

  const [code] = await once(child, 'exit');

  if (code !== 0) {
    process.exit(code || 1);
  }
};

const spawnLongRunning = (name, command, args) => {
  const child = spawn(command, args, {
    stdio: 'inherit',
  });

  child.on('exit', (code, signal) => {
    if (isShuttingDown) {
      return;
    }

    console.error(`${name} stopped${signal ? ` by ${signal}` : ` with code ${code}`}.`);
    shutdown(code || 1);
  });

  return child;
};

let isShuttingDown = false;
let children = [];

const shutdown = (code = 0) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  children.forEach((child) => {
    if (!child.killed) {
      child.kill();
    }
  });
  process.exit(code);
};

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

await runOnce(process.execPath, ['scripts/generate-post-pages.mjs']);

children = [
  spawnLongRunning('countdown data server', process.execPath, [
    'scripts/countdown-data-server.mjs',
  ]),
  spawnLongRunning('next dev server', process.execPath, [
    'node_modules/next/dist/bin/next',
  ]),
];
