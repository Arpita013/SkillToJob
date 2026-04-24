import { useState } from 'react';
import { fetchApi } from '../utils/apiClient.js';
import {
  ArrowRight,
  BriefcaseBusiness,
  GraduationCap,
  Sparkles,
  UserRound,
} from 'lucide-react';

export default function Onboarding({ onComplete, accountEmail = '' }) {
  const [formData, setFormData] = useState({
    name: '',
    skills: '',
    education: '',
    targetJob: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.education.trim() || !formData.targetJob.trim()) {
      setError('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetchApi('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          education: formData.education.trim(),
          targetJob: formData.targetJob.trim(),
          skills: formData.skills
            .split(',')
            .map((skill) => skill.trim())
            .filter(Boolean),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || 'Failed to process onboarding');
        setLoading(false);
        return;
      }

      const userData = {
        ...formData,
        accountEmail: String(accountEmail || '').trim().toLowerCase(),
        skills: formData.skills
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean),
        roadmap: data.roadmap || [],
        jobMatches: data.jobMatches || [],
        phaseProgress: [],
        badges: [],
        phaseProjects: [],
        currentStepIndex: 0,
      };

      onComplete(userData);
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-glow"></div>

      <form onSubmit={handleSubmit} className="onboarding-card glass-morphism">
        <div className="onboarding-header">
          <h1>Welcome to SkillToJob</h1>
          <p>Tell us a little about yourself so we can build the right roadmap.</p>
        </div>

        <div className="form-fields">
          <div className="form-group">
            <label htmlFor="name">
              <UserRound size={15} />
              <span>Full Name</span>
            </label>
            <input
              id="name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Name"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="education">
              <GraduationCap size={15} />
              <span>Education</span>
            </label>
            <input
              id="education"
              type="text"
              name="education"
              value={formData.education}
              onChange={handleChange}
              placeholder="Course / Program"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="skills">
              <Sparkles size={15} />
              <span>Skills</span>
            </label>
            <textarea
              id="skills"
              name="skills"
              value={formData.skills}
              onChange={handleChange}
              placeholder="Communication, Excel, business analysis"
              className="form-input form-textarea"
              rows="2"
            />
          </div>

          <div className="form-group">
            <label htmlFor="targetJob">
              <BriefcaseBusiness size={15} />
              <span>Target Job Role</span>
            </label>
            <input
              id="targetJob"
              type="text"
              name="targetJob"
              value={formData.targetJob}
              onChange={handleChange}
              placeholder="Software Developer"
              className="form-input"
            />
          </div>
        </div>

        {error ? <div className="form-error">{error}</div> : null}

        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner"></span>
              Generating...
            </>
          ) : (
            <>
              Generate Roadmap
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
