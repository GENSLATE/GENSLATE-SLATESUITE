import type { CodiconRef } from '@genslate/design-system';

import type { ProfileColor, ProfileIcon } from '../../ipc/terminal.types';

const ICONS: Readonly<Record<ProfileIcon, CodiconRef>> = {
  powershell: 'codicon:terminal-powershell',
  cmd: 'codicon:terminal-cmd',
  linux: 'codicon:terminal-linux',
  ubuntu: 'codicon:terminal-ubuntu',
  debian: 'codicon:terminal-debian',
  bash: 'codicon:terminal-bash',
  zsh: 'codicon:terminal',
  fish: 'codicon:terminal',
  nu: 'codicon:terminal',
  git: 'codicon:terminal-git-bash',
  vs: 'codicon:tools',
  terminal: 'codicon:terminal',
};

/** The Codicon for a profile's shell. */
export function profileIcon(icon: ProfileIcon): CodiconRef {
  return ICONS[icon];
}

const TEXT: Readonly<Record<ProfileColor, string>> = {
  frost: 'text-profile-frost',
  'aurora-red': 'text-profile-red',
  'aurora-orange': 'text-profile-orange',
  'aurora-yellow': 'text-profile-yellow',
  'aurora-green': 'text-profile-green',
  'aurora-purple': 'text-profile-purple',
};

const BG: Readonly<Record<ProfileColor, string>> = {
  frost: 'bg-profile-frost',
  'aurora-red': 'bg-profile-red',
  'aurora-orange': 'bg-profile-orange',
  'aurora-yellow': 'bg-profile-yellow',
  'aurora-green': 'bg-profile-green',
  'aurora-purple': 'bg-profile-purple',
};

/** Text colour utility for a profile or tab colour (`null`: the muted default). */
export function colorText(color: ProfileColor | null): string {
  return color === null ? 'text-fg-muted' : TEXT[color];
}

export function colorFill(color: ProfileColor | null): string {
  return color === null ? 'bg-fg-muted' : BG[color];
}

export const COLOR_CHOICES: readonly { readonly value: ProfileColor; readonly label: string }[] = [
  { value: 'frost', label: 'Frost' },
  { value: 'aurora-red', label: 'Red' },
  { value: 'aurora-orange', label: 'Orange' },
  { value: 'aurora-yellow', label: 'Yellow' },
  { value: 'aurora-green', label: 'Green' },
  { value: 'aurora-purple', label: 'Purple' },
];
