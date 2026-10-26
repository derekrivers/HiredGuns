import { readFile, mkdir, realpath, lstat, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve, relative } from 'node:path';
import { importCharacters } from '../src/import/characters';

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 && !(args.length === 3 && args[1] === '--out')) throw new Error('Usage: npm run import:characters -- <raw-characters> [--out .local/<filename>.json]. Without --out, only source identity is printed.');
  const catalog = await importCharacters(await readFile(args[0]!));
  if (!args[2]) { process.stdout.write(`${JSON.stringify(catalog.source, null, 2)}\n`); return; }
  const root = await realpath(process.cwd()), local = resolve(root, '.local'), output = resolve(root, args[2]);
  if (dirname(output) !== local || !/^[a-zA-Z0-9_-]+\.json$/.test(basename(output))) throw new Error('Output must be .local/<simple-filename>.json within the current workspace.');
  await mkdir(local, { recursive: true });
  if (relative(root, await realpath(local)) !== '.local') throw new Error('.local must not redirect outside the workspace.');
  try { if ((await lstat(output)).isSymbolicLink()) throw new Error('Refusing a symbolic-link output.'); }
  catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error; }
  await writeFile(output, `${JSON.stringify(catalog, null, 2)}\n`, { flag: 'wx' });
  process.stderr.write(`Character report written to ${output}\n`);
}
main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
