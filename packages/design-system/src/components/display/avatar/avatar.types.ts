import type { Avatar as BaseAvatar } from '@base-ui/react/avatar';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps extends Omit<BaseAvatar.Root.Props, 'className' | 'children'> {
  /** Image URL. Falls back to initials, then a person glyph. */
  src?: string | undefined;
  /** Person or entity name: used for the image `alt` and the initials. */
  name?: string | undefined;
  /** xs 16 · sm 20 · md 24 · lg 32 · xl 40. @default 'md' */
  size?: AvatarSize | undefined;
  /** `circle` for people, `square` for workspaces / orgs. @default 'circle' */
  shape?: 'circle' | 'square' | undefined;
  /** Presence dot. */
  status?: 'online' | 'away' | 'busy' | 'offline' | undefined;
  className?: string | undefined;
}
