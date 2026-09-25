import { describe, expect, mock, test } from 'bun:test';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Slider } from '../../../src/components/inputs/slider';

// happy-dom cannot measure the track, so Base UI keeps the thumbs `visibility: hidden` (which also
// blanks their computed names); query them with `hidden: true` and assert on the naming attributes.
const sliders = () => screen.getAllByRole('slider', { hidden: true });

describe('Slider', () => {
  test('renders a labelled slider with its value', async () => {
    render(<Slider label="Volume" defaultValue={40} showValue />);
    await act(async () => {});
    const [slider] = sliders();
    expect(slider).toHaveAttribute('aria-valuenow', '40');
    const labelId = slider?.getAttribute('aria-labelledby') ?? '';
    expect(document.getElementById(labelId)).toHaveTextContent('Volume');
    expect(screen.getByText('40')).toBeInTheDocument();
  });

  test('arrow keys and Home step the value', async () => {
    const user = userEvent.setup();
    const onValueChange = mock((_: number) => {});
    render(<Slider aria-label="Zoom" defaultValue={10} step={5} onValueChange={onValueChange} />);
    const [slider] = sliders();
    expect(slider).toHaveAttribute('aria-label', 'Zoom');
    act(() => slider?.focus());
    await user.keyboard('{ArrowRight}');
    expect(onValueChange).toHaveBeenLastCalledWith(15);
    await user.keyboard('{Home}');
    expect(onValueChange).toHaveBeenLastCalledWith(0);
  });

  test('range sliders render one named thumb per value', async () => {
    render(
      <Slider
        defaultValue={[20, 80]}
        getAriaLabel={(index) => (index === 0 ? 'Minimum' : 'Maximum')}
      />,
    );
    await act(async () => {});
    const [min, max] = sliders();
    expect(min).toHaveAttribute('aria-label', 'Minimum');
    expect(min).toHaveAttribute('aria-valuenow', '20');
    expect(max).toHaveAttribute('aria-label', 'Maximum');
    expect(max).toHaveAttribute('aria-valuenow', '80');
  });

  test('draws ticks and honours disabled', async () => {
    const { container } = render(
      <Slider aria-label="Steps" defaultValue={2} min={0} max={4} ticks disabled />,
    );
    await act(async () => {});
    expect(container.querySelectorAll('[data-slot="slider-ticks"] span')).toHaveLength(5);
    expect(sliders()[0]).toBeDisabled();
    expect(container.querySelector('[data-slot="slider"]')).toHaveAttribute('data-disabled');
  });
});
