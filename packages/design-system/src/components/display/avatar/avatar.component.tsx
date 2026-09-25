import { Avatar as BaseAvatar } from '@base-ui/react/avatar';
import { cn } from '../../../utils/cn.util';
import { Icon } from '../icon/icon.component';
import type { AvatarProps } from './avatar.types';
import { avatarVariants } from './avatar.variants';

/** Up to two initials from a name: "Arctic Ice Studio" → "AI". */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const second = words.length > 1 ? (words[1]?.[0] ?? '') : (words[0]?.[1] ?? '');
  return (first + second).toUpperCase();
}

/** A person or workspace picture with an initials fallback (Base UI Avatar). */
export function Avatar({
  src,
  name,
  size = 'md',
  shape = 'circle',
  status,
  className,
  ...props
}: AvatarProps) {
  const styles = avatarVariants({ size, shape, status });
  const initials = name ? initialsOf(name) : '';
  return (
    <BaseAvatar.Root
      data-slot="avatar"
      role="img"
      aria-label={name}
      className={cn(styles.root(), className)}
      {...props}
    >
      <span className={styles.clip()}>
        {src && (
          <BaseAvatar.Image data-slot="avatar-image" src={src} alt="" className={styles.image()} />
        )}
        <BaseAvatar.Fallback data-slot="avatar-fallback" className={styles.fallback()}>
          {initials || (
            <Icon name="codicon:account" size={size === 'xl' || size === 'lg' ? 16 : 12} />
          )}
        </BaseAvatar.Fallback>
      </span>
      {status && (
        <span data-slot="avatar-status" data-status={status} className={styles.status()} />
      )}
    </BaseAvatar.Root>
  );
}
