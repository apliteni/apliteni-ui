import type { Meta, StoryObj } from '@storybook/react';
import { BackLink } from './BackLink';

const meta: Meta<typeof BackLink> = { title: 'React/BackLink', component: BackLink };
export default meta;

// Where it belongs: above the page title, in the slot a breadcrumb trail would take.
const Page = ({ children, title }: { children: React.ReactNode; title: string }) => (
  <div className="ui-app__main" style={{ maxWidth: 640 }}>
    {children}
    <h1>{title}</h1>
  </div>
);

export const Short: StoryObj<typeof BackLink> = {
  render: () => (
    <Page title="INV-1001">
      <BackLink href="/invoices?status=open&page=3" label="Invoices" />
    </Page>
  ),
};

export const Long: StoryObj<typeof BackLink> = {
  render: () => (
    <Page title="September 2026">
      <BackLink href="/reports/reconciliation" label="Reconciliation & settlement reports" />
    </Page>
  ),
};

// Given no destination it shows "Back" and names itself nothing more.
export const Unnamed: StoryObj<typeof BackLink> = {
  render: () => (
    <Page title="Draft">
      <BackLink href="/drafts" />
    </Page>
  ),
};

// A router link as the anchor: `as` takes the element and passes it its own props.
// A plain <a> with a prop of its own stands in for the router's <Link>.
const Link = ({ to, ...rest }: { to: string } & React.ComponentPropsWithoutRef<'a'>) => (
  <a data-to={to} {...rest} />
);

export const AsRouterLink: StoryObj<typeof BackLink> = {
  render: () => (
    <Page title="Acme Ltd">
      <BackLink as={Link} to="/customers" href="/customers" label="Customers" />
    </Page>
  ),
};
