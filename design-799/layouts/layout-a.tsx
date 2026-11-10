// Layout A: equal providers. Every provider is a secondary button in one stack. The error is a
// callout above the stack, and its action repeats the provider that failed.
import { Button, Callout, Modal } from '@apliteni/apliteni-ui/react';
import { AppScreen, mount, page, providerButton, providers, useModal, view } from './shared';

const failed = <Callout variant="danger" actions={<Button variant="secondary" size="sm" icon="refresh">Try Google again</Button>}>
  Google did not finish the sign-in. Nothing changed. Try again, or continue with another provider.
</Callout>;

const choices = (error: boolean) => <div className="d799-stack">
  {error && failed}
  {providers.map((p) => providerButton(p))}
</div>;

function SignInPage() {
  return page(<>
    <h1 className="ui-auth__title">Sign in</h1>
    <p className="ui-auth__sub">Use the work account that your team uses for Finance.</p>
    {choices(view === 'error')}
    <div className="ui-auth__foot">Only accounts in the Northwind workspace can sign in.</div>
  </>);
}

function SessionEnded() {
  const modal = useModal(view !== 'closed');
  return <AppScreen signedOut={!modal.open} onSignIn={modal.reopen}>
    <Modal open={modal.open} title="Sign in again" onClose={modal.close}>
      <p>Your session ended. Sign in to keep working. This screen and its filter stay as they are.</p>
      {choices(view === 'modal-error')}
    </Modal>
  </AppScreen>;
}

mount(view === 'page' || view === 'error' ? <SignInPage /> : <SessionEnded />);
