#!/usr/bin/env node

/*
 * Environment setup script for Arbitrum Tutorials.
 * Usage:
 *   yarn setup-envs              # prompts for values (L1_RPC optional), does NOT overwrite existing .env
 *   yarn setup-envs --update     # prompts and updates existing .env files as well
 */

/* eslint-disable no-await-in-loop */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const VARS = ['PRIVATE_KEY', 'CHAIN_RPC', 'PARENT_CHAIN_RPC', 'L1_RPC'];
const ARGS = new Set(process.argv.slice(2));
const UPDATE_EXISTING = ARGS.has('--update');

function log(msg) {
  console.log(msg);
}
function warn(msg) {
  console.warn(msg);
}
function error(msg) {
  console.error(msg);
}

async function promptForValues() {
  const values = {};
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((res) => rl.question(q, (ans) => res(ans.trim())));
  for (const v of VARS) {
    const optional = v === 'L1_RPC';
    const existing = process.env[v] ? ` [default: ${process.env[v]}]` : '';
    const prompt = optional ? `${v} (optional)${existing}: ` : `${v}${existing}: `;
    const ans = await ask(prompt);
    if (ans) {
      values[v] = ans;
    } else if (process.env[v]) {
      values[v] = process.env[v];
    } else if (!optional) {
      error(`Required value missing: ${v}`);
      process.exit(1);
    }
  }
  rl.close();
  return values;
}

function replaceOrAppend(contentLines, key, value) {
  const prefix = key + '=';
  let replaced = false;
  for (let i = 0; i < contentLines.length; i++) {
    const line = contentLines[i];
    if (line.startsWith(prefix)) {
      contentLines[i] = `${key}="${value}"`;
      replaced = true;
      break;
    }
  }
  if (!replaced) contentLines.push(`${key}="${value}"`);
}

function processSampleFile(samplePath, envPath, values) {
  const lines = fs.readFileSync(samplePath, 'utf8').split(/\r?\n/);
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  for (const v of VARS) {
    if (values[v]) replaceOrAppend(lines, v, values[v]);
  }

  const newContent = lines.join('\n') + '\n';
  fs.writeFileSync(envPath, newContent, 'utf8');
  if (samplePath !== envPath) {
    fs.unlinkSync(samplePath); // remove sample after successful creation
  }
}

function processDirectory(dir, values, summary) {
  const samplePath = path.join(dir, '.env-sample');
  const envPath = path.join(dir, '.env');
  const hasSample = fs.existsSync(samplePath);
  const hasEnv = fs.existsSync(envPath);

  if (!hasSample && !hasEnv) return;

  try {
    if (hasSample) {
      processSampleFile(samplePath, envPath, values);
      summary.updated.push(dir);
    } else if (hasEnv) {
      if (UPDATE_EXISTING) {
        processSampleFile(envPath, envPath, values);
        summary.updated.push(dir);
      } else {
        summary.skipped.push(dir);
      }
    }
  } catch (e) {
    summary.errors.push({ dir, error: e.message });
  }
}

function validate(values) {
  const pk = values.PRIVATE_KEY;
  if (!/^0x[a-fA-F0-9]{64}$/.test(pk)) {
    throw new Error('PRIVATE_KEY must be 0x + 64 hex characters.');
  }
  ['CHAIN_RPC', 'PARENT_CHAIN_RPC'].forEach((k) => {
    if (!/^https?:\/\/\S+$/i.test(values[k])) {
      throw new Error(`${k} must be an http(s) URL.`);
    }
  });
  if (values.L1_RPC && !/^https?:\/\/\S+$/i.test(values.L1_RPC)) {
    throw new Error('L1_RPC must be an http(s) URL if provided.');
  }
}

async function main() {
  log('Arbitrum Tutorials environment setup starting...');
  const values = await promptForValues();

  if (!values.PRIVATE_KEY || !values.CHAIN_RPC || !values.PARENT_CHAIN_RPC) {
    error('PRIVATE_KEY, CHAIN_RPC, and PARENT_CHAIN_RPC are required.');
    process.exit(1);
  }

  validate(values);

  const rootDir = path.resolve(__dirname, '..');
  const packagesDir = path.join(rootDir, 'packages');

  const summary = { updated: [], skipped: [], errors: [] };

  processDirectory(rootDir, values, summary);

  if (fs.existsSync(packagesDir)) {
    const entries = fs.readdirSync(packagesDir);
    for (const entry of entries) {
      const fullPath = path.join(packagesDir, entry);
      if (fs.statSync(fullPath).isDirectory()) {
        processDirectory(fullPath, values, summary);
      }
    }
  }

  log('Environment setup complete.');
  log(`Updated: ${summary.updated.length}`);
  if (summary.skipped.length)
    log(`Skipped (existing .env, no --update): ${summary.skipped.length}`);
  if (summary.errors.length) {
    warn('Errors encountered:');
    for (const e of summary.errors) warn(` - ${e.dir}: ${e.error}`);
  }

  log('\nExample: run a tutorial script after env creation:');
  log('  cd packages/greeter && npx hardhat run scripts/sendParentMessage.ts');
}

main().catch((e) => {
  error(e.stack || e.message);
  process.exit(1);
});
