import { Navigate, useNavigate } from 'react-router-dom';
import Dashboard from '../components/Dashboard.jsx';

export default function AppPage({ userData, onUpdateUserData, onLogout }) {
  const navigate = useNavigate();

  if (!userData) return <Navigate to="/onboarding" replace />;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f4ede2] p-0 sm:p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.18),_transparent_24%),radial-gradient(circle_at_85%_10%,_rgba(249,115,22,0.16),_transparent_24%),linear-gradient(180deg,_#f7f2e8_0%,_#eef4ff_100%)]" />
      <div className="pointer-events-none absolute left-[-5rem] top-28 hidden h-56 w-56 rounded-full bg-[#0f766e]/10 blur-3xl lg:block" />
      <div className="pointer-events-none absolute right-[-4rem] top-12 hidden h-64 w-64 rounded-full bg-[#f97316]/10 blur-3xl lg:block" />

      <div className="relative z-10 overflow-hidden border border-white/65 bg-white/30 shadow-[0_30px_90px_rgba(31,36,48,0.12)] sm:rounded-[34px]">
        <Dashboard
          userData={userData}
          onUpdateUserData={onUpdateUserData}
          onLogout={() => {
            onLogout?.();
            navigate('/');
          }}
        />
      </div>
    </div>
  );
}
