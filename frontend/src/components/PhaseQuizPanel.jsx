import { useEffect, useMemo, useState } from 'react';
import { fetchApi } from '../utils/apiClient.js';
import {
  BookOpen,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  XCircle,
} from 'lucide-react';

function normalizePhaseProgress(progress) {
  if (!Array.isArray(progress)) return [];

  return progress
    .map((entry) => ({
      step: Number(entry?.step) || 0,
      title: String(entry?.title || '').trim(),
      attempts: Math.max(0, Number(entry?.attempts) || 0),
      latestScore: Math.max(0, Number(entry?.latestScore) || 0),
      bestScore: Math.max(0, Number(entry?.bestScore) || 0),
      completed: Boolean(entry?.completed),
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
      phaseTitle: String(badge?.phaseTitle || '').trim(),
      badgeTitle: String(badge?.badgeTitle || '').trim(),
      message: String(badge?.message || '').trim(),
      nextSkill: String(badge?.nextSkill || '').trim(),
      earnedAt: String(badge?.earnedAt || '').trim(),
    }))
    .filter((badge) => badge.phaseStep > 0);
}

function getStepNumber(step, index) {
  return Number(step?.step) || index + 1;
}

function deriveCurrentStepIndex(roadmap, progress) {
  if (!Array.isArray(roadmap) || !roadmap.length) return 0;

  const completedSet = new Set(
    normalizePhaseProgress(progress)
      .filter((entry) => entry.completed)
      .map((entry) => entry.step),
  );

  const firstIncompleteIndex = roadmap.findIndex((step, index) => !completedSet.has(getStepNumber(step, index)));
  return firstIncompleteIndex === -1 ? Math.max(roadmap.length - 1, 0) : firstIncompleteIndex;
}

function buildBadgeRecord({ stepNumber, stepTitle, badge, earnedAt }) {
  return {
    id: `badge-${stepNumber}`,
    phaseStep: stepNumber,
    phaseTitle: stepTitle,
    badgeTitle: String(badge?.badgeTitle || '').trim(),
    message: String(badge?.message || '').trim(),
    nextSkill: String(badge?.nextSkill || '').trim(),
    earnedAt,
  };
}

function mergePhaseProgress(progress, nextEntry) {
  const normalized = normalizePhaseProgress(progress).filter((entry) => entry.step !== nextEntry.step);
  return [...normalized, nextEntry].sort((a, b) => a.step - b.step);
}

function mergeBadges(badges, nextBadge) {
  const normalized = normalizeBadges(badges).filter((badge) => badge.phaseStep !== nextBadge.phaseStep);
  return [...normalized, nextBadge].sort((a, b) => a.phaseStep - b.phaseStep);
}

