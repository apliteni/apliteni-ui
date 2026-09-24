import { numericValue, deltaValue } from '@apliteni/apliteni-ui';
export type NumericValueProps = { value?: string | number | null; unit?: string; missing?: string };
export type DeltaValueProps = { value?: string | null; tone?: 'success' | 'danger' | 'neutral'; basisId?: string; missing?: string };
export function NumericValue(props: NumericValueProps) { return <span dangerouslySetInnerHTML={{ __html: numericValue(props) }} />; }
export function DeltaValue(props: DeltaValueProps) { return <span dangerouslySetInnerHTML={{ __html: deltaValue(props) }} />; }
export type RowIdentityProps = { symbol: string; name: string; logo?: string; href?: string };
export function RowIdentity({ symbol, name, logo, href }: RowIdentityProps) {
  const Tag = href ? 'a' : 'span';
  return <Tag className="ui-identity" href={href}>
    <span className="ui-identity__logo" aria-hidden="true"><span>{symbol.slice(0, 1)}</span>{logo && <img src={logo} alt="" onError={e => { e.currentTarget.hidden = true; }} />}</span>
    <span className="ui-identity__symbol">{symbol}</span><span className="ui-identity__name">{name}</span>
  </Tag>;
}
