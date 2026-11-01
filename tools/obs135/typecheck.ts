// Static compiler check of the isolated graph. Does not start Vite or execute main.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { insertionInputs, transformInput, type InputPath } from './plugin';

const transformed = new Map((Object.keys(insertionInputs) as InputPath[]).map(path => [
  resolve(path).replace(/\\/g, '/').toLowerCase(), transformInput(readFileSync(path, 'utf8'), path).code,
]));
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
if (config.error) throw Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
const host = ts.createCompilerHost(parsed.options);
const read = host.readFile.bind(host);
host.readFile = path => transformed.get(resolve(path).replace(/\\/g, '/').toLowerCase()) ?? read(path);
const program = ts.createProgram(parsed.fileNames, parsed.options, host);
const errors = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
if (errors.length) {
  process.stderr.write(ts.formatDiagnosticsWithColorAndContext(errors, { getCurrentDirectory: () => process.cwd(), getCanonicalFileName: file => file, getNewLine: () => '\n' }));
  process.exitCode = 1;
} else process.stdout.write('OBS135 transformed graph: static typecheck passed; no app/server/browser execution.\n');
