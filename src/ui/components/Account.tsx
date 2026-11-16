import { useState } from 'react';
import { useStore } from '../store';

const SYNC = { idle: 'Signed in', saving: 'Saving online…', saved: 'Saved online', error: 'Could not save online. Your game is still saved in this browser.' };

/** Sign in, sign out, and whether the game is safely saved online. Renders nothing when the game is offline-only. */
export function AccountPanel() {
  const { account } = useStore();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  if (!account.available) return null;

  if (account.email) {
    return (
      <div className="card col gap-8" aria-label="Account">
        <span className="eyebrow">Account</span>
        <strong style={{ overflowWrap: 'anywhere' }}>{account.email}</strong>
        <span className={`small ${account.sync === 'error' ? 'neg' : 'muted'}`} role="status">{SYNC[account.sync]}</span>
        <button type="button" className="btn small" onClick={account.signOut}>Sign out</button>
      </div>
    );
  }

  // Not a <form>: this panel also appears inside the founding form.
  const send = async () => {
    if (!email.includes('@')) { setError('Enter your email address.'); return; }
    setStatus('sending');
    setError(null);
    const problem = await account.signIn(email.trim());
    setError(problem);
    setStatus(problem ? 'idle' : 'sent');
  };
  return (
    <div className="card col gap-8" aria-label="Account">
      <span className="eyebrow">Play on any device</span>
      {status === 'sent' ? (
        <p className="small" role="status">Check {email} for a sign-in link. You can keep playing in the meantime.</p>
      ) : (
        <>
          <p className="small muted">Sign in to save your nation online and enter the world ranking. No password: we email you a link.</p>
          <label className="field">
            <span className="eyebrow">Email</span>
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void send(); } }} style={{ height: 44 }} />
          </label>
          {error && <span className="small neg" role="alert">{error}</span>}
          <button type="button" className="btn small" disabled={status === 'sending'} onClick={() => void send()}>{status === 'sending' ? 'Sending…' : 'Email me a sign-in link'}</button>
        </>
      )}
    </div>
  );
}
