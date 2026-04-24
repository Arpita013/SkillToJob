import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Onboarding from '../components/Onboarding.jsx';

export default function OnboardingPage({ onComplete, accountEmail }) {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen">
      <div className="absolute left-5 top-5 z-30">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-sm font-black text-[#1f2430] shadow-[0_12px_30px_rgba(31,36,48,0.08)] backdrop-blur-xl transition hover:-translate-y-0.5"
        >
          <ArrowLeft size={16} />
          Back to Login
        </Link>
      </div>

      <Onboarding
        accountEmail={accountEmail}
        onComplete={(data) => {
          onComplete?.(data);
          navigate('/app');
        }}
      />
    </div>
  );
}
