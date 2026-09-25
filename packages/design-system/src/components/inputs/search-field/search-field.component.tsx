import { cn } from '../../../utils/cn.util';
import { guessPlatform } from '../../../utils/platform.util';
import { formatShortcut } from '../../../utils/shortcut.util';
import { Icon } from '../../display/icon';
import { TextField } from '../text-field/text-field.component';
import { useControllableState } from '../text-field/use-controllable-state';
import type { SearchFieldProps } from './search-field.types';
import { searchFieldHintVariants } from './search-field.variants';

/**
 * A search input: magnifier glyph, clear button, Escape clears, and an optional `⌘F` hint
 * shown while empty and unfocused.
 */
export function SearchField({
  shortcut,
  platform,
  clearOnEscape = true,
  value: valueProp,
  defaultValue = '',
  onValueChange,
  onKeyDown,
  placeholder = 'Search',
  size = 'md',
  labels,
  inputClassName,
  ...props
}: SearchFieldProps) {
  const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange);

  const handleKeyDown = (event: Parameters<NonNullable<SearchFieldProps['onKeyDown']>>[0]) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (clearOnEscape && event.key === 'Escape' && value.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      setValue('');
    }
  };

  const hint =
    shortcut != null && value.length === 0 ? (
      <kbd data-slot="search-field-hint" className={searchFieldHintVariants()}>
        {formatShortcut(shortcut, platform ?? guessPlatform())}
      </kbd>
    ) : undefined;

  return (
    <TextField
      type="search"
      role="searchbox"
      aria-label={
        props.label == null ? (props['aria-label'] ?? labels?.search ?? 'Search') : undefined
      }
      placeholder={placeholder}
      size={size}
      value={value}
      onValueChange={setValue}
      onKeyDown={handleKeyDown}
      leading={<Icon name="codicon:search" size={size === 'lg' ? 16 : 14} />}
      trailing={hint}
      clearable
      labels={labels}
      inputClassName={cn(
        '[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none',
        inputClassName,
      )}
      {...props}
    />
  );
}
