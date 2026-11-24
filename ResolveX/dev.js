const { spawn } = require('child_process');
const path = require('path');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

function startProcess(name, cmd, args, cwd) {
  const child = spawn(cmd, args, {
    cwd: path.resolve(__dirname, cwd),
    stdio: 'inherit',
    shell: isWindows,
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[${name}] terminated with signal ${signal}`);
    } else if (code !== 0) {
      console.log(`[${name}] exited with code ${code}`);
    }
  });

  return child;
}

console.log('🚀 Starting ResolveX backend and frontend...\n');

const backend = startProcess('backend', 'node', ['src/server.js'], 'backend');
const frontend = startProcess('frontend', npmCmd, ['run', 'dev'], 'frontend');

function cleanExit() {
  try { backend.kill(); } catch (_) {}
  try { frontend.kill(); } catch (_) {}
  process.exit(0);
}

process.on('SIGINT', cleanExit);
process.on('SIGTERM', cleanExit);

