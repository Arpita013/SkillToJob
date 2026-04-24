import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchApi } from '../utils/apiClient.js';
import {
  BarChart3,
  Bot,
  FileText,
  Mic,
  Send,
  Sparkles,
  X,
} from 'lucide-react';

function loadStoredUserData() {
  try {
    const stored = localStorage.getItem('userData');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function buildUserContext(userData) {
  if (!userData) return '';

  const name = String(userData?.name || '').trim();
  const education = String(userData?.education || '').trim();
  const targetJob = String(userData?.targetJob || '').trim();
  const skills = Array.isArray(userData?.skills) ? userData.skills : [];

  const roadmap = Array.isArray(userData?.roadmap) ? userData.roadmap : [];
  const roadmapSummary = roadmap
    .slice(0, 6)
    .map((s, i) => {
      if (typeof s === 'string') return `${i + 1}. ${s}`;
      return `${Number(s?.step) || i + 1}. ${String(s?.title || '').trim()} — ${String(s?.description || '').trim()}`;
    })
    .filter(Boolean)
    .join('\n');

  return [
    name ? `Name: ${name}` : '',
    education ? `Education: ${education}` : '',
    targetJob ? `Target Job: ${targetJob}` : '',
    `Current Skills: ${skills.length ? skills.join(', ') : 'None'}`,
    roadmapSummary ? `Roadmap:\n${roadmapSummary}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function toApiMessages(messages) {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

export default function AIMentor({ userData: userDataProp }) {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('menu'); // menu | chat
  const [activeMode, setActiveMode] = useState('general'); // general | interview | resume
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [hasBootstrapped, setHasBootstrapped] = useState(false);

  const inputRef = useRef(null);
  const endRef = useRef(null);

  const effectiveUserData = useMemo(() => {
    return userDataProp || loadStoredUserData();
  }, [userDataProp]);

  const context = useMemo(
    () => buildUserContext(effectiveUserData),
    [effectiveUserData],
  );

  const apiMode =
    activeMode === 'interview'
      ? 'interviewer'
      : activeMode === 'resume'
        ? 'resume'
        : 'general';

  useEffect(() => {
    if (!isOpen) return;
    if (view !== 'chat') return;
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [isOpen, view]);

  useEffect(() => {
    if (!isOpen) return;
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [isOpen, messages, view]);

  const sendToMentor = async (nextMessages, nextApiMode = apiMode) => {
    setIsSending(true);
    try {
      const response = await fetchApi('/api/user/mentor-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: nextApiMode,
          context,
          messages: toApiMessages(nextMessages).slice(-12),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Mentor request failed');

      const reply = String(data?.reply || '').trim();
      if (!reply) throw new Error('Empty mentor reply');

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I could not respond right now. Please try again.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const startGeneralChat = async () => {
    setActiveMode('general');
    setView('chat');
    window.setTimeout(() => inputRef.current?.focus(), 0);

    if (hasBootstrapped) return;
    setHasBootstrapped(true);
    await sendToMentor([], 'general');
  };

  const startInterview = () => {
    const role = String(effectiveUserData?.targetJob || 'Software Developer').trim() || 'Software Developer';
    setActiveMode('interview');
    setView('chat');
    setMessages([
      {
        role: 'assistant',
        content: `Hi! I am your Technical Interviewer today. I see you're interested in a ${role} role. Should we start with some React basics or jump into System Design?`,
      },
    ]);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const startResume = () => {
    setActiveMode('resume');
    setView('chat');
    setMessages([
      {
        role: 'assistant',
        content:
          "Great — share your resume (or paste your key sections). I'll suggest improvements step-by-step.",
      },
    ]);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isSending) return;

    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    await sendToMentor(nextMessages, apiMode);
  };

  const resetToMenu = () => {
    setView('menu');
  };

  return (
    <>
      <button
        className="ai-mentor-fab"
        onClick={() => setIsOpen((v) => !v)}
        title="Open AI Mentor"
        aria-label="AI Mentor"
      >
        <span className="mentor-icon" aria-hidden="true">
          <Bot size={22} />
        </span>
      </button>

      <div className={`ai-mentor-drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3>AI Mentor</h3>
          <button
            className="close-drawer"
            onClick={() => setIsOpen(false)}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="drawer-content">
          {view === 'menu' ? (
            <div className="mentor-menu">
              <p className="mentor-intro">
                Hi! I'm your AI career coach. Pick a mode to get started:
              </p>

              <ul className="mentor-options">
                <li>
                  <button type="button" className="mentor-option-btn" onClick={startResume}>
                    <span className="option-icon" aria-hidden="true">
                      <FileText size={18} />
                    </span>
                    <span>Resume Tips & Optimization</span>
                  </button>
                </li>
                <li>
                  <button type="button" className="mentor-option-btn" onClick={startInterview}>
                    <span className="option-icon" aria-hidden="true">
                      <Mic size={18} />
                    </span>
                    <span>Interview Preparation</span>
                  </button>
                </li>
                <li>
                  <button type="button" className="mentor-option-btn" onClick={startGeneralChat}>
                    <span className="option-icon" aria-hidden="true">
                      <Sparkles size={18} />
                    </span>
                    <span>Skill Recommendations</span>
                  </button>
                </li>
                <li>
                  <button type="button" className="mentor-option-btn" onClick={startGeneralChat}>
                    <span className="option-icon" aria-hidden="true">
                      <BarChart3 size={18} />
                    </span>
                    <span>Career Growth Insights</span>
                  </button>
                </li>
              </ul>

              <button className="chat-button mentor-start" onClick={startGeneralChat}>
                <span className="start-icon" aria-hidden="true">
                  <Sparkles size={18} />
                </span>
                <span>Start Chatting</span>
              </button>
            </div>
          ) : (
            <div className="mentor-chat">
              <div className="mentor-chat-meta">
                <span className="mentor-mode">
                  {activeMode === 'interview'
                    ? 'Interview Prep'
                    : activeMode === 'resume'
                      ? 'Resume Review'
                      : 'Chat'}
                </span>
                <button className="mentor-back" type="button" onClick={resetToMenu}>
                  Back
                </button>
              </div>

              <div className="mentor-messages" aria-label="AI Mentor messages">
                {messages.length === 0 ? (
                  <div className="mentor-empty">
                    {isSending ? 'Starting...' : 'Say hi to begin.'}
                  </div>
                ) : (
                  messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`mentor-bubble ${m.role === 'user' ? 'user' : 'assistant'}`}
                    >
                      {m.content}
                    </div>
                  ))
                )}
                <div ref={endRef} />
              </div>

              <div className="mentor-input-row">
                <input
                  ref={inputRef}
                  className="mentor-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your answer..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSend();
                  }}
                  disabled={isSending}
                />
                <button
                  className="mentor-send"
                  type="button"
                  onClick={handleSend}
                  disabled={isSending || !input.trim()}
                >
                  <span className="send-icon" aria-hidden="true">
                    <Send size={18} />
                  </span>
                  <span>Send</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

