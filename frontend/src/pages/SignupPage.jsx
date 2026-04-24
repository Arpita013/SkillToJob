import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { registerAuthUser } from '../utils/authStorage.js';
import { fetchApi } from '../utils/apiClient.js';

const benefits = [
  'Create an account before building your roadmap',
  'Verify access with a simple OTP step',
  'Continue into onboarding after signup',
];

const OTP_SERVICE_UNAVAILABLE_MESSAGE =
  'OTP service is unavailable. Make sure the backend server is running, then try again.';
const DEFAULT_RESEND_COOLDOWN_SECONDS = 45;

async function readApiPayload(response) {
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();

  if (contentType.includes('application/json')) {
    return response.json().catch(() => null);
  }

  const text = await response.text().catch(() => '');
  const trimmedText = String(text || '').trim();

  if (!trimmedText) {
    return null;
  }

  try {
    return JSON.parse(trimmedText);
  } catch {
    return { message: trimmedText };
  }
}

function getApiErrorMessage(response, data, fallbackMessage) {
  if (data?.message) {
    return String(data.message);
  }

  if ([502, 503, 504].includes(response.status)) {
    return OTP_SERVICE_UNAVAILABLE_MESSAGE;
  }

  return fallbackMessage;
}

export default function SignupPage({ onAuthenticated }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    otp: '',
  });
  const [otpSent, setOtpSent] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);

  useEffect(() => {
    if (resendCooldownSeconds <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setResendCooldownSeconds((currentSeconds) => {
        if (currentSeconds <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return currentSeconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldownSeconds]);

  const updateField = (field, value) => {
    if (field === 'email') {
      setOtpSent(false);
      setNotice('');
      setError('');
      setResendCooldownSeconds(0);
    }

    setFormData((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'email' ? { otp: '' } : {}),
    }));
  };

  const validateEmail = () => {
    const email = String(formData.email || '').trim();

    if (!email) {
      throw new Error('Email is required.');
    }

    const emailPattern = /\S+@\S+\.\S+/;
    if (!emailPattern.test(email)) {
      throw new Error('Enter a valid email address.');
    }

    return email;
  };

  const validatePassword = () => {
    const password = String(formData.password || '');

    if (!password) {
      throw new Error('Password is required.');
    }

    if (password.length < 6) {
      throw new Error('Password should be at least 6 characters long.');
    }

    return password;
  };

  const validateAccountDetails = () => {
    const email = validateEmail();
    const password = validatePassword();

    return { email, password };
  };

  const handleSendOtp = async () => {
    setError('');
    setNotice('');

    try {
      const email = validateEmail();
      console.log('📧 Sending OTP to:', email);
      setIsSendingOtp(true);

      const response = await fetchApi('/api/user/auth/send-signup-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
        }),
      });

      const data = await readApiPayload(response);
      console.log('✓ Send OTP Response:', { status: response.status, data });

      if (!response.ok) {
        if (response.status === 429) {
          setOtpSent(true);
          setResendCooldownSeconds(
            Number(data?.retryAfterSeconds) || DEFAULT_RESEND_COOLDOWN_SECONDS,
          );
        }

        throw new Error(getApiErrorMessage(response, data, 'Could not send OTP.'));
      }

      setOtpSent(true);
      setFormData((prev) => ({
        ...prev,
        otp: '',
      }));
      setResendCooldownSeconds(
        Number(data?.resendCooldownSeconds) || DEFAULT_RESEND_COOLDOWN_SECONDS,
      );
      setNotice(
        otpSent
          ? `A new OTP has been sent to ${email}. Please use the latest code from your inbox.`
          : `OTP sent to ${email}. Please check your inbox and spam folder.`,
      );
    } catch (nextError) {
      console.error('✗ Send OTP failed:', nextError);
      setError(String(nextError?.message || 'Could not send OTP.'));
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleCreateAccount = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    try {
      const { email, password } = validateAccountDetails();

      if (!otpSent) {
        throw new Error('Please click "Send OTP" first.');
      }

      const otpValue = String(formData.otp || '').trim();

      if (!otpValue) {
        throw new Error('Please enter the 6-digit OTP sent to your email.');
      }

      if (!/^\d{6}$/.test(otpValue)) {
        throw new Error('OTP must be exactly 6 digits.');
      }

      console.log('🔐 Verifying OTP:', { email, otp: otpValue });

      setIsCreatingAccount(true);

      const verifyResponse = await fetchApi('/api/user/auth/verify-signup-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otp: otpValue,
        }),
      });

      const verifyData = await readApiPayload(verifyResponse);
      console.log('✓ OTP Response:', { status: verifyResponse.status, data: verifyData });

      if (!verifyResponse.ok) {
        throw new Error(getApiErrorMessage(verifyResponse, verifyData, 'Incorrect OTP. Please try again.'));
      }

      const authUser = await registerAuthUser({
        email,
        password,
      });

      console.log('✓ Account created successfully:', authUser);
      onAuthenticated?.(authUser);
      console.log('✓ Navigating to /onboarding');
      navigate('/onboarding');
    } catch (nextError) {
      console.error('✗ Account creation failed:', nextError);
      setError(String(nextError?.message || 'Could not create account.'));
    } finally {
      setIsCreatingAccount(false);
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
              <ShieldCheck size={24} />
            </div>
            <h1 className="mt-6 text-4xl font-black leading-tight tracking-[-0.04em] text-[#1f2430] md:text-5xl">
              Sign up to start your SkillToJob workspace.
            </h1>
            <p className="mt-4 text-base font-semibold leading-8 text-[#5e6678]">
              Create your account, verify it with OTP, and continue into onboarding to generate your roadmap.
            </p>
          </div>

          <div className="grid gap-4">
            {benefits.map((benefit) => (
              <div
                key={benefit}
                className="rounded-[22px] border border-white/75 bg-white/72 px-5 py-4 text-sm font-bold text-[#465065] shadow-[0_16px_42px_rgba(31,36,48,0.07)] backdrop-blur-xl"
              >
                {benefit}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[34px] border border-white/70 bg-white/76 p-6 shadow-[0_28px_80px_rgba(31,36,48,0.1)] backdrop-blur-xl md:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#eef4ff] px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#2563eb]">
            <Sparkles size={14} />
            Account Signup
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleCreateAccount}>
            <label className="block">
              <span className="mb-2 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#4b5565]">
                <Mail size={15} />
                Email
              </span>
              <input
                type="email"
                value={formData.email}
                onChange={(event) => updateField('email', event.target.value)}
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
                value={formData.password}
                onChange={(event) => updateField('password', event.target.value)}
                className="w-full rounded-[18px] border border-[#1f2430]/10 bg-white px-4 py-4 text-[#1f2430] outline-none transition focus:border-[#0f766e]/40 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.08)]"
                placeholder="Minimum 6 characters"
              />
            </label>

            <div className="rounded-[24px] border border-[#1f2430]/10 bg-[#fff9f1] p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-end">
                <label className="block flex-1">
                  <span className="mb-2 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#4b5565]">
                    OTP
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={formData.otp}
                    onChange={(event) => updateField('otp', event.target.value.replace(/\D/g, ''))}
                    className="w-full rounded-[18px] border border-[#1f2430]/10 bg-white px-4 py-4 text-[#1f2430] outline-none transition focus:border-[#0f766e]/40 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.08)]"
                    placeholder="Enter 6-digit OTP"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp || resendCooldownSeconds > 0}
                  className="inline-flex items-center justify-center rounded-[18px] border border-[#1f2430]/10 bg-white px-5 py-4 text-sm font-black text-[#1f2430] transition cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(31,36,48,0.12)] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSendingOtp
                    ? 'Sending OTP...'
                    : resendCooldownSeconds > 0
                      ? `Resend in ${resendCooldownSeconds}s`
                      : otpSent
                        ? 'Resend OTP'
                        : 'Send OTP'}
                </button>
              </div>

              {otpSent && resendCooldownSeconds > 0 ? (
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[#7c6f64]">
                  You can request a new OTP after {resendCooldownSeconds} seconds.
                </p>
              ) : null}
            </div>

            {notice ? (
              <div className="rounded-[18px] border border-[#0f766e]/15 bg-[#ecfeff] px-4 py-3 text-sm font-bold text-[#0f766e]">
                {notice}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-[18px] border border-[#ef4444]/15 bg-[#fef2f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isCreatingAccount || !otpSent || !/^\d{6}$/.test(String(formData.otp || '').trim())}
              className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-[#1f2430] px-6 py-4 text-sm font-black text-[#fff7eb] shadow-[0_18px_40px_rgba(31,36,48,0.18)] transition cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(31,36,48,0.24)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isCreatingAccount ? 'Creating Account...' : 'Verify OTP and Continue'}
              <ArrowRight size={16} />
            </button>
          </form>

          <p className="mt-6 text-sm font-semibold text-[#5e6678]">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="font-black text-[#1f2430] transition hover:text-[#0f766e]"
            >
              Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
