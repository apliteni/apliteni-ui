// Layout B: the last provider first. The provider that the person used last is the one filled
// button. The others sit below a divider. The modal names the person and puts Sign out beside it.
import { Avatar, Button, Callout, Modal } from '@apliteni/apliteni-ui/react';
import { AppScreen, mount, page, person, providerButton, providers, useModal, view } from './shared';

const [last, ...others] = providers;

const failed = <Callout variant="danger" actions={<Button variant="secondary" size="sm" icon="refresh">Try again</Button>}>
  Google did not finish the sign-in. Nothing changed.
</Callout>;

const who = <div className="d799-row">
  <Avatar personKey={person.email} name={person.name} size={32} />
  <div><b>{person.name}</b><br />{person.email}</div>
</div>;

function SignInPage() {
  const error = view === 'error';
  return page(<>
    <h1 className="ui-auth__title">Welcome back</h1>
    <p className="ui-auth__sub">You signed in with Google last time.</p>
    <div className="d799-stack">
      {error && failed}
      {providerButton(last, 'primary')}
    </div>
    <div className="ui-divider">or</div>
    <div className="d799-stack">{others.map((p) => providerButton(p))}</div>
    <div className="ui-auth__foot">Only accounts in the Northwind workspace can sign in.</div>
  </>);
}

function SessionEnded() {
  const modal = useModal(view !== 'closed');
  const error = view === 'modal-error';
  return <AppScreen signedOut={!modal.open} onSignIn={modal.reopen}>
    <Modal open={modal.open} title="Sign in again" onClose={modal.close}
      footer={<>
        <Button variant="secondary">Sign out</Button>
        <Button variant="primary" leading={last.mark}>Continue with Google</Button>
      </>}>
      <p>Your session ended. This screen and its filter stay as they are.</p>
      {who}
      {error && failed}
    </Modal>
  </AppScreen>;
}

mount(view === 'page' || view === 'error' ? <SignInPage /> : <SessionEnded />);
