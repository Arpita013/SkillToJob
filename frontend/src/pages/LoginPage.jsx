import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, LockKeyhole, LogIn, Mail } from 'lucide-react';
import { authenticateAuthUser, getCurrentAuthUser } from '../utils/authStorage.js';
import { hasStoredProfile } from '../utils/profileStorage.js';

const highlights = [
  'Access your existing SkillToJob workspace',
  'Continue from onboarding if your profile is incomplete',
  'Return to roadmap, jobs, and proof-of-skill progress',
];

export default function LoginPage({ onAuthenticated }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const authUser = getCurrentAuthUser();
    if (authUser?.email) {
      console.log('✓ Already logged in, redirecting:', authUser.email);
      if (hasStoredProfile(authUser.email)) {
        navigate('/app');
      } else {
        navigate('/onboarding');
      }
    }
  }, [navigate]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');

    try {
      if (!String(email || '').trim() || !String(password || '').trim()) {
        throw new Error('Email and password are required.');
      }

      setIsLoggingIn(true);
      const authUser = await authenticateAuthUser({ email, password });
      console.log('✓ Login successful:', authUser);
      onAuthenticated?.(authUser);

      if (hasStoredProfile(authUser.email)) {
        console.log('✓ Profile exists, navigating to /app');
        navigate('/app');
      } else {
        console.log('✓ No profile found, navigating to /onboarding');
        navigate('/onboarding');
      }
    } catch (nextError) {
      console.error('✗ Login failed:', nextError);
      setError(String(nextError?.message || 'Could not login.'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f4ede2]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.18),_transparent_30%),radial-gradient(circle_at_85%_20%,_rgba(249,115,22,0.16),_transparent_30%),linear-gradient(180deg,_#f7f2e8_0%,_#eef4ff_100%)]" />

      <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl gap-10 px-5 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center md:px-8">
        <div className="space-y-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-sm font-black text-[#1f2430] shadow-[0_12px_30px_rgba(31,36,48,0.08)] backdrop-blur-xl transition hover:-translate-y-0.5"
          >
            <ArrowLeft size={16} />
            Back Home
          </Link>

          <div className="max-w-xl">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#1f2430] text-[#fff7eb] shadow-[0_18px_36px_rgba(31,36,48,0.16)]">
              <LogIn size={24} />
            </div>
            <h1 className="mt-6 text-4xl font-black leading-tight tracking-[-0.04em] text-[#1f2430] md:text-5xl">
              Login and continue your career workspace.
            </h1>
            <p className="mt-4 text-base font-semibold leading-8 text-[#5e6678]">
              Access your account and jump back into onboarding, roadmap building, jobs, quizzes, and project reviews.
            </p>
          </div>

          <div className="grid gap-4">
            {highlights.map((highlight) => (
              <div
                key={highlight}
                className="rounded-[22px] border border-white/75 bg-white/72 px-5 py-4 text-sm font-bold text-[#465065] shadow-[0_16px_42px_rgba(31,36,48,0.07)] backdrop-blur-xl"
              >
                {highlight}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[34px] border border-white/70 bg-white/76 p-6 shadow-[0_28px_80px_rgba(31,36,48,0.1)] backdrop-blur-xl md:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#eef4ff] px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#2563eb]">
            <LogIn size={14} />
            Account Login
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleLogin}>
            <label className="block">
              <span className="mb-2 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#4b5565]">
                <Mail size={15} />
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-[18px] border border-[#1f2430]/10 bg-white px-4 py-4 text-[#1f2430] outline-none transition focus:border-[#0f766e]/40 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.08)]"
                placeholder="name@example.com"
              />
            </label>

            <label className="block">
              <span className="mb-2 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#4b5565]">
                <LockKeyhole size={15} />
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-[18px] border border-[#1f2430]/10 bg-white px-4 py-4 text-[#1f2430] outline-none transition focus:border-[#0f766e]/40 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.08)]"
                placeholder="Enter your password"
              />
            </label>

            {error ? (
              <div className="rounded-[18px] border border-[#ef4444]/15 bg-[#fef2f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-[#1f2430] px-6 py-4 text-sm font-black text-[#fff7eb] shadow-[0_18px_40px_rgba(31,36,48,0.18)] transition cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(31,36,48,0.24)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? 'Logging In...' : 'Login and Continue'}
              <ArrowRight size={16} />
            </button>
          </form>

          <p className="mt-6 text-sm font-semibold text-[#5e6678]">
            New here?{' '}
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="font-black text-[#1f2430] transition hover:text-[#0f766e]"
            >
              Create an account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
