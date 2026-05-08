import * as path from 'path';
import { spawnSync } from 'child_process';
import { normalizeMongoUri } from '../src/config/mongo-uri';

const backendRoot = path.join(__dirname, '..');
const nodeCommand = process.execPath;
const normalizedMongoUri = normalizeMongoUri(process.env.MONGODB_URI);

const seedScripts = [
  'scripts/seed-users.run.ts',
  'scripts/seed-challenges.run.ts',
  'scripts/seed-competitions.run.ts',
  'scripts/seed-platform-demo.run.ts',
  'scripts/seed-extra-data.run.ts',
  'scripts/seed-missing-demo-data.run.ts',
  'scripts/seed-notifications.run.ts',
  'scripts/normalize-starter-accepted.run.ts',
] as const;

function runScript(script: string) {
  const env = {
    ...process.env,
    ...(normalizedMongoUri ? { MONGODB_URI: normalizedMongoUri } : {}),
  };
  const result = spawnSync(
    nodeCommand,
    ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register', script],
    {
      cwd: backendRoot,
      stdio: 'inherit',
      env,
    },
  );

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`Seed script failed: ${script} (exit code ${result.status ?? 'unknown'})`);
  }
}

function main() {
  console.log('Starting full database seed...');
  for (const script of seedScripts) {
    console.log(`\n=== Running ${script} ===`);
    runScript(script);
  }
  console.log('\nFull database seed completed.');
}

main();