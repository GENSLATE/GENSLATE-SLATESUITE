import { Select as BaseSelect } from '@base-ui/react/select';
import { Fragment } from 'react';
import { FieldFrame } from '../field/field-frame.component';
import type { SelectOption, SelectProps } from './select.types';
import {
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectSeparator,
} from './select-item.component';
import { SelectPopup } from './select-popup.component';
import { SelectTrigger } from './select-trigger.component';

function groupOptions<Value>(options: readonly SelectOption<Value>[]) {
  const groups = new Map<string | undefined, SelectOption<Value>[]>();
  for (const option of options) {
    const list = groups.get(option.group);
    if (list) list.push(option);
    else groups.set(option.group, [option]);
  }
  return [...groups.entries()];
}

/**
 * A macOS pop-up button. Simple API: `<Select options={…} placeholder="…" />`. Compound API:
 * `<Select><SelectTrigger /><SelectPopup><SelectItem value="…">…</SelectItem></SelectPopup></Select>`.
 */
export function Select<Value = string>({
  label,
  description,
  error,
  invalid,
  options,
  placeholder,
  size = 'md',
  onValueChange,
  disabled,
  name,
  className,
  triggerClassName,
  children,
  items: itemsProp,
  ...rootProps
}: SelectProps<Value>) {
  const isInvalid = invalid ?? error != null;
  const items =
    options?.map((option) => ({ value: option.value, label: option.label })) ?? itemsProp;

  return (
    <FieldFrame
      label={label}
      description={description}
      error={error}
      invalid={isInvalid}
      disabled={disabled}
      name={name}
      className={className}
    >
      <BaseSelect.Root<Value>
        items={items}
        disabled={disabled}
        onValueChange={(value) => onValueChange?.(value)}
        {...rootProps}
      >
        {options ? (
          <>
            <SelectTrigger size={size} placeholder={placeholder} className={triggerClassName} />
            <SelectPopup>
              {groupOptions(options).map(([group, groupItems], index) => {
                const rows = groupItems.map((option) => (
                  <SelectItem
                    key={String(option.value)}
                    value={option.value}
                    label={option.label}
                    icon={option.icon}
                    disabled={option.disabled}
                  >
                    {option.label}
                  </SelectItem>
                ));
                return (
                  <Fragment key={group ?? '__ungrouped'}>
                    {index > 0 && <SelectSeparator />}
                    {group == null ? (
                      rows
                    ) : (
                      <SelectGroup>
                        <SelectGroupLabel>{group}</SelectGroupLabel>
                        {rows}
                      </SelectGroup>
                    )}
                  </Fragment>
                );
              })}
            </SelectPopup>
          </>
        ) : (
          children
        )}
      </BaseSelect.Root>
    </FieldFrame>
  );
}
