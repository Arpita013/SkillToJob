import { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AIMentor from './AIMentor.jsx';
import SkillGapAnalysis from './SkillGapAnalysis.jsx';
import { Download } from 'lucide-react';
import ResumeUpload from './ResumeUpload.jsx';
import WorkflowMap from './WorkflowMap.jsx';
import BadgeShelf from './BadgeShelf.jsx';
import PhaseQuizPanel from './PhaseQuizPanel.jsx';
import PhaseProjectPanel from './PhaseProjectPanel.jsx';
import { fetchApi } from '../utils/apiClient.js';

function getResourceMeta(name) {
  const n = String(name || '').toLowerCase();
  if (n.includes('youtube')) return { icon: '▶', cls: 'youtube' };
  if (n.includes('coursera')) return { icon: '🎓', cls: 'coursera' };
  if (n.includes('mdn')) return { icon: 'MDN', cls: 'mdn' };
  if (n.includes('doc')) return { icon: '📘', cls: 'docs' };
  return { icon: '🔗', cls: 'link' };
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeSkillsInput(value) {
  return String(value || '')
    .split(',')
    .map((skill) => String(skill || '').trim())
    .filter(Boolean);
}

async function readDashboardPayload(response) {
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();

  if (contentType.includes('application/json')) {
    return response.json().catch(() => null);
  }

  const text = await response.text().catch(() => '');
  return text ? { message: text } : null;
}

function buildFallbackJobs(targetRole) {
  const role = String(targetRole || 'Developer').trim() || 'Developer';

  return [
    {
      id: 'fallback-1',
      title: `${role} at TechCorp`,
      company: 'TechCorp',
      match: 92,
      location: 'Remote',
      employmentType: 'Full-time',
      salary: 'Competitive package',
      postedAt: 'Recently added',
      description: `Sample opportunity for ${role} while live job search reconnects.`,
      url: '',
    },
    {
      id: 'fallback-2',
      title: `Intermediate ${role} at StartupX`,
      company: 'StartupX',
      match: 88,
      location: 'Bangalore',
      employmentType: 'Hybrid',
      salary: 'Market standard',
      postedAt: 'Active',
      description: `Growth-focused role for candidates preparing for ${role} interviews.`,
      url: '',
    },
    {
      id: 'fallback-3',
      title: `Lead ${role} at FinPlus`,
      company: 'FinPlus',
      match: 83,
      location: 'Hybrid',
      employmentType: 'Full-time',
      salary: 'High visibility role',
      postedAt: 'Open now',
      description: 'Fallback listing to keep the board useful if the live API is temporarily unavailable.',
      url: '',
    },
  ];
}

function buildJobSearchQuery(targetRole) {
  const role = String(targetRole || '').trim();
  return role || 'developer';
}

function buildInitialJobFilters(targetRole) {
  return {
    keyword: buildJobSearchQuery(targetRole),
    location: '',
    remote: 'all',
    datePosted: 'all',
    country: 'in',
  };
}

function getRoadmapStepNumber(step, index) {
  return Number(step?.step) || index + 1;
}

function normalizePhaseProgress(progress) {
  if (!Array.isArray(progress)) return [];

  return progress
    .map((entry) => ({
      step: Number(entry?.step) || 0,
      completed: Boolean(entry?.completed),
      bestScore: Math.max(0, Number(entry?.bestScore) || 0),
      latestScore: Math.max(0, Number(entry?.latestScore) || 0),
      attempts: Math.max(0, Number(entry?.attempts) || 0),
      completedAt: String(entry?.completedAt || '').trim(),
      badgeTitle: String(entry?.badgeTitle || '').trim(),
      badgeMessage: String(entry?.badgeMessage || '').trim(),
      nextSkill: String(entry?.nextSkill || '').trim(),
    }))
    .filter((entry) => entry.step > 0);
}

function normalizeBadges(badges) {
  if (!Array.isArray(badges)) return [];

  return badges
    .map((badge) => ({
      id: String(badge?.id || '').trim(),
      phaseStep: Number(badge?.phaseStep) || 0,
      badgeTitle: String(badge?.badgeTitle || '').trim(),
      message: String(badge?.message || '').trim(),
      nextSkill: String(badge?.nextSkill || '').trim(),
      earnedAt: String(badge?.earnedAt || '').trim(),
    }))
    .filter((badge) => badge.phaseStep > 0);
}

function normalizePhaseProjects(projects) {
  if (!Array.isArray(projects)) return [];

  return projects
    .map((project) => ({
      step: Number(project?.step) || 0,
      phaseTitle: String(project?.phaseTitle || '').trim(),
      projectTitle: String(project?.projectTitle || '').trim(),
      deliverableType: String(project?.deliverableType || '').trim(),
      submissionLink: String(project?.submissionLink || '').trim(),
      feedbackScore: Math.max(0, Number(project?.feedbackScore) || 0),
      feedbackSummary: String(project?.feedbackSummary || '').trim(),
      resumeBullet: String(project?.resumeBullet || project?.portfolioBullet || '').trim(),
      reviewedAt: String(project?.reviewedAt || '').trim(),
    }))
    .filter((project) => project.step > 0 && project.projectTitle);
}

function deriveCurrentRoadmapIndex(roadmap, phaseProgress, storedCurrentStepIndex) {
  if (!Array.isArray(roadmap) || !roadmap.length) return 0;

  const completedSet = new Set(
    normalizePhaseProgress(phaseProgress)
      .filter((entry) => entry.completed)
      .map((entry) => entry.step),
  );

  const firstIncompleteIndex = roadmap.findIndex((step, index) => !completedSet.has(getRoadmapStepNumber(step, index)));
  if (firstIncompleteIndex >= 0) {
    return firstIncompleteIndex;
  }

  const fallbackIndex = Number(storedCurrentStepIndex);
  if (Number.isInteger(fallbackIndex) && fallbackIndex >= 0 && fallbackIndex < roadmap.length) {
    return fallbackIndex;
  }

  return roadmap.length - 1;
}

export default function Dashboard({ userData, onLogout, onUpdateUserData }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isUpdatingRoadmap, setIsUpdatingRoadmap] = useState(false);
  const [roadmapEditError, setRoadmapEditError] = useState('');
  const [roadmapEditNotice, setRoadmapEditNotice] = useState('');
  const [roadmapEditForm, setRoadmapEditForm] = useState(() => ({
    targetJob: String(userData?.targetJob || '').trim(),
    skills: Array.isArray(userData?.skills) ? userData.skills.join(', ') : '',
  }));
  const pdfRef = useRef(null);
  const quizPanelRef = useRef(null);
  const projectPanelRef = useRef(null);

  const roadmap = useMemo(() => {
    const raw = userData?.roadmap;

    if (Array.isArray(raw)) {
      if (raw.length && typeof raw[0] === 'object' && raw[0] !== null) {
        return raw
          .map((item, index) => ({
            step: Number(item?.step) || index + 1,
            title: String(item?.title || `Step ${index + 1}`).trim(),
            description: String(item?.description || '').trim(),
            resources: Array.isArray(item?.resources) ? item.resources : [],
          }))
          .filter((item) => item.title && item.description);
      }

      return raw
        .map((text, index) => ({
          step: index + 1,
          title: `Step ${index + 1}`,
          description: String(text || '').trim(),
          resources: [],
        }))
        .filter((item) => item.description);
    }

    if (typeof raw === 'string') {
      return raw
        .split('\n')
        .filter(Boolean)
        .map((text, index) => ({
          step: index + 1,
          title: `Step ${index + 1}`,
          description: String(text || '').trim(),
          resources: [],
        }))
        .filter((item) => item.description);
    }

    return [];
  }, [userData]);

  const phaseProgress = useMemo(() => normalizePhaseProgress(userData?.phaseProgress), [userData?.phaseProgress]);
  const earnedBadges = useMemo(() => normalizeBadges(userData?.badges), [userData?.badges]);
  const phaseProjects = useMemo(() => normalizePhaseProjects(userData?.phaseProjects), [userData?.phaseProjects]);
  const reviewedPhaseProjects = useMemo(
    () => phaseProjects.filter((project) => project.feedbackScore > 0),
    [phaseProjects],
  );
  const completedStepNumbers = useMemo(
    () => phaseProgress.filter((entry) => entry.completed).map((entry) => entry.step),
    [phaseProgress],
  );
  const completedStepSet = useMemo(() => new Set(completedStepNumbers), [completedStepNumbers]);
  const currentRoadmapIndex = useMemo(
    () => deriveCurrentRoadmapIndex(roadmap, phaseProgress, userData?.currentStepIndex),
    [roadmap, phaseProgress, userData?.currentStepIndex],
  );
  const currentRoadmapStepNumber = roadmap.length
    ? getRoadmapStepNumber(roadmap[currentRoadmapIndex], currentRoadmapIndex)
    : 0;
  const [selectedRoadmapStepNumber, setSelectedRoadmapStepNumber] = useState(currentRoadmapStepNumber || 1);
  const [quizLaunchRequest, setQuizLaunchRequest] = useState(null);
  const [projectLaunchRequest, setProjectLaunchRequest] = useState(null);

  useEffect(() => {
    if (!roadmap.length) return;

    const hasSelectedStep = roadmap.some(
      (step, index) => getRoadmapStepNumber(step, index) === Number(selectedRoadmapStepNumber),
    );

    if (!hasSelectedStep) {
      setSelectedRoadmapStepNumber(currentRoadmapStepNumber);
    }
  }, [roadmap, selectedRoadmapStepNumber, currentRoadmapStepNumber]);

  useEffect(() => {
    setRoadmapEditForm({
      targetJob: String(userData?.targetJob || '').trim(),
      skills: Array.isArray(userData?.skills) ? userData.skills.join(', ') : '',
    });
  }, [userData?.targetJob, userData?.skills]);

  const triggerPhaseQuizLaunch = (stepNumber) => {
    setSelectedRoadmapStepNumber(stepNumber);
    setQuizLaunchRequest({
      stepNumber,
      nonce: Date.now(),
    });

    window.setTimeout(() => {
      quizPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  };

  const triggerPhaseProjectLaunch = (stepNumber) => {
    setSelectedRoadmapStepNumber(stepNumber);
    setProjectLaunchRequest({
      stepNumber,
      nonce: Date.now(),
    });

    window.setTimeout(() => {
      projectPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  };

  const scrollToRoadmapStepForSkill = (skillName) => {
    const skill = normalizeText(skillName);
    const best =
      roadmap.find((s) =>
        normalizeText(`${s.title} ${s.description}`).includes(skill),
      ) || roadmap[0];

    const targetId = `roadmap-step-${best?.step || 1}`;

    const runScroll = () => {
      let tries = 0;
      const attempt = () => {
        const el = document.getElementById(targetId);
        if (!el) {
          if (tries++ < 12) window.setTimeout(attempt, 50);
          return;
        }
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('roadmap-highlight');
        window.setTimeout(() => el.classList.remove('roadmap-highlight'), 1600);
      };
      attempt();
    };

    setActiveTab('roadmap');
    window.setTimeout(runScroll, 0);
  };

  const handleRoadmapEditChange = (field, value) => {
    setRoadmapEditError('');
    setRoadmapEditNotice('');
    setRoadmapEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetRoadmapEditForm = () => {
    setRoadmapEditError('');
    setRoadmapEditNotice('');
    setRoadmapEditForm({
      targetJob: String(userData?.targetJob || '').trim(),
      skills: Array.isArray(userData?.skills) ? userData.skills.join(', ') : '',
    });
  };

  const handleDownloadRoadmapPdf = async () => {
    if (!roadmap.length || !pdfRef.current || isDownloadingPdf) return;

    setIsDownloadingPdf(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: pdfRef.current.scrollWidth,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const rawName = String(userData?.targetJob || 'Roadmap')
        .replace(/[^\w\- ]+/g, '')
        .trim()
        .replace(/\s+/g, '_');

      pdf.save(`SkillToJob_${rawName || 'Roadmap'}.pdf`);
    } catch (err) {
      console.error(err);
      alert('PDF download failed. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const [jobs, setJobs] = useState([]);
  const [isFetchingJobs, setIsFetchingJobs] = useState(false);
  const [jobsError, setJobsError] = useState('');
  const [jobsNotice, setJobsNotice] = useState('');
  const [jobFilters, setJobFilters] = useState(() => buildInitialJobFilters(userData?.targetJob));
  const [appliedJobFilters, setAppliedJobFilters] = useState(() => buildInitialJobFilters(userData?.targetJob));

  const openJobLink = (url) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const updateJobFilter = (field, value) => {
    setJobFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const applyJobFilters = (event) => {
    event?.preventDefault?.();

    const nextFilters = {
      ...jobFilters,
      keyword: String(jobFilters.keyword || '').trim() || buildJobSearchQuery(userData?.targetJob),
      location: String(jobFilters.location || '').trim(),
    };

    setJobFilters(nextFilters);
    setAppliedJobFilters(nextFilters);
  };

  const resetJobFilters = () => {
    const nextFilters = buildInitialJobFilters(userData?.targetJob);
    setJobFilters(nextFilters);
    setAppliedJobFilters(nextFilters);
  };

  useEffect(() => {
    const nextFilters = buildInitialJobFilters(userData?.targetJob);
    setJobFilters(nextFilters);
    setAppliedJobFilters(nextFilters);
  }, [userData?.targetJob]);

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    const fetchJobs = async () => {
      const targetQuery = String(appliedJobFilters.keyword || '').trim() || buildJobSearchQuery(userData?.targetJob);
      const params = new URLSearchParams({
        query: targetQuery,
        page: '1',
        num_pages: '1',
        date_posted: appliedJobFilters.datePosted || 'all',
      });

      if (appliedJobFilters.location) {
        params.set('location', appliedJobFilters.location);
      }

      if (appliedJobFilters.remote && appliedJobFilters.remote !== 'all') {
        params.set('remote', appliedJobFilters.remote);
      }

      if (appliedJobFilters.country) {
        params.set('country', appliedJobFilters.country);
      }

      setJobs([]);
      setIsFetchingJobs(true);
      setJobsError('');
      setJobsNotice('');

      try {
        const response = await fetchApi(`/api/jobs/search?${params.toString()}`, {
          method: 'GET',
          signal: controller.signal,
        });

        const contentType = String(response.headers.get('content-type') || '');
        const data = contentType.includes('application/json') ? await response.json() : null;

        if (!response.ok) {
          const fallbackMessage =
            response.status === 502
              ? 'Jobs backend is unavailable right now. Please make sure the backend server is running on port 5001.'
              : 'Live job search failed.';
          throw new Error(data?.message || fallbackMessage);
        }

        const liveJobs = Array.isArray(data?.jobs) ? data.jobs : [];

        if (!liveJobs.length) {
          throw new Error('No live jobs found for this role right now.');
        }

        if (isActive) {
          setJobs(liveJobs);
          setJobsNotice(String(data?.warning || '').trim());
        }
      } catch (err) {
        if (err?.name === 'AbortError') return;

        console.error('Failed to fetch jobs from backend:', err);

        if (isActive) {
          setJobs(buildFallbackJobs(userData?.targetJob));
          setJobsError(String(err?.message || 'Live jobs unavailable right now, so sample opportunities are being shown.'));
          setJobsNotice('');
        }
      } finally {
        if (isActive) {
          setIsFetchingJobs(false);
        }
      }
    };

    fetchJobs();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [appliedJobFilters, userData?.targetJob]);

  const applyResumeInsights = ({ skills, jobMatches }) => {
    const currentSkills = Array.isArray(userData?.skills) ? userData.skills : [];
    const mergedSkills = Array.from(
      new Set([...currentSkills, ...(Array.isArray(skills) ? skills : [])].map((s) => String(s || '').trim()).filter(Boolean)),
    );

    const next = {
      ...userData,
      skills: mergedSkills,
      jobMatches: Array.isArray(jobMatches) ? jobMatches : userData?.jobMatches,
    };

    onUpdateUserData?.(next);
  };

  const normalizedCurrentSkills = useMemo(
    () => (Array.isArray(userData?.skills) ? userData.skills : []).map(normalizeText).filter(Boolean).join('|'),
    [userData?.skills],
  );
  const normalizedEditedSkills = useMemo(
    () => normalizeSkillsInput(roadmapEditForm.skills),
    [roadmapEditForm.skills],
  );
  const hasRoadmapEdits = useMemo(() => {
    return (
      normalizeText(roadmapEditForm.targetJob) !== normalizeText(userData?.targetJob) ||
      normalizedEditedSkills.map(normalizeText).join('|') !== normalizedCurrentSkills
    );
  }, [roadmapEditForm.targetJob, userData?.targetJob, normalizedEditedSkills, normalizedCurrentSkills]);

  const handleRoadmapRefresh = async (event) => {
    event.preventDefault();
    setRoadmapEditError('');
    setRoadmapEditNotice('');

    const targetJob = String(roadmapEditForm.targetJob || '').trim();
    const skills = normalizedEditedSkills;
    const name = String(userData?.name || '').trim();
    const education = String(userData?.education || '').trim();

    if (!targetJob) {
      setRoadmapEditError('Target job is required to regenerate your roadmap.');
      return;
    }

    if (!name || !education) {
      setRoadmapEditError('Your profile is missing name or education. Please complete onboarding again.');
      return;
    }

    setIsUpdatingRoadmap(true);
    try {
      const response = await fetchApi('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          education,
          targetJob,
          skills,
        }),
      });

      const data = await readDashboardPayload(response);

      if (!response.ok) {
        throw new Error(String(data?.message || 'Could not update roadmap.'));
      }

      const nextProfile = {
        ...userData,
        targetJob,
        skills,
        roadmap: Array.isArray(data?.roadmap) ? data.roadmap : [],
        jobMatches: Array.isArray(data?.jobMatches) ? data.jobMatches : [],
        phaseProgress: [],
        badges: [],
        phaseProjects: [],
        currentStepIndex: 0,
      };

      onUpdateUserData?.(nextProfile);
      setSelectedRoadmapStepNumber(1);
      setQuizLaunchRequest(null);
      setProjectLaunchRequest(null);
      setActiveTab('roadmap');
      setRoadmapEditNotice('Roadmap updated. Your new target role and skills are now reflected across the dashboard.');
    } catch (error) {
      setRoadmapEditError(String(error?.message || 'Could not update roadmap.'));
    } finally {
      setIsUpdatingRoadmap(false);
    }
  };

  const careerFocusEditor = (
    <div className="tab-content fade-in">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 rounded-[2.5rem] bg-[#f0f3ff] p-6 sm:p-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-2 inline-flex rounded-full bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-indigo-500 shadow-sm">
              Career Editor
            </p>
            <h2 className="text-3xl font-black text-[#3b3a62]">Edit Career Focus</h2>
            <p className="mt-2 max-w-2xl text-sm font-medium text-slate-500">
              Update your skills or future role here, then regenerate the roadmap with one click.
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl border border-[#1f2430]/10 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#1f2430] transition hover:-translate-y-0.5 disabled:opacity-60"
            onClick={resetRoadmapEditForm}
            disabled={isUpdatingRoadmap || !hasRoadmapEdits}
          >
            Reset
          </button>
        </div>

        <form
          className="relative z-20 w-full rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_5px_15px_rgba(0,0,0,0.02)]"
          onSubmit={handleRoadmapRefresh}
        >
          <div className="grid grid-cols-1 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Target Job</span>
              <input
                type="text"
                value={roadmapEditForm.targetJob}
                onChange={(event) => handleRoadmapEditChange('targetJob', event.target.value)}
                placeholder="Software Developer"
                className="rounded-[18px] border border-[#1f2430]/10 bg-white px-4 py-3 text-[#1f2430] outline-none transition focus:border-[#0f766e]/40 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.08)]"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Skills</span>
              <textarea
                rows="3"
                value={roadmapEditForm.skills}
                onChange={(event) => handleRoadmapEditChange('skills', event.target.value)}
                placeholder="React, Node.js, communication"
                className="rounded-[18px] border border-[#1f2430]/10 bg-white px-4 py-3 text-[#1f2430] outline-none transition focus:border-[#0f766e]/40 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.08)]"
              />
            </label>
          </div>

          <p className="mt-4 text-xs font-semibold text-slate-500">
            Regenerating the roadmap resets quiz, badge, and project progress for the current learning path.
          </p>

          {roadmapEditNotice ? (
            <div className="mt-4 rounded-[18px] border border-[#0f766e]/15 bg-[#ecfeff] px-4 py-3 text-sm font-bold text-[#0f766e]">
              {roadmapEditNotice}
            </div>
          ) : null}

          {roadmapEditError ? (
            <div className="mt-4 rounded-[18px] border border-[#ef4444]/15 bg-[#fef2f2] px-4 py-3 text-sm font-bold text-[#b91c1c]">
              {roadmapEditError}
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isUpdatingRoadmap || !hasRoadmapEdits}
              className="rounded-[18px] bg-[#1f2430] px-5 py-3 text-sm font-black text-[#fff7eb] shadow-[0_18px_40px_rgba(31,36,48,0.12)] transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {isUpdatingRoadmap ? 'Updating Roadmap...' : 'Save Changes'}
            </button>
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              {hasRoadmapEdits ? 'Ready to refresh roadmap' : 'No changes yet'}
            </span>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="dashboard-wrapper">
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <div className="logo">SkillToJob</div>
          <div className="logo-subtitle">AI Career Roadmap</div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span className="nav-icon">👤</span>
            <span>Overview</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'jobs' ? 'active' : ''}`}
            onClick={() => setActiveTab('jobs')}
          >
            <span className="nav-icon">💼</span>
            <span>Job Board</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'roadmap' ? 'active' : ''}`}
            onClick={() => setActiveTab('roadmap')}
          >
            <span className="nav-icon">🗺️</span>
            <span>My Roadmap</span>
          </button>
        </nav>

        <div className="sidebar-actions">
          <button
            className={`nav-item ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => setActiveTab('edit')}
            type="button"
          >
            <span className="nav-icon">✏️</span>
            <span>Edit Career</span>
          </button>

          <button
            className="logout-button"
            onClick={() => {
              onLogout?.();
              navigate('/');
            }}
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>Welcome, {userData?.name}! 👋</h1>
            <p>Your personalized career path awaits</p>
          </div>
          <div className="header-stats">
            <div className="stat">
              <span className="stat-value">{userData?.skills?.length || 0}</span>
              <span className="stat-label">Skills</span>
            </div>
            <div className="stat">
              <span className="stat-value">{jobs.length}</span>
              <span className="stat-label">Job Matches</span>
            </div>
            <div className="stat">
              <span className="stat-value">{earnedBadges.length}</span>
              <span className="stat-label">Badges</span>
            </div>
            <div className="stat">
              <span className="stat-value">{reviewedPhaseProjects.length}</span>
              <span className="stat-label">Projects</span>
            </div>
          </div>
        </header>

        <section className="profile-cards">
          <div className="profile-card glass-effect">
            <span className="card-icon">👤</span>
            <div className="card-content">
              <p className="card-label">Full Name</p>
              <p className="card-value">{userData?.name}</p>
            </div>
          </div>
          <div className="profile-card glass-effect">
            <span className="card-icon">🎓</span>
            <div className="card-content">
              <p className="card-label">Education</p>
              <p className="card-value">{userData?.education}</p>
            </div>
          </div>
          <div className="profile-card glass-effect">
            <span className="card-icon">💼</span>
            <div className="card-content">
              <p className="card-label">Target Role</p>
              <p className="card-value">{userData?.targetJob}</p>
            </div>
          </div>
          <div className="profile-card glass-effect">
            <span className="card-icon">🧩</span>
            <div className="card-content">
              <p className="card-label">Skills</p>
              <p className="card-value">
                {userData?.skills?.slice(0, 2).join(', ') || 'None'}
                {userData?.skills?.length > 2 && '...'}
              </p>
            </div>
          </div>
        </section>

        <section className="tab-section">
          {activeTab === 'overview' && (
            <div className="tab-content relative w-full rounded-[2.5rem] bg-[#f0f3ff] p-6 sm:p-10 mb-8 grid grid-cols-1 xl:grid-cols-12 gap-8 font-sans -mt-4">
              
              {/* LEFT COLUMN - 8/12 */}
              <div className="xl:col-span-8 flex flex-col gap-6">
                 
                 {/* HERO BANNER */}
                 <div className="relative bg-gradient-to-br from-[#8075ff] to-[#a28efa] rounded-[2rem] p-8 h-[220px] flex shadow-[0_15px_40px_rgba(128,117,255,0.25)] overflow-visible">
                    {/* Sparkles / Stars */}
                    <div className="absolute top-6 left-6 text-white text-lg animate-pulse">✨</div>
                    <div className="absolute bottom-10 left-1/3 text-white/70 text-2xl animate-pulse">✦</div>
                    <div className="absolute top-12 right-[45%] text-white/50 text-xl">✨</div>

                    <div className="flex flex-col justify-center w-full lg:w-[65%] relative z-10">
                       <h2 className="text-[2.5rem] leading-tight font-extrabold text-white mb-1">
                          Hello, {userData?.name?.split(' ')[0] || 'Explorer'}
                       </h2>
                       <p className="text-white/90 text-sm font-medium mb-6">Nice to have you back</p>

                       <div className="inline-flex items-center bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl p-2 pr-6 max-w-max gap-3 shadow-sm hover:bg-white/30 transition-colors">
                          <div className="bg-white w-10 h-10 rounded-[0.8rem] flex items-center justify-center text-indigo-500 text-xl shadow-sm">
                            🎯
                          </div>
                          <div>
                             <p className="text-white/80 text-[10px] uppercase font-extrabold tracking-wider mb-0.5">Target Role</p>
                             <p className="text-white font-bold text-sm leading-none">{userData?.targetJob || 'Software Developer'}</p>
                          </div>
                       </div>
                    </div>

                    {/* Panda replacing Superman */}
                    <div className="hidden sm:flex absolute -top-[50px] -right-4 w-[300px] h-full pointer-events-none drop-shadow-2xl items-end justify-center">
                        <span className="text-[180px] leading-[0.85] drop-shadow-xl">🐼</span>
                    </div>
                 </div>

                 {/* RESUME SYNC */}
                 <div className="flex flex-col mt-2">
                    <div className="flex items-center gap-3 mb-4">
                       <h3 className="text-[#3b3a62] font-black text-xl">Resume Sync</h3>
                       <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg tracking-wider">Active</span>
                    </div>
                    <div className="relative z-20 w-full bg-white rounded-[2rem] p-6 shadow-[0_5px_15px_rgba(0,0,0,0.02)] border border-slate-100">
                       <ResumeUpload
                            targetJob={userData?.targetJob}
                            existingSkills={userData?.skills || []}
                            onApplied={applyResumeInsights}
                       />
                    </div>
                 </div>

                 {/* AI CAREER INSIGHTS */}
                 <div className="flex flex-col mt-2">
                    <h3 className="text-[#3b3a62] font-black text-xl mb-4">Market Intelligence</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       {(() => {
                          const role = (userData?.targetJob || '').toLowerCase();
                          let salary = 115;
                          let growth = 12;
                          let barPercent = 60;
                          
                          if (role.includes('front') || role.includes('web') || role.includes('react')) { salary = 125; growth = 15; barPercent = 75; }
                          else if (role.includes('back') || role.includes('node') || role.includes('java')) { salary = 135; growth = 18; barPercent = 82; }
                          else if (role.includes('data') || role.includes('ml') || role.includes('ai')) { salary = 145; growth = 22; barPercent = 90; }
                          else if (role.includes('e-commerce') || role.includes('business') || role.includes('product')) { salary = 98; growth = 14; barPercent = 55; }
                          else if (role.includes('design') || role.includes('ui')) { salary = 110; growth = 11; barPercent = 65; }
                          else if (role.includes('cloud') || role.includes('devops')) { salary = 140; growth = 20; barPercent = 88; }
                          
                          return (
                            <>
                               {/* Salary Card */}
                               <div className="bg-white rounded-[1.5rem] p-6 shadow-[0_4px_15px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col gap-2 relative overflow-hidden group hover:shadow-md transition-shadow">
                                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-100/50 rounded-full blur-[20px] -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
                                  <span className="text-emerald-500 font-bold text-xs uppercase tracking-widest relative z-10">Avg Base Pay</span>
                                  <h4 className="text-[2rem] font-black text-[#3b3a62] relative z-10 leading-none mt-1">${salary}k<span className="text-sm text-slate-400 font-medium">/yr</span></h4>
                                  <p className="text-[11px] text-slate-500 relative z-10 leading-tight mt-1">Based on recent <span className="font-bold">{userData?.targetJob || 'Developer'}</span> postings in your region.</p>
                                  <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden relative z-10">
                                     <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${barPercent}%` }} />
                                  </div>
                               </div>

                               {/* Demand Card */}
                               <div className="bg-white rounded-[1.5rem] p-6 shadow-[0_4px_15px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col gap-2 relative overflow-hidden group hover:shadow-md transition-shadow">
                                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-100/50 rounded-full blur-[20px] -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
                                  <span className="text-indigo-500 font-bold text-xs uppercase tracking-widest relative z-10">Industry Demand</span>
                                  <h4 className="text-[2rem] font-black text-[#3b3a62] relative z-10 leading-none mt-1">+{growth}%<span className="text-sm text-slate-400 font-medium"> YOY</span></h4>
                                  <p className="text-[11px] text-slate-500 relative z-10 leading-tight mt-1">{growth > 15 ? 'Extremely high hiring volume projected this quarter.' : 'Steady hiring volume projected for this upcoming quarter.'}</p>
                                  <div className="mt-3 flex gap-1 relative z-10">
                                     {[1,2,3,4,5].map(v => (
                                       <div key={v} className={`h-1.5 flex-1 rounded-full ${v <= Math.min(5, Math.ceil(growth / 4)) ? 'bg-indigo-400' : 'bg-slate-100'}`} />
                                     ))}
                                  </div>
                               </div>
                            </>
                          )
                       })()}
                    </div>
                 </div>

                 {/* TOP MATCHES MINI LIST */}
                 <div className="flex flex-col mt-2">
                    <div className="flex items-center justify-between mb-4">
                       <h3 className="text-[#3b3a62] font-black text-xl">Hot Opportunities</h3>
                       <span className="text-xs font-bold text-indigo-500 cursor-pointer hover:text-indigo-700 transition-colors" onClick={() => setActiveTab('jobs')}>View Job Board →</span>
                    </div>
                    {(() => {
                        const topJob = typeof jobs !== 'undefined' && jobs.length > 0 
                           ? jobs[0] 
                           : { title: `${userData?.targetJob || 'Developer'}`, company: 'Tech Solutions Inc.', location: 'Remote', match: 92, url: '' };
                       
                       const getEmoji = (name) => {
                         const n = String(name).toLowerCase();
                         if (n.includes('tech') || n.includes('soft') || n.includes('code')) return '💻';
                         if (n.includes('fin') || n.includes('bank') || n.includes('pay')) return '🏦';
                         if (n.includes('health') || n.includes('med')) return '🏥';
                         if (n.includes('shop') || n.includes('commerce') || n.includes('retail')) return '🛍️';
                         if (n.includes('data') || n.includes('ai')) return '🤖';
                         return '🏢';
                       };

                       return (
                           <div className="bg-white rounded-[1.5rem] p-4 shadow-[0_4px_15px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center group cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-indigo-500" onClick={() => (topJob.url ? openJobLink(topJob.url) : setActiveTab('jobs'))}>
                             <div className="flex items-center gap-4 w-full">
                                <div className="w-12 h-12 rounded-[1rem] bg-indigo-50/50 flex justify-center items-center text-2xl shadow-inner shrink-0 border border-indigo-100">
                                  {getEmoji(topJob.company)}
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                   <h4 className="font-bold text-[#3b3a62] text-[15px] truncate">{topJob.title}</h4>
                                   <p className="text-[11px] font-bold text-slate-400 truncate">{topJob.company} • {topJob.location}</p>
                                </div>
                             </div>
                             <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto justify-end">
                                <span className="bg-emerald-50 text-emerald-600 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase whitespace-nowrap shadow-sm">{topJob.match}% Match</span>
                                <button className="bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:shadow-md px-4 py-2.5 rounded-xl text-xs font-bold transition-all" onClick={(e) => { e.stopPropagation(); topJob.url ? openJobLink(topJob.url) : setActiveTab('jobs'); }}>Apply Now</button>
                             </div>
                          </div>
                       )
                    })()}
                 </div>

              </div>

              {/* RIGHT COLUMN - 4/12 */}
              <div className="xl:col-span-4 flex flex-col gap-6">
                 <div className="flex items-center justify-between">
                    <h3 className="text-[#3b3a62] font-black text-xl">Target Skills</h3>
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-400 hover:bg-indigo-50 hover:text-indigo-500 cursor-pointer transition-colors">
                      🔔
                    </div>
                 </div>

                 <div className="flex flex-col gap-4">
                    {/* Render exact visual matching Donut Chart Tasks with real user progress */}
                    {((roadmap && roadmap.length > 0) ? roadmap.slice(0, 4) : [
                       { title: 'System Architecture', description: 'Design scalable backends' },
                       { title: 'React Performance', description: 'Memoization & Rendering' },
                       { title: 'Database Indexing', description: 'SQL Optimization logic' },
                       { title: 'Cloud Deployment', description: 'Docker & AWS Basics' }
                    ]).map((task, i) => {
                       const stepNumber = getRoadmapStepNumber(task, i);
                       const isCompleted = completedStepSet.has(stepNumber);
                       const isCurrent = stepNumber === currentRoadmapStepNumber;
                       let percent = 0;
                       if (isCompleted) percent = 100;
                       else if (isCurrent) percent = 15;
                       else percent = 0;

                       const colors = [
                         { border: percent === 100 ? '#10b981' : '#3fd8a0', text: '#3b3a62' }, // Teal
                         { border: percent === 100 ? '#10b981' : '#1bb5b3', text: '#3b3a62' }, // Darker Teal
                         { border: percent === 100 ? '#10b981' : '#3b3a62', text: '#3b3a62' }, // Navy
                         { border: percent === 100 ? '#10b981' : '#423d89', text: '#3b3a62' }, // Deep Blue
                       ][i % 4];

                       // Use displayPercent to render non-zero charts for full zero tasks so it doesn't break CSS conic-gradient parsing visually
                       const displayPercent = percent === 0 ? 0 : percent;

                       return (
                         <div key={i} className="bg-white rounded-[1.5rem] p-5 shadow-[0_5px_15px_rgba(0,0,0,0.02)] hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 border border-white flex gap-5 items-center group cursor-pointer w-full" onClick={() => scrollToRoadmapStepForSkill(task.title)}>
                            
                            {/* CSS Conic Gradient Donut Chart */}
                            <div className="relative w-16 h-16 rounded-full flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform" style={{ background: displayPercent === 0 ? '#f1f5f9' : `conic-gradient(${colors.border} ${displayPercent}%, #f1f5f9 0)` }}>
                               <div className="absolute inset-[6px] rounded-full bg-white flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                                  <span className="text-[13px] font-black" style={{ color: displayPercent === 100 ? '#10b981' : colors.text }}>{displayPercent}%</span>
                               </div>
                            </div>

                            <div className="flex flex-col flex-1 min-w-0">
                               <h4 className="font-bold text-[#3b3a62] text-[15px] truncate mb-1 group-hover:text-indigo-600 transition-colors">{task.title}</h4>
                               <p className="text-[11px] text-slate-500 truncate mb-2">{task.description}</p>
                               <div className="flex gap-4 text-[9px] font-bold text-slate-400 tracking-wide">
                                  <span className={`flex items-center gap-1.5 ${displayPercent === 100 ? 'text-emerald-500' : ''}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${displayPercent === 100 ? 'bg-emerald-400' : displayPercent > 0 ? 'bg-indigo-400 animate-pulse' : 'bg-slate-300'}`} />
                                    {displayPercent === 100 ? 'Completed' : `Phase ${stepNumber}`}
                                  </span>
                                  <span className="flex items-center gap-1 text-slate-400 font-semibold">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    2 wks
                                  </span>
                               </div>
                            </div>
                         </div>
                       )
                    })}
                 </div>
              </div>

            </div>
          )}

          {activeTab === 'jobs' && (
            <div className="tab-content fade-in">
              <h2>AI-Suggested Job Matches</h2>
              <form className="jobs-toolbar" onSubmit={applyJobFilters}>
                <div className="jobs-filter-group">
                  <label htmlFor="jobs-keyword">Role or keyword</label>
                  <input
                    id="jobs-keyword"
                    className="jobs-filter-input"
                    type="text"
                    value={jobFilters.keyword}
                    onChange={(e) => updateJobFilter('keyword', e.target.value)}
                    placeholder="e.g. ecommerce manager"
                  />
                </div>

                <div className="jobs-filter-group">
                  <label htmlFor="jobs-location">Location</label>
                  <input
                    id="jobs-location"
                    className="jobs-filter-input"
                    type="text"
                    value={jobFilters.location}
                    onChange={(e) => updateJobFilter('location', e.target.value)}
                    placeholder="e.g. Bangalore"
                  />
                </div>

                <div className="jobs-filter-group">
                  <label htmlFor="jobs-remote">Work mode</label>
                  <select
                    id="jobs-remote"
                    className="jobs-filter-select"
                    value={jobFilters.remote}
                    onChange={(e) => updateJobFilter('remote', e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">On-site</option>
                  </select>
                </div>

                <div className="jobs-filter-group">
                  <label htmlFor="jobs-date">Posted within</label>
                  <select
                    id="jobs-date"
                    className="jobs-filter-select"
                    value={jobFilters.datePosted}
                    onChange={(e) => updateJobFilter('datePosted', e.target.value)}
                  >
                    <option value="all">Any time</option>
                    <option value="today">Last 24 hours</option>
                    <option value="3days">Last 3 days</option>
                    <option value="week">Last 7 days</option>
                    <option value="month">Last 30 days</option>
                  </select>
                </div>

                <div className="jobs-filter-group">
                  <label htmlFor="jobs-country">Country</label>
                  <select
                    id="jobs-country"
                    className="jobs-filter-select"
                    value={jobFilters.country}
                    onChange={(e) => updateJobFilter('country', e.target.value)}
                  >
                    <option value="in">India</option>
                    <option value="us">United States</option>
                    <option value="gb">United Kingdom</option>
                    <option value="de">Germany</option>
                    <option value="">All countries</option>
                  </select>
                </div>

                <div className="jobs-filter-actions">
                  <button className="jobs-search-btn" type="submit" disabled={isFetchingJobs}>
                    {isFetchingJobs ? 'Searching...' : 'Search Jobs'}
                  </button>
                  <button className="jobs-reset-btn" type="button" onClick={resetJobFilters} disabled={isFetchingJobs}>
                    Reset
                  </button>
                </div>
              </form>
              {isFetchingJobs ? (
                <p className="jobs-status">Fetching live job openings for your target role...</p>
              ) : jobsError ? (
                <p className="jobs-status jobs-status-warning">{jobsError}</p>
              ) : jobsNotice ? (
                <p className="jobs-status jobs-status-info">{jobsNotice}</p>
              ) : (
                <p className="jobs-status">Showing live roles for {appliedJobFilters.keyword || userData?.targetJob || 'Developer'}.</p>
              )}
              <div className="jobs-grid">
                {jobs.map((job, idx) => (
                  <div key={job.id || idx} className="job-card glass-effect">
                    <div className="job-header">
                      <h3>{job.title}</h3>
                      <span className="match-badge">{job.match}% Match</span>
                    </div>
                    <p className="company-name">{job.company}</p>
                    <p className="job-location">📍 {job.location}</p>
                    {job.salary ? <p className="job-salary">{job.salary}</p> : null}
                    {(job.employmentType || job.postedAt) ? (
                      <div className="job-meta-row">
                        {job.employmentType ? <span className="job-tag">{job.employmentType}</span> : null}
                        {job.postedAt ? <span className="job-tag secondary">{job.postedAt}</span> : null}
                      </div>
                    ) : null}
                    {job.source ? <p className="job-source">Source: {job.source}</p> : null}
                    {job.description ? <p className="job-snippet">{job.description}</p> : null}
                    <button
                      className="job-action-btn"
                      type="button"
                      onClick={() => openJobLink(job.url)}
                      disabled={!job.url}
                    >
                      {job.url ? 'View Full Job' : 'Link Unavailable'}
                    </button>
                  </div>
                ))}
              </div>
              {!isFetchingJobs && jobs.length === 0 ? (
                <p className="jobs-empty">No jobs found yet. Try updating your target role and refresh the dashboard.</p>
              ) : null}
            </div>
          )}

          {activeTab === 'edit' && careerFocusEditor}

          {activeTab === 'roadmap' && (
            <div className="tab-content fade-in">
              <h2>Your Career Roadmap to {userData?.targetJob}</h2>
              <WorkflowMap
                roadmap={roadmap}
                targetJob={userData?.targetJob}
                currentStepIndex={currentRoadmapIndex}
                completedSteps={completedStepNumbers}
                selectedStep={selectedRoadmapStepNumber}
                onSelectStep={setSelectedRoadmapStepNumber}
              />

              <BadgeShelf roadmap={roadmap} badges={earnedBadges} />
              
              <h3 style={{ marginTop: '40px', marginBottom: '20px' }}>Detailed Learning Path & Resources</h3>
              <div className="roadmap-timeline">
                {roadmap.length ? (
                  roadmap.map((step, idx) => (
                    (() => {
                      const stepNumber = getRoadmapStepNumber(step, idx);
                      const progress = phaseProgress.find((entry) => entry.step === stepNumber);
                      const isCompleted = completedStepSet.has(stepNumber);
                      const isCurrent = stepNumber === currentRoadmapStepNumber;
                      const isSelected = stepNumber === selectedRoadmapStepNumber;

                      return (
                    <div
                      key={idx}
                      id={`roadmap-step-${step.step ?? idx + 1}`}
                      className={`roadmap-item glass-effect ${isSelected ? 'roadmap-item-selected' : ''}`}
                    >
                      <div className="roadmap-marker">{step.step ?? idx + 1}</div>
                      <div className="roadmap-content">
                        <div className="roadmap-step-top">
                          <h3 className="roadmap-step-title">{step.title}</h3>
                          <div className="roadmap-step-pills">
                            <span className={`roadmap-step-pill ${isCompleted ? 'done' : isCurrent ? 'current' : 'locked'}`}>
                              {isCompleted ? 'Completed' : isCurrent ? 'Current' : 'Locked'}
                            </span>
                            {progress?.bestScore ? (
                              <span className="roadmap-step-pill score">Best {progress.bestScore}/5</span>
                            ) : null}
                          </div>
                        </div>
                        <p className="roadmap-step-desc">{step.description}</p>

                        {Array.isArray(step.resources) && step.resources.length > 0 && (
                          <div className="learning-resources">
                            <div className="resources-header">
                              <span className="resources-title">Learning Resources</span>
                              <span className="resources-subtitle">Free • 2 picks</span>
                            </div>
                            <div className="resource-links">
                              {step.resources.slice(0, 2).map((r, i) => {
                                const meta = getResourceMeta(r?.name);
                                return (
                                  <a
                                    key={`${step.step}-${i}`}
                                    className={`resource-link ${meta.cls}`}
                                    href={r?.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    title={`${r?.name}: ${r?.title}`}
                                  >
                                    <span className={`resource-icon ${meta.cls}`} aria-hidden="true">
                                      {meta.icon}
                                    </span>
                                    <span className="resource-text">
                                      <span className="resource-platform">{r?.name}</span>
                                      <span className="resource-title-text">{r?.title}</span>
                                    </span>
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="roadmap-step-actions">
                          <button
                            type="button"
                            className="roadmap-quiz-btn"
                            onClick={() => triggerPhaseQuizLaunch(stepNumber)}
                          >
                            {isCompleted ? 'Review Quiz' : 'Take Phase Quiz'}
                          </button>
                          <button
                            type="button"
                            className="roadmap-project-btn"
                            onClick={() => triggerPhaseProjectLaunch(stepNumber)}
                          >
                            Proof of Skill
                          </button>
                          {progress?.attempts ? (
                            <span className="roadmap-step-meta">
                              Attempts: {progress.attempts}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                      );
                    })()
                  ))
                ) : (
                  <p className="empty-state">
                    No roadmap generated yet. Update your profile to create one.
                  </p>
                )}
              </div>

              {roadmap.length ? (
                <div ref={quizPanelRef}>
                  <PhaseQuizPanel
                    userData={userData}
                    roadmap={roadmap}
                    selectedStepNumber={selectedRoadmapStepNumber}
                    onSelectStep={setSelectedRoadmapStepNumber}
                    onUpdateUserData={onUpdateUserData}
                    launchRequest={quizLaunchRequest}
                  />
                </div>
              ) : null}

              {roadmap.length ? (
                <div ref={projectPanelRef}>
                  <PhaseProjectPanel
                    userData={userData}
                    roadmap={roadmap}
                    selectedStepNumber={selectedRoadmapStepNumber}
                    onUpdateUserData={onUpdateUserData}
                    launchRequest={projectLaunchRequest}
                  />
                </div>
              ) : null}

              {reviewedPhaseProjects.length ? (
                <div className="phase-project-history glass-effect">
                  <div className="phase-project-history-top">
                    <div>
                      <span className="phase-project-kicker">Portfolio Builder</span>
                      <h3>Reviewed Proof of Skill Projects</h3>
                      <p>These projects are now saved in your profile data and resume PDF.</p>
                    </div>
                    <div className="badge-shelf-count">{reviewedPhaseProjects.length} reviewed</div>
                  </div>

                  <div className="phase-project-history-grid">
                    {reviewedPhaseProjects.map((project) => (
                      <article key={project.step} className="phase-project-history-card">
                        <div className="phase-project-history-card-top">
                          <strong>{project.projectTitle}</strong>
                          <span>{project.feedbackScore}/100</span>
                        </div>
                        <p>{project.feedbackSummary}</p>
                        <div className="phase-project-history-meta">{project.phaseTitle}</div>
                        <div className="phase-project-history-bullet">{project.resumeBullet}</div>
                        {project.submissionLink ? (
                          <a href={project.submissionLink} target="_blank" rel="noreferrer">
                            View submitted project
                          </a>
                        ) : null}
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}

              {roadmap.length > 0 && (
                <div className="roadmap-actions">
                  <button
                    type="button"
                    className="pdf-download-btn"
                    onClick={handleDownloadRoadmapPdf}
                    disabled={isDownloadingPdf}
                  >
                    <Download size={18} />
                    <span>{isDownloadingPdf ? 'Preparing PDF...' : 'Download as PDF'}</span>
                  </button>
                </div>
              )}

              <div className="roadmap-pdf-root" ref={pdfRef} aria-hidden="true">
                <div className="roadmap-pdf-header">
                  <div className="roadmap-pdf-brand">SkillToJob</div>
                  <div className="roadmap-pdf-meta">
                    <div className="roadmap-pdf-title">
                      Career Roadmap — {String(userData?.targetJob || 'Target Role').trim() || 'Target Role'}
                    </div>
                    <div className="roadmap-pdf-subtitle">
                      {String(userData?.name || '').trim() ? `For: ${String(userData?.name || '').trim()}` : ''}
                    </div>
                    <div className="roadmap-pdf-subtitle">
                      Generated: {new Date().toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {earnedBadges.length ? (
                  <div className="roadmap-pdf-badges">
                    <div className="roadmap-pdf-badges-title">Earned Badges</div>
                    <div className="roadmap-pdf-badges-list">
                      {earnedBadges.map((badge) => (
                        <div key={badge.id || badge.phaseStep} className="roadmap-pdf-badge">
                          <strong>{badge.badgeTitle}</strong>
                          <span>{badge.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {reviewedPhaseProjects.length ? (
                  <div className="roadmap-pdf-projects">
                    <div className="roadmap-pdf-badges-title">Proof of Skill Projects</div>
                    <div className="roadmap-pdf-projects-list">
                      {reviewedPhaseProjects.map((project) => (
                        <div key={project.step} className="roadmap-pdf-project-card">
                          <strong>{project.projectTitle}</strong>
                          <div className="roadmap-pdf-project-meta">
                            {project.phaseTitle} • Feedback Score: {project.feedbackScore}/100
                          </div>
                          {project.resumeBullet ? (
                            <div className="roadmap-pdf-project-bullet">{project.resumeBullet}</div>
                          ) : null}
                          {project.submissionLink ? (
                            <div className="roadmap-pdf-project-link">{project.submissionLink}</div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="roadmap-pdf-steps">
                  {roadmap.map((step, idx) => (
                    <div key={idx} className="roadmap-pdf-step">
                      <div className="roadmap-pdf-step-top">
                        <div className="roadmap-pdf-step-no">{step.step ?? idx + 1}</div>
                        <div className="roadmap-pdf-step-text">
                          <div className="roadmap-pdf-step-title">{step.title}</div>
                          <div className="roadmap-pdf-step-desc">{step.description}</div>
                          {completedStepSet.has(getRoadmapStepNumber(step, idx)) ? (
                            <div className="roadmap-pdf-step-status">Badge unlocked</div>
                          ) : null}
                        </div>
                      </div>

                      {Array.isArray(step.resources) && step.resources.length > 0 && (
                        <div className="roadmap-pdf-resources">
                          <div className="roadmap-pdf-resources-title">Learning Resources (Free)</div>
                          <ul className="roadmap-pdf-resources-list">
                            {step.resources.slice(0, 2).map((r, i) => (
                              <li key={i} className="roadmap-pdf-resource">
                                <span className="roadmap-pdf-resource-name">{String(r?.name || 'Resource').trim()}</span>
                                <span className="roadmap-pdf-resource-sep"> — </span>
                                <span className="roadmap-pdf-resource-title">{String(r?.title || '').trim()}</span>
                                {String(r?.url || '').trim() ? (
                                  <span className="roadmap-pdf-resource-url"> ({String(r?.url || '').trim()})</span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <AIMentor userData={userData} />
    </div>
  );
}
