import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
import * as runtime from './index.js';

// Checks value-export coverage, including re-exports, not every call signature.
// The installed-package consumer check separately verifies package resolution.
const entry = fileURLToPath(new URL('./index.d.ts', import.meta.url));
function declaredValues(transform = text => text) {
  const host = ts.createCompilerHost({});
  const readFile = host.readFile;
  host.readFile = path => {
    const text = readFile(path);
    return path === entry ? transform(text) : text;
  };
  const program = ts.createProgram([entry], {}, host);
  const checker = program.getTypeChecker();
  const module = checker.getSymbolAtLocation(program.getSourceFile(entry));
  return checker.getExportsOfModule(module).filter(symbol => {
    if (symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    return symbol.flags & ts.SymbolFlags.Value;
  }).map(symbol => symbol.name).sort();
}
const actual = Object.keys(runtime).sort();
function assertParity(declared) {
  assert.ok(actual.length > 0, 'runtime exports must be discovered');
  assert.equal(declared.length, actual.length, 'value export counts must match');
  assert.deepEqual(declared, actual);
}
test('root declarations cover every runtime value export', () => {
  assertParity(declaredValues());
});
test('export coverage rejects a missing declaration', () => {
  assert.throws(() => assertParity(declaredValues(text =>
    text.replace(/^export declare function esc.*\n/m, '')
  )), /value export counts must match/);
});
test('export coverage rejects an invented declaration', () => {
  assert.throws(() => assertParity(declaredValues(text =>
    text + '\nexport declare const nonexistentExport: string;\n'
  )), /value export counts must match/);
});
