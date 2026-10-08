import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = resolve(import.meta.dirname, '../src');

interface SourceFile {
  path: string; // relative to src, with forward slashes
  code: string;
  imports: string[]; // relative imports resolved against src, or bare package names
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? listFiles(join(dir, entry.name)) : entry.name.endsWith('.ts') ? [join(dir, entry.name)] : [],
  );
}

function toSrcPath(absolute: string): string {
  return relative(SRC, absolute).replaceAll('\\', '/');
}

const files: SourceFile[] = listFiles(SRC).map((absolute) => {
  const code = readFileSync(absolute, 'utf8');
  const imports = [...code.matchAll(/from '([^']+)'/g)].map(([, target]) =>
    target!.startsWith('.') ? toSrcPath(resolve(dirname(absolute), target!)).replace(/\.js$/, '.ts') : target!,
  );
  return { path: toSrcPath(absolute), code, imports };
});

function inLayer(layer: string) {
  return files.filter((file) => file.path.startsWith(`${layer}/`));
}

describe('architecture rules', () => {
  it('the domain depends on nothing but itself', () => {
    for (const file of inLayer('domain')) {
      expect(file.imports.filter((target) => !target.startsWith('domain/')), file.path).toEqual([]);
    }
  });

  it('the application layer only knows the domain (no provider, no framework)', () => {
    for (const file of inLayer('application')) {
      const forbidden = file.imports.filter((target) => !target.startsWith('domain/') && !target.startsWith('application/'));
      expect(forbidden, file.path).toEqual([]);
    }
  });

  it('only the composition root wires infrastructure', () => {
    const outsiders = files.filter(
      (file) => !file.path.startsWith('infrastructure/') && !['container.ts', 'config.ts'].includes(file.path),
    );
    for (const file of outsiders) {
      expect(file.imports.filter((target) => target.startsWith('infrastructure/')), file.path).toEqual([]);
    }
  });

  it('provider DTOs never leave their adapter folder', () => {
    for (const file of files) {
      for (const target of file.imports.filter((t) => t.endsWith('.dto.ts'))) {
        expect(dirname(target), `${file.path} imports ${target}`).toBe(dirname(file.path));
      }
    }
  });

  it('no concrete implementation is instantiated with new (errors and Map excepted)', () => {
    for (const file of files) {
      const instantiated = [...file.code.matchAll(/\bnew\s+([A-Z]\w*)/g)].map(([, name]) => name!);
      expect(instantiated.filter((name) => !name.endsWith('Error') && name !== 'Map'), file.path).toEqual([]);
    }
  });
});
