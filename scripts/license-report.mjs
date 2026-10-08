// Prints the dependency audit used in the README: direct packages with installed / latest version,
// then a license summary of the whole transitive tree. No extra dependency: reads package-lock.json.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const PERMISSIVE = new Set(['MIT', 'ISC', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', '0BSD', 'BlueOak-1.0.0', 'CC0-1.0', 'Python-2.0']);

const installed = Object.entries(lock.packages)
  .filter(([path]) => path.startsWith('node_modules/'))
  .map(([path, info]) => ({ name: path.slice(path.lastIndexOf('node_modules/') + 13), ...info }));

function latest(name) {
  return JSON.parse(execSync(`npm view ${name} version time.modified --json`, { encoding: 'utf8' }));
}

console.log('## Direct dependencies\n');
console.log('| Package | Type | License | Installed | Latest stable | Last publish |');
console.log('|---|---|---|---|---|---|');
for (const [type, deps] of [['runtime', pkg.dependencies], ['dev', pkg.devDependencies]]) {
  for (const name of Object.keys(deps ?? {})) {
    const local = installed.find((entry) => entry.name === name);
    const remote = latest(name);
    console.log(`| ${name} | ${type} | ${local.license} | ${local.version} | ${remote.version} | ${remote['time.modified'].slice(0, 10)} |`);
  }
}

const byLicense = new Map();
for (const entry of installed) {
  const license = entry.license ?? 'UNKNOWN';
  byLicense.set(license, [...(byLicense.get(license) ?? []), entry]);
}

console.log(`\n## Whole tree (${installed.length} packages, transitive included)\n`);
console.log('| License | Count | Runtime packages |');
console.log('|---|---|---|');
for (const [license, entries] of [...byLicense].sort((a, b) => b[1].length - a[1].length)) {
  const runtime = entries.filter((entry) => !entry.dev).map((entry) => entry.name);
  console.log(`| ${license} | ${entries.length} | ${runtime.join(', ') || '-'} |`);
}

const toReview = installed.filter((entry) => !PERMISSIVE.has(entry.license));
console.log(`\nNon-permissive or unknown licenses: ${toReview.length ? toReview.map((e) => `${e.name} (${e.license})`).join(', ') : 'none'}`);
