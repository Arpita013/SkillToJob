import {
  Award,
  BarChart3,
  BriefcaseBusiness,
  PackageCheck,
  ShieldCheck,
  Store,
} from 'lucide-react';

const BADGE_ICONS = [Store, PackageCheck, BarChart3, BriefcaseBusiness, ShieldCheck, Award];
const BADGE_COLORS = [
  { accent: '#4f46e5', soft: 'rgba(79, 70, 229, 0.12)' },
  { accent: '#0f766e', soft: 'rgba(15, 118, 110, 0.12)' },
  { accent: '#ea580c', soft: 'rgba(234, 88, 12, 0.12)' },
  { accent: '#0284c7', soft: 'rgba(2, 132, 199, 0.12)' },
  { accent: '#7c3aed', soft: 'rgba(124, 58, 237, 0.12)' },
  { accent: '#be185d', soft: 'rgba(190, 24, 93, 0.12)' },
];

function normalizeBadges(badges) {
  if (!Array.isArray(badges)) return [];

  return badges
    .map((badge) => ({
      phaseStep: Number(badge?.phaseStep) || 0,
      badgeTitle: String(badge?.badgeTitle || '').trim(),
      message: String(badge?.message || '').trim(),
      earnedAt: String(badge?.earnedAt || '').trim(),
    }))
    .filter((badge) => badge.phaseStep > 0);
}

export default function BadgeShelf({ roadmap, badges }) {
  const normalizedRoadmap = Array.isArray(roadmap) ? roadmap : [];
  const badgeMap = new Map(normalizeBadges(badges).map((badge) => [badge.phaseStep, badge]));

  if (!normalizedRoadmap.length) {
    return null;
  }

  return (
    <section className="badge-shelf glass-effect">
      <div className="badge-shelf-header">
        <div>
          <h3>Earned Badges</h3>
          <p>Pass a phase quiz with at least 4/5 to unlock the matching badge.</p>
        </div>
        <div className="badge-shelf-count">
          {badgeMap.size}/{normalizedRoadmap.length} unlocked
        </div>
      </div>

      <div className="badge-grid">
        {normalizedRoadmap.map((step, index) => {
          const stepNumber = Number(step?.step) || index + 1;
          const badge = badgeMap.get(stepNumber);
          const Icon = BADGE_ICONS[index % BADGE_ICONS.length];
          const palette = BADGE_COLORS[index % BADGE_COLORS.length];
          const isUnlocked = Boolean(badge);

          return (
            <article
              key={stepNumber}
              className={`badge-card ${isUnlocked ? 'unlocked' : 'locked'}`}
              style={{
                '--badge-accent': palette.accent,
                '--badge-soft': palette.soft,
              }}
            >
              <div className="badge-card-top">
                <div className="badge-icon-wrap">
                  <Icon size={20} />
                </div>
                <span className="badge-phase-pill">Phase {stepNumber}</span>
              </div>

              <h4>{isUnlocked ? badge.badgeTitle || step?.title : `${String(step?.title || 'Skill Badge').trim()} Badge`}</h4>
              <p>
                {isUnlocked
                  ? badge.message || 'Badge unlocked.'
                  : 'Locked until you pass this phase quiz.'}
              </p>

              <div className="badge-card-footer">
                <span className={`badge-status ${isUnlocked ? 'active' : 'inactive'}`}>
                  {isUnlocked ? 'Unlocked' : 'Locked'}
                </span>
                {isUnlocked && badge.earnedAt ? <span className="badge-earned-date">{badge.earnedAt}</span> : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
