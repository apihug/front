import archiver from 'archiver';
import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const outputZipPath = path.join(rootDir, 'vben.zip');
const versionPropertiesPath = path.join(rootDir, 'version.properties');
const repoUrl = 'https://github.com/vbenjs/vue-vben-admin.git';

const selectedDirectories = ['internal', 'packages', 'playground', 'scripts'];

const selectedAppDirectory = path.join('apps', 'web-antdv-next');
const cloneRetryCount = 18;

async function main() {
  const keepTemp = process.argv.includes('--keep-temp');
  const tempRootDir = await mkdtemp(path.join(os.tmpdir(), 'vben-zip-'));
  const cloneDir = path.join(tempRootDir, 'vben');

  logStep(`Created temp workspace: ${tempRootDir}`);

  try {
    await cloneRepo(cloneDir);
    logStep(`Using cloned repo: ${cloneDir}`);
    await createArchive(cloneDir);
    await updateVersionProperties(cloneDir);
    logStep(`Archive ready: ${outputZipPath}`);
  } finally {
    if (keepTemp) {
      logStep(`Keeping temp workspace: ${tempRootDir}`);
    } else {
      logStep('Cleaning up temp workspace');
      await rm(tempRootDir, { force: true, recursive: true });
      logStep('Cleanup complete');
    }
  }
}

async function cloneRepo(cloneDir) {
  let lastError;

  for (let attempt = 1; attempt <= cloneRetryCount; attempt += 1) {
    try {
      logStep(`Clone attempt ${attempt}/${cloneRetryCount}`);
      await rm(cloneDir, { force: true, recursive: true });
      await git(
        ['clone', '--depth', '1', '--progress', repoUrl, cloneDir],
        rootDir,
        { streamOutput: true },
      );
      logStep('Clone complete');
      return;
    } catch (error) {
      lastError = error;
      logStep(`Clone attempt ${attempt} failed: ${error.message}`);

      if (attempt === cloneRetryCount) {
        break;
      }

      logStep(`Retrying in ${attempt} second(s)`);
      await delay(1000 * attempt);
    }
  }

  throw lastError;
}

async function createArchive(sourceRootDir) {
  const archiveEntries = [];

  logStep('Collecting root files');
  archiveEntries.push(...(await listRootFiles(sourceRootDir)));

  for (const directory of selectedDirectories) {
    logStep(`Collecting files from ${directory}`);
    archiveEntries.push(...(await listFilesRecursive(sourceRootDir, directory)));
  }

  logStep(`Collecting files from ${toArchivePath(selectedAppDirectory)}`);
  archiveEntries.push(
    ...(await listFilesRecursive(sourceRootDir, selectedAppDirectory)),
  );

  archiveEntries.sort((left, right) => left.localeCompare(right));

  logStep(`Writing ${archiveEntries.length} files to ${path.basename(outputZipPath)}`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  const output = createWriteStream(outputZipPath);

  const closePromise = new Promise((resolve, reject) => {
    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);
    archive.on('warning', (error) => {
      if (error.code === 'ENOENT') {
        logStep(`warning: ${error.message}`);
        return;
      }

      reject(error);
    });
  });

  archive.pipe(output);

  for (const relativePath of archiveEntries) {
    archive.file(path.join(sourceRootDir, relativePath), {
      name: toArchivePath(relativePath),
    });
  }

  logStep('Finalizing archive');
  await archive.finalize();
  await closePromise;

  logStep(`Created ${path.basename(outputZipPath)} (${archive.pointer()} bytes)`);
}

async function updateVersionProperties(sourceRootDir) {
  const packageJsonPath = path.join(sourceRootDir, 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  const currentProperties = await readProperties(versionPropertiesPath);
  const nextProperties = new Map(currentProperties);

  nextProperties.set('vben', String(packageJson.version ?? ''));
  nextProperties.set('build', formatTimestamp(new Date()));

  const lines = [];

  if (nextProperties.has('version')) {
    lines.push(`version=${nextProperties.get('version')}`);
    nextProperties.delete('version');
  }

  if (nextProperties.has('vben')) {
    lines.push(`vben=${nextProperties.get('vben')}`);
    nextProperties.delete('vben');
  }

  if (nextProperties.has('build')) {
    lines.push(`build=${nextProperties.get('build')}`);
    nextProperties.delete('build');
  }

  for (const [key, value] of nextProperties) {
    lines.push(`${key}=${value}`);
  }

  await writeFile(versionPropertiesPath, `${lines.join('\n')}\n`, 'utf8');
  logStep(`Updated version.properties with vben=${packageJson.version}`);
}

async function listRootFiles(sourceRootDir) {
  const entries = await readdir(sourceRootDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

async function listFilesRecursive(sourceRootDir, relativeDir) {
  const absoluteDir = path.join(sourceRootDir, relativeDir);
  const dirStats = await stat(absoluteDir).catch(() => null);

  if (!dirStats || !dirStats.isDirectory()) {
    logStep(`Skipping missing directory: ${toArchivePath(relativeDir)}`);
    return [];
  }

  const results = [];
  await walkFiles(absoluteDir, relativeDir, results);
  return results;
}

async function walkFiles(currentDir, currentRelativeDir, results) {
  const entries = await readdir(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(currentDir, entry.name);
    const relativePath = path.join(currentRelativeDir, entry.name);

    if (entry.isDirectory()) {
      await walkFiles(absolutePath, relativePath, results);
      continue;
    }

    if (entry.isFile()) {
      results.push(relativePath);
    }
  }
}

async function readProperties(filePath) {
  const content = await readFile(filePath, 'utf8').catch(() => '');
  const properties = new Map();

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    properties.set(key, value);
  }

  return properties;
}

function git(args, cwd, options = {}) {
  const { streamOutput = false } = options;

  return new Promise((resolve, reject) => {
    const stdio = streamOutput ? ['ignore', 'inherit', 'inherit'] : ['ignore', 'pipe', 'pipe'];
    const child = spawn('git', args, {
      cwd,
      stdio,
    });

    let stdout = '';
    let stderr = '';
    let heartbeat;

    if (streamOutput) {
      heartbeat = setInterval(() => {
        logStep(`git still running: git ${args.join(' ')}`);
      }, 10000);
    }

    if (!streamOutput) {
      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on('error', reject);
    child.on('close', (code) => {
      if (heartbeat) {
        clearInterval(heartbeat);
      }

      if (code === 0) {
        resolve(stdout);
        return;
      }

      reject(
        new Error(
          `git ${args.join(' ')} failed with exit code ${code}${stderr ? `: ${stderr.trim()}` : ''}`,
        ),
      );
    });
  });
}

function toArchivePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function formatTimestamp(date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function logStep(message) {
  process.stdout.write(`[vben-zip] ${message}\n`);
}

main().catch((error) => {
  process.stderr.write(`[vben-zip] ${error.message}\n`);
  process.exitCode = 1;
});
