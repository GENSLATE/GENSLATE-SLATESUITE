import { describe, expect, test } from 'bun:test';

import { baseName, isInside, parentOf, quotePath, tildify } from '../../../src/model/path.util';
import { cdCommand, shellPath, wslPath } from '../../../src/model/shell.util';

describe('paths', () => {
  test('base names and parents on both kinds of path', () => {
    expect(baseName('/home/you/src/')).toBe('src');
    expect(baseName('C:\\')).toBe('C:\\');
    expect(parentOf('C:\\Users\\you')).toBe('C:\\Users');
    expect(parentOf('C:\\Users')).toBe('C:\\');
    expect(parentOf('/home')).toBe('/');
    expect(parentOf('/')).toBeNull();
  });

  test('Windows paths compare without case; POSIX paths with it', () => {
    expect(isInside('c:\\users\\YOU\\src', 'C:\\Users\\you')).toBe(true);
    expect(isInside('/home/You/src', '/home/you')).toBe(false);
    expect(isInside('/home/youth', '/home/you')).toBe(false);
  });

  test('home shows as ~', () => {
    expect(tildify('C:\\Users\\you\\Projects', 'C:\\Users\\you')).toBe('~\\Projects');
    expect(tildify('/home/you', '/home/you/')).toBe('~');
    expect(tildify('/etc', '/home/you')).toBe('/etc');
  });

  test('quoting only when needed, per shell', () => {
    expect(quotePath('/usr/local/bin', 'posix')).toBe('/usr/local/bin');
    expect(quotePath("/tmp/it's here", 'posix')).toBe(`'/tmp/it'\\''s here'`);
    expect(quotePath("C:\\it's here", 'powershell')).toBe(`'C:\\it''s here'`);
    expect(quotePath('C:\\Program Files', 'cmd')).toBe('"C:\\Program Files"');
  });
});

describe('shells', () => {
  test('WSL sees Windows drives under /mnt', () => {
    expect(wslPath('C:\\Users\\you')).toBe('/mnt/c/Users/you');
    expect(wslPath('D:\\')).toBe('/mnt/d');
    expect(shellPath('C:\\My Files', 'wsl')).toBe("'/mnt/c/My Files'");
    expect(shellPath('/home/you', 'wsl')).toBe('/home/you');
  });

  test('cd commands (cmd changes drive with /d)', () => {
    expect(cdCommand('D:\\work', 'cmd')).toBe('cd /d D:\\work');
    expect(cdCommand('C:\\Program Files', 'pwsh')).toBe("cd 'C:\\Program Files'");
    expect(cdCommand('/srv/app', 'bash')).toBe('cd /srv/app');
  });
});
