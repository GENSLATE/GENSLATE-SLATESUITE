import { describe, expect, test } from 'bun:test';

import {
  ancestry,
  baseName,
  isInside,
  isRoot,
  joinPath,
  parentOf,
  samePath,
  separatorOf,
} from '../../../src/model/path.util';

describe('path helpers', () => {
  test('POSIX paths', () => {
    expect(separatorOf('/home/me')).toBe('/');
    expect(baseName('/home/me/notes.md')).toBe('notes.md');
    expect(baseName('/home/me/')).toBe('me');
    expect(parentOf('/home/me')).toBe('/home');
    expect(parentOf('/home')).toBe('/');
    expect(parentOf('/')).toBeNull();
    expect(isRoot('/')).toBe(true);
    expect(joinPath('/home', 'me')).toBe('/home/me');
    expect(joinPath('/', 'etc')).toBe('/etc');
  });

  test('Windows drive and UNC paths', () => {
    expect(separatorOf('C:\\Users')).toBe('\\');
    expect(parentOf('C:\\Users\\me')).toBe('C:\\Users');
    expect(parentOf('C:\\Users')).toBe('C:\\');
    expect(parentOf('C:\\')).toBeNull();
    expect(baseName('C:\\')).toBe('C:');
    expect(parentOf('\\\\server\\share\\docs')).toBe('\\\\server\\share');
    expect(parentOf('\\\\server\\share')).toBeNull();
    expect(joinPath('C:\\', 'Users')).toBe('C:\\Users');
  });

  test('ancestry lists every folder from the root', () => {
    expect(ancestry('/home/me/Documents').map((crumb) => crumb.name)).toEqual([
      '/',
      'home',
      'me',
      'Documents',
    ]);
    expect(ancestry('D:\\Photos\\2026').map((crumb) => crumb.path)).toEqual([
      'D:\\',
      'D:\\Photos',
      'D:\\Photos\\2026',
    ]);
  });

  test('isInside and samePath', () => {
    expect(isInside('/home/me/a', '/home/me')).toBe(true);
    expect(isInside('/home/meow', '/home/me')).toBe(false);
    expect(isInside('/home/me', '/home/me/')).toBe(true);
    expect(samePath('C:\\Users\\Me', 'c:\\users\\me\\')).toBe(true);
    expect(samePath('/Home', '/home')).toBe(false);
  });
});
