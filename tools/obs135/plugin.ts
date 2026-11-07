import { createHash } from 'node:crypto';
import ts from 'typescript';
import type { Plugin } from 'vite';

// Hashes cover UTF-8 source after CRLF -> LF normalization only. No fuzzy matching.
export const insertionInputs = Object.freeze({
  'src/main.ts': 'eddddc963fb48bdb13e260aff530b2b1404deab1c4c405ebcce7e95b3be7fe0c',
  'src/input/router.ts': 'f4b349b32c0c7517e7226045b4d967dc9ce669da5eb1fb181d28c45d38906497',
  'src/sim/clock.ts': 'c86e640ecfbdfed4c1d60b5d0eeadc09671ad6fd58f0abcc5226ab06f44784ef',
});
export type InputPath = keyof typeof insertionInputs;

function once(source: string, before: string, after: string): string {
  if (source.split(before).length !== 2) throw Error(`OBS135 unmatched insertion: ${before.slice(0, 100)}`);
  return source.replace(before, after);
}

/** Exact textual boundaries first; AST handles recursive assignment/effect insertion. */
function prepareMain(source: string): string {
  const start = source.indexOf("get<HTMLInputElement>('checkpoint-file').addEventListener('change', async event => {");
  const end = source.indexOf('\n\nconst allKeys', start);
  if (start < 0 || end < 0) throw Error('OBS135 restore boundary missing');
  let restore = source.slice(start, end);
  restore = once(restore, "'change', async event => {", "'change', __obs.restoreHandler(async (event: Event, __obsContext) => {");
  restore = once(restore, "const generation = ++loadGeneration; loading = true;", "const generation = ++loadGeneration; const __obsOp = __obsContext.op = __obs.start('restore', generation); loading = true;");
  restore = once(restore, '  try {', "  try {\n    __obs.emit(__obsOp, {kind:'phase', phase:'reading'});");
  restore = once(restore, 'const json = await file.text();\n    if (generation !== loadGeneration) return;', "const json = await file.text();\n    if (generation !== loadGeneration) { __obs.recognized(__obsOp, 'pre-import'); return; }\n    __obsOp.stage = 'importer'; __obs.emit(__obsOp, {kind:'phase', phase:'importing'});");
  restore = once(restore, '    if (generation !== loadGeneration) return;', "    if (generation !== loadGeneration) { __obs.recognized(__obsOp, 'install-guard'); return; }\n    __obsOp.stage = 'pre-write';");
  restore = once(restore, 'level = restoredLevel; session = restoredSession; world = restored;', '__obs.pair(__obsOp, () => { level = restoredLevel; session = restoredSession; world = restored; }, true);');
  restore = once(restore, '} catch (error) { if (generation === loadGeneration)', "} catch (error) { __obs.failure(__obsOp, error, 'caught'); if (generation !== loadGeneration) __obs.recognized(__obsOp, 'error-guard'); if (generation === loadGeneration)");
  restore = once(restore, 'finally { if (generation === loadGeneration)', "finally { __obsOp.stage = 'cleanup'; if (generation === loadGeneration)");
  restore = once(restore, '\n});', '\n}));');
  source = source.slice(0, start) + restore + source.slice(end);

  const retryStart = source.indexOf("get<HTMLButtonElement>('reset').addEventListener('click', () => {");
  const retryEnd = source.indexOf("\nget<HTMLButtonElement>('demo')", retryStart);
  let retry = source.slice(retryStart, retryEnd);
  retry = once(retry, '  loadGeneration++; loading = false;', '  return __obs.retry(++loadGeneration, __obsOp => { loading = false;');
  retry = once(retry, 'session = nextSession; world = nextWorld;', '__obs.pair(__obsOp, () => { session = nextSession; world = nextWorld; });');
  retry = once(retry, '\n});', '\n  });\n});');
  source = source.slice(0, retryStart) + retry + source.slice(retryEnd);

  source = once(source, 'onProgress:progress=>{', "onProgress:progress=>{ const __obsOp = __obs.owner(generation); __obs.emit(__obsOp, {kind:'progress', ...progress}); return __obs.scope(__obsOp, () => {");
  source = once(source, 'if(began)updateMissionHud();\n }};', 'if(began)updateMissionHud();\n }); }};');
  source = once(source, 'if(generation!==loadGeneration)return;', "if(generation!==loadGeneration){ __obs.emit(__obsOp,{kind:'effect',target:'status',applied:false}); __obs.emit(__obsOp,{kind:'effect',target:'controls',applied:false}); return; }");
  source = once(source, 'isCurrent:()=>generation===loadGeneration', 'isCurrent:()=>__obs.engineCurrent(generation)');

  // Test-only copies live inside the private class scopes in the isolated graph.
  const registration = `
const __obs = createObserver({generation:()=>loadGeneration, state:()=>({
  pair:{session,world},level,presentation:{paused,loading,graphicsLost,rendererPresent:!!renderer,
  timeoutRecoveryGeneration,corpseRecoveryGeneration,...presentationDOM(app),
  assignments:router.assignments, keys:[...keys],activationKeys:[...activationKeys],
  routerRepeat:router.__obs135CopyRepeat(),clockAccumulator:clock.__obs135CopyAccumulator(),events,
  pending:{gateActor:pendingGateActor,doorAction:pendingDoorAction,storageActor:pendingStorageActor,
    corpseActor:pendingCorpseActor,selection:pendingSelectionOperation,inventory:pendingInventoryOperation}}
})});
`;
  source = once(source, 'const app = document.querySelector', registration + '\nconst app = document.querySelector');
  source = "import { createObserver, presentationDOM } from '../tools/obs135/runtime';\n" + source;
  source += `
__obs.ready();
if (Object.hasOwn(window, '__OBS135_TEST__')) { __obs.invalidate(); throw Error('Duplicate OBS135 registration'); }
Object.defineProperty(window, '__OBS135_TEST__', {value:__obs.port,writable:false,configurable:false});
window.addEventListener('pagehide',()=>__obs.dispose(),{once:true});
const __obsHot = (import.meta as ImportMeta & {hot?:{dispose:(callback:()=>void)=>void;on:(event:string,callback:()=>void)=>void}}).hot;
if(__obsHot) { __obsHot.dispose(()=>__obs.dispose()); __obsHot.on('obs135-invalid',()=>__obs.dispose()); }
`;
  return source;
}

