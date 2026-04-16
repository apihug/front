#!/usr/bin/env node
// scripts/lefthook-install.mjs

import { execSync } from 'child_process';
import isCi from 'is-ci';

// Helper to check if git is available
function isGitAvailable() {
    try {
        execSync('git --version', { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

// Helper to get Git repository root
function getGitRoot() {
    try {
        const root = execSync('git rev-parse --show-toplevel', {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'ignore']
        }).trim();
        return root;
    } catch {
        return null;
    }
}

// Main logic
function main() {
    // 1. Skip in CI environments
    if (isCi) {
        console.log('[INFO] CI environment detected – skipping lefthook install');
        return;
    }

    // 2. Check if git is installed
    if (!isGitAvailable()) {
        console.log('[WARN] git not found – skipping lefthook install');
        return;
    }

    // 3. Check if we are inside a Git repository
    const gitRoot = getGitRoot();
    if (!gitRoot) {
        console.log('[INFO] Not inside a Git repository – skipping lefthook install');
        return;
    }

    // 4. Install lefthook hooks in the Git root
    const originalCwd = process.cwd();
    try {
        process.chdir(gitRoot);
        console.log(`[INFO] Installing lefthook in ${gitRoot}`);
        execSync('pnpm exec lefthook install', { stdio: 'inherit' });
        console.log('[INFO] lefthook installed successfully');
    } catch (error) {
        console.warn('[WARN] Failed to install lefthook, continuing without hooks:', error.message);
    } finally {
        process.chdir(originalCwd);
    }
}

main();
