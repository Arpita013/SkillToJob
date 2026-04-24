import { useMemo } from 'react';

function normalizeSkill(skill) {
  return String(skill || '').trim().toLowerCase();
}

function getRequiredSkills(targetJob) {
  const target = String(targetJob || '').toLowerCase();

  const templates = [
    {
      match: ['frontend', 'front end', 'react', 'ui developer', 'web developer'],
      skills: [
        'HTML',
        'CSS',
        'JavaScript',
        'React',
        'TypeScript',
        'Git',
        'REST APIs',
        'Responsive Design',
      ],
    },
    {
      match: ['backend', 'back end', 'api developer', 'node', 'java', 'python'],
      skills: [
        'API Design',
        'Databases',
        'SQL',
        'Authentication',
        'Caching',
        'Git',
        'Testing',
        'System Design',
      ],
    },
    {
      match: ['full stack', 'fullstack'],
      skills: [
        'JavaScript',
        'React',
        'Node.js',
        'SQL',
        'REST APIs',
        'Git',
        'Testing',
        'Deployment',
      ],
    },
    {
      match: ['data analyst', 'business analyst', 'analytics'],
      skills: [
        'SQL',
        'Excel',
        'Data Visualization',
        'Statistics',
        'Python',
        'Data Cleaning',
        'Communication',
        'Dashboarding',
      ],
    },
    {
      match: ['data scientist', 'ml', 'machine learning'],
      skills: [
        'Python',
        'Statistics',
        'Machine Learning',
        'Data Cleaning',
        'SQL',
        'Model Evaluation',
        'Communication',
        'Experimentation',
      ],
    },
    {
      match: ['devops', 'sre', 'site reliability'],
      skills: [
        'Linux',
        'Docker',
        'CI/CD',
        'Cloud',
        'Monitoring',
        'Networking',
        'Git',
        'Security Basics',
      ],
    },
  ];

  const found = templates.find((t) => t.match.some((m) => target.includes(m)));
  return (
    found?.skills ?? [
      'Communication',
      'Problem Solving',
      'Git',
      'JavaScript',
      'SQL',
      'Testing',
      'System Design',
    ]
  );
}

export default function SkillGapAnalysis({ currentSkills, targetJob, onLearnNow }) {
  const requiredSkills = useMemo(() => getRequiredSkills(targetJob), [targetJob]);

  const currentSet = useMemo(() => {
    const values = Array.isArray(currentSkills) ? currentSkills : [];
    return new Set(values.map(normalizeSkill).filter(Boolean));
  }, [currentSkills]);

  const comparison = useMemo(() => {
    return requiredSkills.map((skill) => ({
      name: skill,
      has: currentSet.has(normalizeSkill(skill)),
    }));
  }, [requiredSkills, currentSet]);

  const haveCount = useMemo(
    () => comparison.reduce((acc, s) => acc + (s.has ? 1 : 0), 0),
    [comparison],
  );

  return (
    <section className="skill-gap-card glass-effect">
      <div className="skill-gap-header">
        <div>
          <h3>Compact Skill Match</h3>
          <p>
            You have <span className="skill-gap-count">{haveCount}</span> / {requiredSkills.length}{' '}
            required skills for <span className="skill-gap-role">{targetJob || 'your target role'}</span>
          </p>
        </div>
        <div className="skill-gap-pill" aria-label="Skill gap status">
          <span className="pill-dot" />
          <span>
            {requiredSkills.length - haveCount === 0 ? 'Ready' : `${requiredSkills.length - haveCount} gaps`}
          </span>
        </div>
      </div>

      <div className="skill-gap-content">
        <div className="current-skills-panel" aria-label="Current skills">
          <div className="panel-header">
            <span className="panel-title">Current Skills</span>
            <span className="panel-subtitle">{Array.isArray(currentSkills) ? currentSkills.length : 0}</span>
          </div>
          <div className="current-skill-badges">
            {Array.isArray(currentSkills) && currentSkills.length ? (
              currentSkills.map((s, idx) => (
                <span key={`${s}-${idx}`} className="current-skill-badge">
                  {s}
                </span>
              ))
            ) : (
              <p className="skill-gap-hint">No skills added yet. Add skills in onboarding for better matching.</p>
            )}
          </div>
        </div>

        <div className="target-skills-panel" aria-label="Target job skills match list">
          <div className="panel-header">
            <span className="panel-title">Target Job Skills</span>
            <span className="panel-subtitle">{requiredSkills.length}</span>
          </div>

          <div className="target-skill-list">
            {comparison.map((s) => (
              <div key={s.name} className={`target-skill-row ${s.has ? 'matched' : 'gap'}`}>
                <div className="target-skill-top">
                  <span className="target-skill-name">{s.name}</span>
                  {s.has ? (
                    <span className="target-skill-state matched">Matched</span>
                  ) : (
                    <button
                      type="button"
                      className="learn-now-btn"
                      onClick={() => onLearnNow?.(s.name)}
                    >
                      Learn Now
                    </button>
                  )}
                </div>
                <div
                  className={`target-skill-bar ${s.has ? 'matched' : 'gap'}`}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={s.has ? 100 : 0}
                >
                  <div className="target-skill-fill" style={{ width: s.has ? '100%' : '0%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