export interface InsertionSite { kind: string; line: number; text: string }
export function transformInput(input: string, path: InputPath): { code: string; sites: InsertionSite[] } {
  const normalized = input.replace(/\r\n/g, '\n');
  if (createHash('sha256').update(normalized).digest('hex') !== insertionInputs[path]) throw Error(`OBS135 input seal mismatch: ${path}`);
  if (path === 'src/input/router.ts') return { code: once(normalized, '  reset(): void', '  __obs135CopyRepeat() { return [...this.last.entries()]; }\n  reset(): void'), sites: [{kind:'class-copy',line:38,text:'InputRouter.last entries'}] };
  if (path === 'src/sim/clock.ts') return { code: once(normalized, '  reset(): void', '  __obs135CopyAccumulator() { return this.accumulator; }\n  reset(): void'), sites: [{kind:'class-copy',line:11,text:'FixedClock.accumulator'}] };
  const original = ts.createSourceFile(path, normalized, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const sites: InsertionSite[] = [];
  const pairNames = new Set(['session', 'world', 'level']);
  function inventory(node: ts.Node): void {
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(node.left) && pairNames.has(node.left.text)) sites.push({ kind:'pair-assignment',line:original.getLineAndCharacterOfPosition(node.getStart()).line+1,text:node.getText(original) });
    ts.forEachChild(node, inventory);
  }
  inventory(original);
  // Exact source seal + complete write inventory are both reviewable. Initial declarations
  // are revision zero; this inventory includes every later installed identifier assignment.
  const prepared = prepareMain(normalized);
  const file = ts.createSourceFile(path, prepared, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const f = ts.factory;
  const arrow = (body: ts.Expression | ts.Block) => f.createArrowFunction(undefined, undefined, [], undefined, f.createToken(ts.SyntaxKind.EqualsGreaterThanToken), body);
  const call = (name: string, args: ts.Expression[]) => f.createCallExpression(f.createPropertyAccessExpression(f.createIdentifier('__obs'), name), undefined, args);
  const current = () => f.createPropertyAccessExpression(f.createIdentifier('__obs'), 'current');
  const effectMethods = new Set(['refresh','feedback','render','fill','focus','blur','reset','clear','delete']);
  const effectFunctions = new Set(['setPaused','showSession','updateMissionHud','updateHud','updateLevelInfo','refreshEncounterPanel']);
  const properties = new Set(['textContent','innerHTML','hidden','disabled','value','checked','selectedIndex']);
  const result = ts.transform(file, [context => {
    let lexicalOwner: 'op' | 'context' | null = null;
    const visitor: ts.Visitor = node => {
      const prior = lexicalOwner;
      if (ts.isArrowFunction(node) && ts.isBlock(node.body) && node.body.statements.some(statement => ts.isVariableStatement(statement) && statement.declarationList.declarations.some(declaration => declaration.name.getText(file) === '__obsOp'))) lexicalOwner = 'op';
      if (ts.isArrowFunction(node) && node.parameters.some(parameter => parameter.name.getText(file) === '__obsOp')) lexicalOwner = 'op';
      if (ts.isArrowFunction(node) && node.parameters.some(parameter => parameter.name.getText(file) === '__obsContext')) lexicalOwner = 'context';
      const owner = () => lexicalOwner === 'context' ? f.createPropertyAccessExpression(f.createIdentifier('__obsContext'), 'op') : lexicalOwner === 'op' ? f.createIdentifier('__obsOp') : current();
      let visited = ts.visitEachChild(node, visitor, context);
      if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) && node.operand.getText(file) === 'loadGeneration' && !lexicalOwner && !(ts.isCallExpression(node.parent) && node.parent.expression.getText(file) === '__obs.retry')) visited = call('uncoveredGeneration', [visited as ts.Expression]);
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        if (ts.isIdentifier(node.left) && pairNames.has(node.left.text)) visited = call('written', [f.createNumericLiteral(file.getLineAndCharacterOfPosition(node.getStart()).line+1), visited as ts.Expression]);
        else if ((ts.isPropertyAccessExpression(node.left) && properties.has(node.left.name.text)) || (ts.isIdentifier(node.left) && ['loading','paused','timeoutRecoveryGeneration','corpseRecoveryGeneration'].includes(node.left.text))) {
          const target = node.left.getText(file).includes('error') ? 'error' : ts.isIdentifier(node.left) && node.left.text === 'loading' ? 'loading' : ts.isPropertyAccessExpression(node.left) && node.left.name.text === 'textContent' ? 'status' : 'controls';
          visited = call('effectValue', [owner(), f.createStringLiteral(target), visited as ts.Expression]);
        }
      }
      if (ts.isCallExpression(node)) {
        const callee = node.expression;
        if (ts.isIdentifier(callee) && ['importTrainingSession','importCheckpoint'].includes(callee.text)) visited = call('delivery', [f.createIdentifier('__obsOp'), visited as ts.Expression]);
        else if ((ts.isIdentifier(callee) && effectFunctions.has(callee.text)) || (ts.isPropertyAccessExpression(callee) && effectMethods.has(callee.name.text) && callee.expression.getText(file) !== 'renderer')) {
          // Helper calls need a synchronous owner scope; simple leaf effects retain
          // their original evaluation in the caller (including TS flow narrowing).
          const scoped = ts.isIdentifier(callee) || (ts.isPropertyAccessExpression(callee) && callee.name.text === 'refresh');
          visited = call(scoped ? 'effect' : 'effectValue', [owner(), f.createStringLiteral('controls'), scoped ? arrow(visited as ts.Expression) : visited as ts.Expression]);
        }
      }
      if (ts.isBlock(node) && ts.isBlock(visited)) {
        const statements: ts.Statement[] = [];
        for (let index = 0; index < node.statements.length; index++) {
          const isWrite = (statement: ts.Statement) => ts.isExpressionStatement(statement) && ts.isBinaryExpression(statement.expression) && statement.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(statement.expression.left) && pairNames.has(statement.expression.left.text);
          if (!isWrite(node.statements[index]!)) { statements.push(visited.statements[index]!); continue; }
          const group: ts.Statement[] = [visited.statements[index]!];
          while (index + 1 < node.statements.length && isWrite(node.statements[index + 1]!)) group.push(visited.statements[++index]!);
          if (group.length === 1) statements.push(group[0]!);
          else statements.push(f.createExpressionStatement(call('pair', [owner(), arrow(f.createBlock(group, true))])));
        }
        visited = f.updateBlock(visited, statements);
      }
      if (ts.isCallExpression(node) && node.expression.getText(file) === 'clock.advance' && ts.isCallExpression(visited)) {
        const callback = visited.arguments[1];
        if (!callback || !ts.isArrowFunction(callback) || !ts.isBlock(callback.body)) throw Error('OBS135 simulation transaction mismatch');
        const wrapped = f.updateArrowFunction(callback, callback.modifiers, callback.typeParameters, callback.parameters, callback.type, callback.equalsGreaterThanToken, call('pair', [current(), arrow(callback.body)]));
        visited = f.updateCallExpression(visited, visited.expression, visited.typeArguments, [visited.arguments[0]!, wrapped]);
      }
      if (ts.isFunctionDeclaration(visited) && visited.name?.text === 'installLevel' && visited.body) visited = f.updateFunctionDeclaration(visited, visited.modifiers, visited.asteriskToken, visited.name, visited.typeParameters, visited.parameters, visited.type,
        f.createBlock([f.createReturnStatement(call('pair',[current(),arrow(visited.body)]))],true));
      lexicalOwner = prior;
      return visited;
    };
    return root => ts.visitNode(root, visitor) as ts.SourceFile;
  }]);
  const code = ts.createPrinter().printFile(result.transformed[0] as ts.SourceFile);
  result.dispose();
  return { code, sites };
}

export function obs135Plugin(): Plugin {
  return {
    name: 'obs135-isolated-test-graph', enforce: 'pre',
    configResolved(config) {
      if (config.command !== 'serve') throw Error('OBS135 is local test-server only');
    },
    transform(source, id) {
      const clean = id.split('?')[0]!.replace(/\\/g, '/');
      const path = (Object.keys(insertionInputs) as InputPath[]).find(path => clean.endsWith('/' + path));
      if (!path) return null;
      return { code: transformInput(source, path).code, map: null };
    },
    handleHotUpdate(context) {
      context.server.ws.send({type:'custom',event:'obs135-invalid',data:{}});
      throw Error('OBS135 requires a fresh document and server after any source change');
    },
  };
}
