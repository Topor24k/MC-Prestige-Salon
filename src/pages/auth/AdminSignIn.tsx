import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import Ambient from '../../components/layout/Ambient';
import { Brand } from '../../components/layout/Sidebar';
import { Field } from '../../components/ui/bits';
import { DURATION, EASE } from '../../lib/motion';
import { MIN_PASSWORD, useAuth } from '../../store/useAuth';
import type { AuthResult } from '../../types';

const drift = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: DURATION.slow, delay, ease: EASE },
});

/**
 * Staff entrance. With a built-in administrator (src/data/defaultAdmin.js) it is a plain
 * sign-in; without one, the first visit creates the administrator account.
 */
export default function AdminSignIn() {
  const { user, hasAdmin, signIn, createAdmin } = useAuth();
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [problem, setProblem] = useState<AuthResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Decided once, so the form does not switch modes mid-submit when the account appears.
  const [setup] = useState(!hasAdmin);
  const set = (key: keyof typeof values) => (event: ChangeEvent<HTMLInputElement>) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  if (user && !busy) return <Navigate to="/admin" replace />;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!setup && (!values.email.trim() || !values.password)) {
      setProblem({ ok: false, message: 'Enter your email and password.' });
      return;
    }
    setBusy(true);
    setProblem(null);
    const result = setup ? await createAdmin(values) : await signIn({ email: values.email, password: values.password });
    if (result.ok) {
      navigate('/admin', { replace: true });
      return;
    }
    setProblem(result);
    setBusy(false);
  };
  const errorFor = (field: string) => (problem?.field === field ? problem.message : undefined);

  return (
    <div className="signin">
      <aside className="signin__scene">
        <span className="signin__sun" aria-hidden="true" />
        <Ambient />
        <motion.div className="signin__brand" {...drift(0.1)}>
          <Brand />
        </motion.div>
        <motion.p className="signin__line" {...drift(0.25)}>
          Every visit, a little <em>transformation.</em>
        </motion.p>
      </aside>

      <main className="signin__panel">
        <motion.div className="signin__card" {...drift(0.2)}>
          <p className="eyebrow">{setup ? 'First-time setup' : 'Salon staff'}</p>
          <h1 className="signin__title">
            {setup ? (
              <>
                Set up the <em>administrator.</em>
              </>
            ) : (
              <>
                Welcome <em>back.</em>
              </>
            )}
          </h1>
          <p className="signin__subtitle">
            {setup
              ? 'Create the account the salon owner or manager will use to run appointments, finances, customers and services.'
              : 'Sign in to manage appointments, finances, customers and services.'}
          </p>

          <form className="signin__form" onSubmit={onSubmit} noValidate>
            {setup && (
              <Field label="Full name" error={errorFor('name')}>
                {(props) => <input {...props} className="input" value={values.name} onChange={set('name')} autoComplete="name" placeholder="Owner or manager" />}
              </Field>
            )}
            <Field label="Email" error={errorFor('email')}>
              {(props) => (
                <input {...props} className="input" type="email" inputMode="email" value={values.email} onChange={set('email')} autoComplete="email" placeholder="you@example.com" />
              )}
            </Field>
            <Field label="Password" error={errorFor('password')} hint={setup ? `At least ${MIN_PASSWORD} characters` : undefined}>
              {(props) => (
                <span className="input-reveal">
                  <input
                    {...props}
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    value={values.password}
                    onChange={set('password')}
                    autoComplete={setup ? 'new-password' : 'current-password'}
                  />
                  <button type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </span>
              )}
            </Field>

            {problem && !problem.field && (
              <p className="form-notice" role="alert" data-error="form">
                {problem.message}
              </p>
            )}

            <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
              {busy ? (
                <LoaderCircle size={17} className="spin" />
              ) : (
                <>
                  {setup ? 'Create administrator account' : 'Sign in'} <ArrowRight size={16} strokeWidth={1.9} />
                </>
              )}
            </button>
          </form>

          <p className="signin__note">For the salon owner and manager.</p>
        </motion.div>
      </main>
    </div>
  );
}
