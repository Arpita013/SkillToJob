import { Link } from 'react-router-dom';
import { ArrowRight, Compass, Sparkles } from 'lucide-react';

const workflowSteps = [
  {
    no: '01',
    title: 'Define your direction',
    desc: 'Add your education, skills, and target role to create a focused starting point.',
  },
  {
    no: '02',
    title: 'Follow the roadmap',
    desc: 'Move phase by phase with quizzes, micro-projects, and practical learning steps.',
  },
  {
    no: '03',
    title: 'Show real proof',
    desc: 'Turn your progress into badges, reviewed projects, and stronger job-ready evidence.',
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f1e6] text-[#1f2430]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.18),_transparent_32%),radial-gradient(circle_at_85%_10%,_rgba(249,115,22,0.18),_transparent_28%),linear-gradient(180deg,_#f7f1e6_0%,_#f3f6fb_48%,_#eef4ff_100%)]" />
      <div className="pointer-events-none absolute left-[-8rem] top-24 h-72 w-72 rounded-full bg-[#0f766e]/10 blur-3xl" />
      <div className="pointer-events-none absolute right-[-6rem] top-16 h-80 w-80 rounded-full bg-[#f97316]/10 blur-3xl" />

      <header className="fixed inset-x-0 top-0 z-30 border-b border-[#1f2430]/8 bg-[#f7f1e6]/84 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <Link to="/" className="inline-flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#1f2430] text-[#fff7eb] shadow-[0_14px_30px_rgba(31,36,48,0.16)]">
              <Compass size={20} />
            </span>
            <span>
              <strong className="block text-lg font-black tracking-tight text-[#1f2430]">SkillToJob</strong>
              <span className="block text-xs font-bold uppercase tracking-[0.22em] text-[#7d8494]">AI Career System</span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 text-sm font-bold text-[#596173] lg:flex">
            <a href="#top" className="transition hover:text-[#1f2430]">Home</a>
            <a href="#workflow" className="transition hover:text-[#1f2430]">How It Works</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full border border-[#1f2430]/10 bg-white/80 px-5 py-3 text-sm font-black text-[#1f2430] shadow-[0_16px_35px_rgba(31,36,48,0.08)] transition hover:-translate-y-0.5"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-[#1f2430] px-5 py-3 text-sm font-black text-[#fff7eb] shadow-[0_16px_35px_rgba(31,36,48,0.14)] transition hover:-translate-y-0.5"
            >
              Sign Up
              <ArrowRight size={16} />
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10">
        <section
          id="top"
          className="mx-auto flex min-h-screen max-w-5xl scroll-mt-28 flex-col items-center justify-center px-5 pb-12 pt-28 text-center md:px-8 md:pb-16 md:pt-32 lg:pt-36"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#1f2430]/10 bg-white/70 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#6b7280] shadow-[0_10px_24px_rgba(31,36,48,0.06)]">
            <Sparkles size={14} className="text-[#0f766e]" />
            Career clarity with momentum built in
          </div>

          <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[0.96] tracking-[-0.05em] text-[#1f2430] md:text-6xl">
            Build a career path that feels
            <span className="block text-[#0f766e]">clear, practical, and shareable.</span>
          </h1>

          <p className="mt-5 max-w-2xl text-[15px] font-semibold leading-7 text-[#5e6678] md:text-base">
            SkillToJob brings roadmap planning, quizzes, proof-of-skill projects, and live jobs into one clean workflow.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-[#1f2430] px-6 py-3.5 text-sm font-black text-[#fff7eb] shadow-[0_22px_40px_rgba(31,36,48,0.18)] transition hover:-translate-y-0.5"
              >
                Sign Up
                <ArrowRight size={16} />
              </Link>
            <a
              href="#workflow"
              className="inline-flex items-center gap-2 rounded-full border border-[#1f2430]/10 bg-white/80 px-6 py-3.5 text-sm font-black text-[#1f2430] shadow-[0_16px_32px_rgba(31,36,48,0.07)] transition hover:-translate-y-0.5"
            >
              See how it works
            </a>
          </div>
        </section>

        <section
          id="workflow"
          className="mx-auto flex min-h-screen max-w-7xl scroll-mt-28 items-center px-5 py-20 md:px-8 md:py-24"
        >
          <div className="w-full rounded-[34px] border border-[#1f2430]/10 bg-[linear-gradient(145deg,_rgba(255,255,255,0.92),_rgba(250,246,238,0.86))] p-6 shadow-[0_24px_70px_rgba(31,36,48,0.08)] md:p-8">
            <div className="mx-auto max-w-3xl text-center">
              <span className="text-xs font-black uppercase tracking-[0.22em] text-[#7d8494]">How It Works</span>
              <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] text-[#1f2430] md:text-5xl">
                A simple path from career goal to proof of skill.
              </h2>
              <p className="mt-4 text-[15px] font-semibold leading-7 text-[#5e6678] md:text-base">
                SkillToJob keeps things focused. You choose your direction, follow a structured roadmap, and build work you can actually show.
              </p>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {workflowSteps.map((step) => (
                <article
                  key={step.no}
                  className="rounded-[28px] border border-[#1f2430]/10 bg-white/82 p-5 shadow-[0_14px_36px_rgba(31,36,48,0.05)]"
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#1f2430] text-base font-black text-[#fff7eb] shadow-[0_14px_28px_rgba(31,36,48,0.14)]">
                    {step.no}
                  </div>
                  <h3 className="mt-4 text-lg font-black tracking-tight text-[#1f2430]">{step.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-[#5e6678]">{step.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <footer className="border-t border-[#1f2430]/10 bg-white/55 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
            <div className="grid gap-10 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
              <div>
                <div className="inline-flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#1f2430] text-[#fff7eb] shadow-[0_14px_30px_rgba(31,36,48,0.16)]">
                    <Compass size={20} />
                  </span>
                  <div>
                    <strong className="block text-lg font-black tracking-tight text-[#1f2430]">SkillToJob</strong>
                    <span className="block text-xs font-bold uppercase tracking-[0.18em] text-[#7d8494]">AI Career System</span>
                  </div>
                </div>
                <p className="mt-4 max-w-md text-sm font-semibold leading-7 text-[#5e6678]">
                  A cleaner way to turn career goals into roadmaps, proof of skill, and real application momentum.
                </p>
              </div>

              <div>
                <div className="text-sm font-black uppercase tracking-[0.18em] text-[#1f2430]">Navigation</div>
                <div className="mt-4 flex flex-col gap-3 text-sm font-semibold text-[#5e6678]">
                  <a href="#top" className="transition hover:text-[#1f2430]">Home</a>
                  <a href="#workflow" className="transition hover:text-[#1f2430]">How It Works</a>
                  <Link to="/signup" className="transition hover:text-[#1f2430]">Sign Up</Link>
                  <Link to="/login" className="transition hover:text-[#1f2430]">Login</Link>
                </div>
              </div>

              <div>
                <div className="text-sm font-black uppercase tracking-[0.18em] text-[#1f2430]">Platform</div>
                <div className="mt-4 flex flex-col gap-3 text-sm font-semibold text-[#5e6678]">
                  <span>AI career roadmaps</span>
                  <span>Quiz and project validation</span>
                  <span>Live jobs and mentor support</span>
                </div>
              </div>
            </div>

            <div className="mt-10 border-t border-[#1f2430]/10 pt-5 text-sm font-semibold text-[#7d8494]">
              Copyright 2026 SkillToJob. Built for focused, job-ready career growth.
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
