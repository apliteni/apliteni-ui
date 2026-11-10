// Layout C: the error is its own step. The page says where the person goes after sign-in. When a
// provider fails, the choice gives way to one retry step with one filled button.
import { Button, Modal } from '@apliteni/apliteni-ui/react';
import { AppScreen, mount, page, providerButton, providers, useModal, view } from './shared';

const choice = <div className="d799-stack">{providers.map((p) => providerButton(p))}</div>;

const retry = (size: 'md' | 'lg') => <div className="d799-stack">
  <Button variant="primary" size={size} block icon="refresh">Try Google again</Button>
  <Button variant="secondary" size={size} block icon="arrowLeft">Choose another provider</Button>
</div>;

function SignInPage() {
  return page(view === 'error' ? <>
    <h1 className="ui-auth__title">Google did not sign you in</h1>
    <p className="ui-auth__sub">The Google window closed before the sign-in finished. Nothing changed.</p>
    {retry('lg')}
  </> : <>
    <h1 className="ui-auth__title">Sign in to Finance</h1>
    <p className="ui-auth__sub">After you sign in, you go back to Payouts.</p>
    {choice}
    <div className="ui-auth__foot">Only accounts in the Northwind workspace can sign in.</div>
  </>);
}

function SessionEnded() {
  const modal = useModal(view !== 'closed');
  const error = view === 'modal-error';
  return <AppScreen signedOut={!modal.open} onSignIn={modal.reopen}>
    <Modal open={modal.open} onClose={modal.close} role={error ? 'alertdialog' : 'dialog'}
      title={error ? 'Google did not sign you in' : 'Sign in again'}>
      {error ? <>
        <p>The Google window closed before the sign-in finished. Nothing changed.</p>
        {retry('md')}
      </> : <>
        <p>Your session ended. After you sign in, you stay on Payouts with this filter.</p>
        {choice}
      </>}
    </Modal>
  </AppScreen>;
}

mount(view === 'page' || view === 'error' ? <SignInPage /> : <SessionEnded />);
