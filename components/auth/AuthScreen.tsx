import React, { useEffect, useMemo, useState } from 'react';
import type { UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';

const roleCopy: Record<UserRole, { title: string; description: string }> = {
  owner: {
    title: 'Gym Owner',
    description: 'Manage gym details, equipment, and reservations in one place.',
  },
  member: {
    title: 'Member',
    description: 'Find gyms, book equipment, and follow your AI fitness plan.',
  },
};

export const AuthScreen: React.FC = () => {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [role, setRole] = useState<UserRole>('member');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setError(null);
  }, [mode, role]);

  const roleDetails = useMemo(() => roleCopy[role], [role]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login({ email, password, role });
      } else {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }
        await signup({ name, email, password, role, phone, businessName });
        setBusinessName('');
        setPhone('');
        setConfirmPassword('');
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('auth/invalid-credential')) {
          setError('Email or password is incorrect. Please try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Authentication failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const showOwnerFields = mode === 'signup' && role === 'owner';
  const showNameField = mode === 'signup';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-slate-800 dark:text-white flex items-center justify-center px-4 py-12 transition-colors duration-300">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8">
        <section className="bg-gradient-to-br from-cyan-500 via-blue-500 to-blue-600 text-white rounded-3xl p-8 lg:p-10 shadow-lg flex flex-col justify-between">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.2em] font-semibold text-white/80">AI Fitness</p>
            <h1 className="text-3xl font-extrabold">Sign in to train smarter.</h1>
            <p className="text-white/90 text-sm leading-relaxed">One login for owners and members. Stay synced across reservations, progress, and chat.</p>
          </div>
          <div className="mt-8 space-y-2 text-sm text-white/80">
            <p className="font-semibold">{roleDetails.title}</p>
            <p>{roleDetails.description}</p>
          </div>
        </section>

        <section className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 lg:p-10 ring-1 ring-gray-200 dark:ring-white/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{mode === 'login' ? 'Log In' : 'Create Account'}</h2>
            <button
              onClick={() => setMode(prev => (prev === 'login' ? 'signup' : 'login'))}
              className="text-sm font-semibold text-cyan-600 hover:text-cyan-500"
            >
              {mode === 'login' ? 'Create account' : 'Use existing account'}
            </button>
          </div>

          <div className="flex gap-2 mb-6">
            {(['member', 'owner'] as UserRole[]).map(item => (
              <button
                key={item}
                type="button"
                onClick={() => setRole(item)}
                className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                  role === item
                    ? 'bg-cyan-500 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                {item === 'owner' ? 'Gym Owner' : 'Member'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {showNameField && (
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="name">Full Name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={event => setName(event.target.value)}
                  className="w-full p-3 rounded-xl bg-gray-100 dark:bg-slate-700 border border-transparent focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                  placeholder="Jane Doe"
                  required
                />
              </div>
            )}

            {showOwnerFields && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="businessName">Gym Name</label>
                  <input
                    id="businessName"
                    type="text"
                    value={businessName}
                    onChange={event => setBusinessName(event.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-100 dark:bg-slate-700 border border-transparent focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                    placeholder="Stronger Together Gym"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="phone">Contact Number</label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={event => setPhone(event.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-100 dark:bg-slate-700 border border-transparent focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                    placeholder="010-1234-5678"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                className="w-full p-3 rounded-xl bg-gray-100 dark:bg-slate-700 border border-transparent focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                className="w-full p-3 rounded-xl bg-gray-100 dark:bg-slate-700 border border-transparent focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                placeholder="••••••"
                required
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1" htmlFor="confirm">Confirm Password</label>
                <input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={event => setConfirmPassword(event.target.value)}
                  className="w-full p-3 rounded-xl bg-gray-100 dark:bg-slate-700 border border-transparent focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                  placeholder="••••••"
                  required
                />
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-sm text-red-600 border border-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl font-semibold bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-70 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
