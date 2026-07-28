import { icon } from '@apliteni/apliteni-ui';

export function Icon({ name }: { name: string }) {
  return <span style={{ display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: icon(name) }} />;
}
