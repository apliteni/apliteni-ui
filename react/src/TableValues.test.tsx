import { render, screen } from '@testing-library/react';
import { NumericValue, DeltaValue, RowIdentity } from './TableValues';

// Checks text, semantics and classes in JSDOM; does not measure table layout or colour contrast.
it('distinguishes zero from missing and renders caller text safely', () => {
  const { container } = render(<><NumericValue value={0} unit="USD" /><NumericValue /><NumericValue value="<em>12</em>" /></>);
  expect(container.querySelector('.ui-value')).toHaveTextContent('0USD');
  expect(screen.getByLabelText('Not available')).toHaveTextContent('—');
  expect(screen.getByText('<em>12</em>')).toBeInTheDocument();
  expect(container.querySelector('em')).toBeNull();
});
it.each(['0', '+0.00%', '−0,0%', '- 0 %'])('keeps %s neutral', value => {
  const { container } = render(<DeltaValue value={value} tone="danger" />);
  expect(container.querySelector('.ui-delta')).not.toHaveClass('ui-delta--danger');
});
it('renders signed judgement, basis and missing comparisons', () => {
  const { container } = render(<><DeltaValue value="-12%" tone="success" basisId="basis" /><DeltaValue tone="danger" /></>);
  expect(screen.getByText('-12%')).toHaveClass('ui-delta--success');
  expect(screen.getByText('-12%')).toHaveAttribute('aria-describedby', 'basis');
  expect(screen.getByText('No earlier figure')).not.toHaveClass('ui-delta--danger');
  expect(container.querySelectorAll('.ui-delta')).toHaveLength(2);
});
it('retains row identity text and fallback', () => {
  render(<RowIdentity symbol="DMO" name="Demo company" />);
  expect(screen.getByText('DMO')).toBeInTheDocument();
  expect(screen.getByText('Demo company')).toBeInTheDocument();
});