function ConfettiBurst({ active }) {
  if (!active) return null;

  return (
    <div className="quiz-confetti" aria-hidden="true">
      {Array.from({ length: 18 }).map((_, index) => (
        <span
          key={index}
          className="quiz-confetti-piece"
          style={{
            '--confetti-left': `${5 + index * 5}%`,
            '--confetti-delay': `${(index % 6) * 0.08}s`,
            '--confetti-duration': `${1.3 + (index % 4) * 0.18}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function PhaseQuizPanel({
  userData,
  roadmap,
  selectedStepNumber,
  onSelectStep,
  onUpdateUserData,
  launchRequest,
}) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [quizError, setQuizError] = useState('');
  const [quizNotice, setQuizNotice] = useState('');
  const [quizResult, setQuizResult] = useState(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isReviewingQuiz, setIsReviewingQuiz] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const normalizedRoadmap = Array.isArray(roadmap) ? roadmap : [];
  const phaseProgress = useMemo(() => normalizePhaseProgress(userData?.phaseProgress), [userData?.phaseProgress]);
  const progressMap = useMemo(() => new Map(phaseProgress.map((entry) => [entry.step, entry])), [phaseProgress]);

  const selectedStepIndex = useMemo(() => {
    const index = normalizedRoadmap.findIndex((step, idx) => getStepNumber(step, idx) === Number(selectedStepNumber));
    return index >= 0 ? index : deriveCurrentStepIndex(normalizedRoadmap, phaseProgress);
  }, [normalizedRoadmap, phaseProgress, selectedStepNumber]);

  const selectedStep = normalizedRoadmap[selectedStepIndex] || null;
  const stepNumber = selectedStep ? getStepNumber(selectedStep, selectedStepIndex) : 0;
  const nextStepTitle = normalizedRoadmap[selectedStepIndex + 1]?.title || '';
  const currentProgress = progressMap.get(stepNumber) || null;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = questions.length > 0 && questions.every((question) => Number.isInteger(answers[question.id]));

  const generateQuizForSelectedStep = async ({ preserveResult = false } = {}) => {
    if (!selectedStep || isGeneratingQuiz) return;

    setIsGeneratingQuiz(true);
    setQuizError('');
    setQuizNotice('');
    if (!preserveResult) {
      setQuizResult(null);
    }
    setQuestions([]);
    setAnswers({});

    try {
      const response = await fetchApi('/api/user/phase-quiz', {
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
        throw new Error(data?.message || 'Could not generate the quiz right now.');
      }

      const nextQuestions = Array.isArray(data?.questions) ? data.questions : [];
      if (!nextQuestions.length) {
        throw new Error('Quiz questions were not generated.');
      }

      setQuestions(nextQuestions);
      setQuizNotice(String(data?.warning || '').trim());
    } catch (error) {
      console.error(error);
      setQuizError(String(error?.message || 'Quiz generation failed.'));
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  useEffect(() => {
    setQuestions([]);
    setAnswers({});
    setQuizError('');
    setQuizNotice('');
    setQuizResult(null);
  }, [stepNumber]);

  useEffect(() => {
    if (!showConfetti) return undefined;
    const timeout = window.setTimeout(() => setShowConfetti(false), 2200);
    return () => window.clearTimeout(timeout);
  }, [showConfetti]);

  useEffect(() => {
    if (!launchRequest?.nonce) return;
    if (Number(launchRequest?.stepNumber) !== Number(stepNumber)) return;

    generateQuizForSelectedStep();
  }, [launchRequest, stepNumber]);

  const handleGenerateQuiz = async () => {
    await generateQuizForSelectedStep();
  };

  const handleAnswerSelect = (questionId, optionIndex) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!selectedStep || !questions.length || !allAnswered || isReviewingQuiz) return;

    setIsReviewingQuiz(true);
    setQuizError('');

    const reviewItems = questions.map((question) => {
      const selectedIndex = Number(answers[question.id]);
      const isCorrect = selectedIndex === question.correctOptionIndex;

      return {
        id: question.id,
        question: question.question,
        difficulty: question.difficulty,
        selectedIndex,
        selectedOption: question.options[selectedIndex] || '',
        correctOption: question.options[question.correctOptionIndex] || '',
        rationale: question.rationale,
        isCorrect,
      };
    });

    const score = reviewItems.filter((item) => item.isCorrect).length;
    const wrongAnswers = reviewItems
      .filter((item) => !item.isCorrect)
      .map((item) => ({
        question: item.question,
        selectedOption: item.selectedOption,
        correctOption: item.correctOption,
        rationale: item.rationale,
      }));

    try {
      const response = await fetchApi('/api/user/phase-quiz/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userData?.name,
          phaseTitle: selectedStep.title,
          score,
          targetRole: userData?.targetJob,
          nextPhaseTitle: nextStepTitle,
          wrongAnswers,
          roadmapResources: Array.isArray(selectedStep.resources) ? selectedStep.resources : [],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Quiz review failed.');
      }

      const passed = Boolean(data?.passed);
      const earnedAt = new Date().toLocaleDateString();
      const nextProgressEntry = {
        step: stepNumber,
        title: selectedStep.title,
        attempts: (currentProgress?.attempts || 0) + 1,
        latestScore: score,
        bestScore: Math.max(currentProgress?.bestScore || 0, score),
        completed: passed || Boolean(currentProgress?.completed),
        completedAt: passed ? currentProgress?.completedAt || earnedAt : currentProgress?.completedAt || '',
        badgeTitle: passed ? String(data?.badge?.badgeTitle || currentProgress?.badgeTitle || '').trim() : String(currentProgress?.badgeTitle || '').trim(),
        badgeMessage: passed ? String(data?.badge?.message || currentProgress?.badgeMessage || '').trim() : String(currentProgress?.badgeMessage || '').trim(),
        nextSkill: passed ? String(data?.badge?.nextSkill || currentProgress?.nextSkill || '').trim() : String(currentProgress?.nextSkill || '').trim(),
      };

      const updatedPhaseProgress = mergePhaseProgress(userData?.phaseProgress, nextProgressEntry);
      let updatedBadges = normalizeBadges(userData?.badges);

      if (passed) {
        updatedBadges = mergeBadges(updatedBadges, buildBadgeRecord({
          stepNumber,
          stepTitle: selectedStep.title,
          badge: data?.badge,
          earnedAt,
        }));
      }

      onUpdateUserData?.({
        ...userData,
        phaseProgress: updatedPhaseProgress,
        badges: updatedBadges,
        currentStepIndex: deriveCurrentStepIndex(normalizedRoadmap, updatedPhaseProgress),
      });

      setQuizNotice(String(data?.warning || '').trim());
      setQuizResult({
        passed,
        score,
        total: questions.length,
        badge: data?.badge || null,
        feedback: data?.feedback || null,
        reviewItems,
      });

      if (passed) {
        setShowConfetti(true);
      }
    } catch (error) {
      console.error(error);
      setQuizError(String(error?.message || 'Quiz review failed.'));
    } finally {
      setIsReviewingQuiz(false);
    }
  };

  const jumpToNextPhase = () => {
    const nextStep = normalizedRoadmap[selectedStepIndex + 1];
    if (!nextStep) return;
    onSelectStep?.(getStepNumber(nextStep, selectedStepIndex + 1));
  };

  if (!selectedStep) {
    return null;
  }

  return (
    <section className="phase-quiz-panel glass-effect">
      <ConfettiBurst active={showConfetti} />

      <div className="phase-quiz-header">
        <div>
          <span className="phase-quiz-kicker">Phase Quiz</span>
          <h3>{selectedStep.title}</h3>
          <p>{selectedStep.description}</p>
        </div>

        <div className="phase-quiz-summary">
          <div className="phase-quiz-summary-item">
            <span>Attempts</span>
            <strong>{currentProgress?.attempts || 0}</strong>
          </div>
          <div className="phase-quiz-summary-item">
            <span>Best Score</span>
            <strong>{currentProgress?.bestScore || 0}/5</strong>
          </div>
          <div className={`phase-quiz-status-pill ${currentProgress?.completed ? 'passed' : 'pending'}`}>
            {currentProgress?.completed ? 'Badge Unlocked' : 'Quiz Pending'}
          </div>
        </div>
      </div>

      <div className="phase-quiz-actions">
        <button
          type="button"
          className="phase-quiz-primary"
          onClick={handleGenerateQuiz}
          disabled={isGeneratingQuiz}
        >
          {isGeneratingQuiz ? <Loader2 size={16} className="spin" /> : <Target size={16} />}
          <span>{questions.length ? 'Regenerate Quiz' : 'Start Phase Quiz'}</span>
        </button>

        {questions.length ? (
          <button
            type="button"
            className="phase-quiz-secondary"
            onClick={() => {
              setQuestions([]);
              setAnswers({});
              setQuizResult(null);
              setQuizError('');
              setQuizNotice('');
            }}
          >
            <RefreshCw size={16} />
            <span>Reset Quiz</span>
          </button>
        ) : null}
      </div>

      {quizNotice ? <p className="phase-quiz-notice">{quizNotice}</p> : null}
      {quizError ? <p className="phase-quiz-error">{quizError}</p> : null}

      {questions.length ? (
        <>
          <div className="phase-quiz-progress">
            <span>{answeredCount}/{questions.length} answered</span>
            <div className="phase-quiz-progress-bar">
              <div
                className="phase-quiz-progress-fill"
                style={{ width: `${(answeredCount / questions.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="phase-quiz-question-list">
            {questions.map((question, index) => {
              const selectedIndex = answers[question.id];
              const reviewItem = quizResult?.reviewItems?.find((item) => item.id === question.id);

              return (
                <article key={question.id} className="phase-question-card">
                  <div className="phase-question-top">
                    <span className="phase-question-number">Q{index + 1}</span>
                    <span className={`phase-question-difficulty ${question.difficulty.toLowerCase()}`}>
                      {question.difficulty}
                    </span>
                  </div>

                  <h4>{question.question}</h4>

                  <div className="phase-question-options">
                    {question.options.map((option, optionIndex) => {
                      const isSelected = selectedIndex === optionIndex;
                      const isCorrectAfterReview = Boolean(quizResult) && optionIndex === question.correctOptionIndex;
                      const isWrongSelection = Boolean(quizResult) && isSelected && optionIndex !== question.correctOptionIndex;

                      return (
                        <button
                          key={`${question.id}-${optionIndex}`}
                          type="button"
                          className={`phase-option-btn ${isSelected ? 'selected' : ''} ${isCorrectAfterReview ? 'correct' : ''} ${isWrongSelection ? 'wrong' : ''}`}
                          onClick={() => handleAnswerSelect(question.id, optionIndex)}
                          disabled={Boolean(quizResult)}
                        >
                          <span className="phase-option-letter">{String.fromCharCode(65 + optionIndex)}</span>
                          <span>{option}</span>
                        </button>
                      );
                    })}
                  </div>

                  {reviewItem ? (
                    <div className={`phase-question-review ${reviewItem.isCorrect ? 'success' : 'danger'}`}>
                      <div className="phase-question-review-top">
                        {reviewItem.isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        <strong>{reviewItem.isCorrect ? 'Correct answer' : 'Needs revision'}</strong>
                      </div>
                      <p>{question.rationale}</p>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          {!quizResult ? (
            <div className="phase-quiz-submit-row">
              <button
                type="button"
                className="phase-quiz-primary submit"
                onClick={handleSubmitQuiz}
                disabled={!allAnswered || isReviewingQuiz}
              >
                {isReviewingQuiz ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                <span>{isReviewingQuiz ? 'Checking Answers...' : 'Submit Quiz'}</span>
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {quizResult ? (
        <div className={`phase-quiz-result ${quizResult.passed ? 'passed' : 'failed'}`}>
          {quizResult.passed ? (
            <>
              <div className="phase-quiz-result-top">
                <Trophy size={20} />
                <div>
                  <h4>
                    Passed with {quizResult.score}/{quizResult.total}
                  </h4>
                  <p>{quizResult.badge?.badgeTitle || 'New badge unlocked'}</p>
                </div>
              </div>
              <p className="phase-quiz-result-message">{quizResult.badge?.message}</p>
              <div className="phase-quiz-result-footer">
                <span className="phase-next-skill">
                  Next skill: {quizResult.badge?.nextSkill || nextStepTitle || 'Continue with the next phase'}
                </span>
                {nextStepTitle ? (
                  <button type="button" className="phase-quiz-secondary" onClick={jumpToNextPhase}>
                    <BookOpen size={16} />
                    <span>Go To Next Phase</span>
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <div className="phase-quiz-result-top">
                <BookOpen size={20} />
                <div>
                  <h4>
                    Score {quizResult.score}/{quizResult.total} - Retry Needed
                  </h4>
                  <p>You need 4/5 to unlock this badge.</p>
                </div>
              </div>
              <p className="phase-quiz-result-message">{quizResult.feedback?.summary}</p>

              {Array.isArray(quizResult.feedback?.conceptGaps) && quizResult.feedback.conceptGaps.length ? (
                <div className="phase-gap-list">
                  {quizResult.feedback.conceptGaps.map((item, index) => (
                    <div key={`${item.question}-${index}`} className="phase-gap-card">
                      <strong>{item.question}</strong>
                      <p>{item.explanation}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {quizResult.feedback?.quickRead?.url ? (
                <a
                  className="phase-quick-read"
                  href={quizResult.feedback.quickRead.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>{quizResult.feedback.quickRead.name}</span>
                  <strong>{quizResult.feedback.quickRead.title}</strong>
                </a>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
