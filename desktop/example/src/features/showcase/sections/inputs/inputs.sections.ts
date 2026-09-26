import type { ShowcaseSection } from '../../showcase.types';
import { CheckboxSection } from './checkbox.section';
import { NumberFieldSection } from './number-field.section';
import { RadioGroupSection } from './radio-group.section';
import { SearchFieldSection } from './search-field.section';
import { SelectSection } from './select.section';
import { SliderSection } from './slider.section';
import { SwitchSection } from './switch.section';
import { TextFieldSection } from './text-field.section';
import { TextareaSection } from './textarea.section';

/** Showcase pages for the `inputs` category, in sidebar order. */
export const inputsSections: readonly ShowcaseSection[] = [
  {
    id: 'text-field',
    title: 'Text Field',
    description: 'Single-line input with label, helper, error, adornments and a clear button.',
    category: 'inputs',
    icon: 'codicon:symbol-string',
    component: TextFieldSection,
  },
  {
    id: 'search-field',
    title: 'Search Field',
    description: 'Search input with clear-on-Escape and a shortcut hint.',
    category: 'inputs',
    icon: 'codicon:search',
    component: SearchFieldSection,
  },
  {
    id: 'textarea',
    title: 'Textarea',
    description: 'Multi-line text that can grow with its content.',
    category: 'inputs',
    icon: 'codicon:note',
    component: TextareaSection,
  },
  {
    id: 'number-field',
    title: 'Number Field',
    description: 'Numeric input with a stacked stepper and keyboard stepping.',
    category: 'inputs',
    icon: 'codicon:symbol-numeric',
    component: NumberFieldSection,
  },
  {
    id: 'select',
    title: 'Select',
    description: 'macOS pop-up button with a checkmarked list aligned over the trigger.',
    category: 'inputs',
    icon: 'codicon:list-selection',
    component: SelectSection,
  },
  {
    id: 'checkbox',
    title: 'Checkbox',
    description: 'Crisp 14px checkboxes, mixed state and groups with a select-all parent.',
    category: 'inputs',
    icon: 'codicon:pass',
    component: CheckboxSection,
  },
  {
    id: 'radio-group',
    title: 'Radio Group',
    description: 'A single choice with roving arrow-key focus.',
    category: 'inputs',
    icon: 'codicon:circle-large-filled',
    component: RadioGroupSection,
  },
  {
    id: 'switch',
    title: 'Switch',
    description: 'macOS toggles with a springy thumb for on/off settings.',
    category: 'inputs',
    icon: 'codicon:settings',
    component: SwitchSection,
  },
  {
    id: 'slider',
    title: 'Slider',
    description: 'Continuous or stepped values, single or range.',
    category: 'inputs',
    icon: 'codicon:settings-gear',
    component: SliderSection,
  },
];
