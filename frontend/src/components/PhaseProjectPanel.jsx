import { useEffect, useMemo, useState } from 'react';
import { fetchApi } from '../utils/apiClient.js';
import {
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FolderKanban,
  Loader2,
  RefreshCw,
  Sparkles,
  Wand2,
} from 'lucide-react';

function normalizeStringList(values) {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

function normalizePhaseProjects(projects) {
  if (!Array.isArray(projects)) return [];

  return projects
    .map((project) => ({
      step: Number(project?.step) || 0,
      phaseTitle: String(project?.phaseTitle || '').trim(),
      projectTitle: String(project?.projectTitle || '').trim(),
      objective: String(project?.objective || '').trim(),
      deliverableType: String(project?.deliverableType || '').trim(),
      brief: String(project?.brief || '').trim(),
      requirements: normalizeStringList(project?.requirements),
      submissionTips: normalizeStringList(project?.submissionTips),
      evaluationFocus: normalizeStringList(project?.evaluationFocus),
      portfolioBullet: String(project?.portfolioBullet || '').trim(),
      submissionLink: String(project?.submissionLink || '').trim(),
      submissionNotes: String(project?.submissionNotes || '').trim(),
      feedbackScore: Math.max(0, Number(project?.feedbackScore) || 0),
      feedbackSummary: String(project?.feedbackSummary || '').trim(),
      strengths: normalizeStringList(project?.strengths),
      improvements: normalizeStringList(project?.improvements),
      resumeBullet: String(project?.resumeBullet || '').trim(),
      reviewedAt: String(project?.reviewedAt || '').trim(),
      generatedAt: String(project?.generatedAt || '').trim(),
      projectSource: String(project?.projectSource || '').trim(),
      reviewSource: String(project?.reviewSource || '').trim(),
    }))
    .filter((project) => project.step > 0);
}

function mergePhaseProjects(projects, nextProject) {
  const normalized = normalizePhaseProjects(projects).filter((project) => project.step !== nextProject.step);
  return [...normalized, nextProject].sort((a, b) => a.step - b.step);
}

function getStepNumber(step, index) {
  return Number(step?.step) || index + 1;
}

function buildProjectReviewResult(project) {
  if (!project || !project.feedbackScore) return null;

  return {
    score: project.feedbackScore,
    summary: project.feedbackSummary,
    strengths: project.strengths,
    improvements: project.improvements,
    resumeBullet: project.resumeBullet || project.portfolioBullet,
  };
}

export default function PhaseProjectPanel({
  userData,
  roadmap,
  selectedStepNumber,
  onUpdateUserData,
  launchRequest,
}) {
  const [project, setProject] = useState(null);
  const [submissionLink, setSubmissionLink] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [projectError, setProjectError] = useState('');
  const [projectNotice, setProjectNotice] = useState('');
  const [reviewResult, setReviewResult] = useState(null);
  const [isGeneratingProject, setIsGeneratingProject] = useState(false);
  const [isReviewingProject, setIsReviewingProject] = useState(false);

  const normalizedRoadmap = Array.isArray(roadmap) ? roadmap : [];
  const savedProjects = useMemo(() => normalizePhaseProjects(userData?.phaseProjects), [userData?.phaseProjects]);

  const selectedStepIndex = useMemo(
    () => normalizedRoadmap.findIndex((step, idx) => getStepNumber(step, idx) === Number(selectedStepNumber)),
    [normalizedRoadmap, selectedStepNumber],
  );

  const selectedStep = selectedStepIndex >= 0 ? normalizedRoadmap[selectedStepIndex] : null;
  const stepNumber = selectedStep ? getStepNumber(selectedStep, selectedStepIndex) : 0;
  const savedProject = useMemo(
    () => savedProjects.find((entry) => entry.step === stepNumber) || null,
    [savedProjects, stepNumber],
  );

  useEffect(() => {
    if (!selectedStep) {
      setProject(null);
      setSubmissionLink('');
      setSubmissionNotes('');
      setReviewResult(null);
      return;
    }

    if (savedProject) {
      setProject(savedProject);
      setSubmissionLink(savedProject.submissionLink || '');
      setSubmissionNotes(savedProject.submissionNotes || '');
      setReviewResult(buildProjectReviewResult(savedProject));
      setProjectError('');
      setProjectNotice('');
      return;
    }

    setProject(null);
    setSubmissionLink('');
    setSubmissionNotes('');
    setReviewResult(null);
    setProjectError('');
    setProjectNotice('');
  }, [savedProject, selectedStep]);

  const persistProject = (nextProject) => {
    onUpdateUserData?.({
      ...userData,
      phaseProjects: mergePhaseProjects(userData?.phaseProjects, nextProject),
    });
  };

  const generateProjectForSelectedStep = async () => {
    if (!selectedStep || isGeneratingProject) return;

    setIsGeneratingProject(true);
    setProjectError('');
    setProjectNotice('');
    setReviewResult(null);

    try {
      const response = await fetchApi('/api/user/phase-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phaseTitle: selectedStep.title,
          phaseDescription: selectedStep.description,
          education: userData?.education,
          targetRole: userData?.targetJob,
          skills: Array.isArray(userData?.skills) ? userData.skills : [],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Could not generate the project right now.');
      }

      const generatedAt = new Date().toLocaleDateString();
      const nextProject = {
        step: stepNumber,
        phaseTitle: selectedStep.title,
        projectTitle: String(data?.project?.projectTitle || '').trim(),
        objective: String(data?.project?.objective || '').trim(),
        deliverableType: String(data?.project?.deliverableType || '').trim(),
        brief: String(data?.project?.brief || '').trim(),
        requirements: normalizeStringList(data?.project?.requirements),
        submissionTips: normalizeStringList(data?.project?.submissionTips),
        evaluationFocus: normalizeStringList(data?.project?.evaluationFocus),
        portfolioBullet: String(data?.project?.portfolioBullet || '').trim(),
        submissionLink: '',
        submissionNotes: '',
        feedbackScore: 0,
        feedbackSummary: '',
        strengths: [],
        improvements: [],
        resumeBullet: '',
        reviewedAt: '',
        generatedAt,
        projectSource: String(data?.source || '').trim(),
        reviewSource: '',
      };

      setProject(nextProject);
      setSubmissionLink('');
      setSubmissionNotes('');
      persistProject(nextProject);
      setProjectNotice(String(data?.warning || '').trim());
    } catch (error) {
      console.error(error);
      setProjectError(String(error?.message || 'Project generation failed.'));
    } finally {
      setIsGeneratingProject(false);
    }
  };

  useEffect(() => {
    if (!launchRequest?.nonce) return;
    if (Number(launchRequest?.stepNumber) !== Number(stepNumber)) return;
    if (savedProject?.projectTitle) return;

    generateProjectForSelectedStep();
  }, [launchRequest, stepNumber, savedProject?.projectTitle]);

  const handleReviewProject = async () => {
    if (!project || isReviewingProject) return;

    const safeLink = String(submissionLink || '').trim();
    const safeNotes = String(submissionNotes || '').trim();

    if (!safeLink && !safeNotes) {
      setProjectError('Add a public link or a short summary before asking for AI feedback.');
      return;
    }

    setIsReviewingProject(true);
    setProjectError('');
    setProjectNotice('');

    try {
      const response = await fetchApi('/api/user/phase-project/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userData?.name,
          targetRole: userData?.targetJob,
          project,
          submissionLink: safeLink,
          submissionNotes: safeNotes,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Project review failed.');
      }

      const reviewedAt = new Date().toLocaleDateString();
      const nextProject = {
        ...project,
        submissionLink: safeLink,
        submissionNotes: safeNotes,
        feedbackScore: Math.max(0, Number(data?.review?.score) || 0),
        feedbackSummary: String(data?.review?.summary || '').trim(),
        strengths: normalizeStringList(data?.review?.strengths),
        improvements: normalizeStringList(data?.review?.improvements),
        resumeBullet: String(data?.review?.resumeBullet || project.portfolioBullet || '').trim(),
        reviewedAt,
        reviewSource: String(data?.source || '').trim(),
      };

      setProject(nextProject);
      persistProject(nextProject);
      setReviewResult(buildProjectReviewResult(nextProject));
      setProjectNotice(String(data?.warning || '').trim());
    } catch (error) {
      console.error(error);
      setProjectError(String(error?.message || 'Project review failed.'));
    } finally {
      setIsReviewingProject(false);
    }
  };

  if (!selectedStep) {
    return null;
  }

  return (
    <section className="phase-project-panel glass-effect">
      <div className="phase-project-header">
        <div>
          <span className="phase-project-kicker">Proof of Skill</span>
          <h3>{selectedStep.title}</h3>
          <p>Turn this phase into a portfolio-ready micro-project that you can submit, review, and reuse in your resume.</p>
        </div>

        <div className="phase-project-summary">
          <div className="phase-project-summary-item">
            <span>Project</span>
            <strong>{project ? 'Ready' : 'Pending'}</strong>
          </div>
          <div className="phase-project-summary-item">
            <span>Feedback</span>
            <strong>{project?.feedbackScore ? `${project.feedbackScore}/100` : 'Not scored'}</strong>
          </div>
          <div className={`phase-project-status-pill ${project?.feedbackScore ? 'reviewed' : project ? 'active' : 'pending'}`}>
            {project?.feedbackScore ? 'Reviewed' : project ? 'In Progress' : 'Generate Brief'}
          </div>
        </div>
      </div>

      <div className="phase-project-actions">
        <button
          type="button"
          className="phase-project-primary"
          onClick={generateProjectForSelectedStep}
          disabled={isGeneratingProject}
        >
          {isGeneratingProject ? <Loader2 size={16} className="spin" /> : <Wand2 size={16} />}
          <span>{project ? 'Regenerate Project' : 'Generate AI Project'}</span>
        </button>

        {project ? (
          <button
            type="button"
            className="phase-project-secondary"
            onClick={() => {
              setSubmissionLink(project.submissionLink || '');
              setSubmissionNotes(project.submissionNotes || '');
              setReviewResult(buildProjectReviewResult(project));
              setProjectError('');
              setProjectNotice('');
            }}
          >
            <RefreshCw size={16} />
            <span>Reload Saved Project</span>
          </button>
        ) : null}
      </div>

      {projectNotice ? <p className="phase-project-notice">{projectNotice}</p> : null}
      {projectError ? <p className="phase-project-error">{projectError}</p> : null}

      {project ? (
        <>
          <div className="phase-project-card">
            <div className="phase-project-card-top">
              <div>
                <div className="phase-project-title-row">
                  <FolderKanban size={18} />
                  <h4>{project.projectTitle}</h4>
                </div>
                <p>{project.brief}</p>
              </div>

              <div className="phase-project-deliverable">{project.deliverableType}</div>
            </div>

            <div className="phase-project-grid">
              <div className="phase-project-block">
                <span>Objective</span>
                <strong>{project.objective}</strong>
              </div>
              <div className="phase-project-block">
                <span>Resume Bullet Draft</span>
                <strong>{project.portfolioBullet}</strong>
              </div>
            </div>

            <div className="phase-project-detail-grid">
              <div className="phase-project-detail-card">
                <div className="phase-project-detail-title">Requirements</div>
                <ul className="phase-project-list">
                  {project.requirements.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="phase-project-detail-card">
                <div className="phase-project-detail-title">Submission Tips</div>
                <ul className="phase-project-list">
                  {project.submissionTips.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="phase-project-detail-card">
                <div className="phase-project-detail-title">AI Evaluation Focus</div>
                <ul className="phase-project-list">
                  {project.evaluationFocus.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="phase-project-submit">
            <div className="phase-project-submit-top">
              <div>
                <h4>Submit Your Work</h4>
                <p>Paste a public link or describe your output. The AI will review it and generate a feedback score.</p>
              </div>
              {project.submissionLink ? (
                <a
                  className="phase-project-link"
                  href={project.submissionLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={16} />
                  <span>Open Current Link</span>
                </a>
              ) : null}
            </div>

            <div className="phase-project-form">
              <label className="phase-project-field">
                <span>Public project link</span>
                <input
                  type="url"
                  value={submissionLink}
                  onChange={(event) => setSubmissionLink(event.target.value)}
                  placeholder="https://figma.com, https://github.com, https://drive.google.com..."
                />
              </label>

              <label className="phase-project-field">
                <span>Short summary for AI review</span>
                <textarea
                  rows="4"
                  value={submissionNotes}
                  onChange={(event) => setSubmissionNotes(event.target.value)}
                  placeholder="Explain what you built, key choices, and expected business/user impact..."
                />
              </label>
            </div>

            <div className="phase-project-submit-actions">
              <button
                type="button"
                className="phase-project-primary submit"
                onClick={handleReviewProject}
                disabled={isReviewingProject}
              >
                {isReviewingProject ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                <span>{isReviewingProject ? 'Scoring Project...' : 'Get AI Feedback Score'}</span>
              </button>
            </div>
          </div>
        </>
      ) : null}

      {reviewResult ? (
        <div className="phase-project-review">
          <div className="phase-project-review-top">
            <div className="phase-project-review-badge">
              <CheckCircle2 size={18} />
              <span>{reviewResult.score}/100</span>
            </div>
            <div>
              <h4>AI Feedback Score</h4>
              <p>{reviewResult.summary}</p>
            </div>
          </div>

          <div className="phase-project-review-grid">
            <div className="phase-project-review-card">
              <div className="phase-project-detail-title">Strengths</div>
              <ul className="phase-project-list compact">
                {reviewResult.strengths.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="phase-project-review-card">
              <div className="phase-project-detail-title">Improve Next</div>
              <ul className="phase-project-list compact">
                {reviewResult.improvements.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="phase-project-resume">
            <ClipboardCheck size={18} />
            <div>
              <span>Auto-added resume bullet</span>
              <strong>{reviewResult.resumeBullet}</strong>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
