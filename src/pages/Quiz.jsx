import { useState, useEffect, useRef } from 'react';
import './Quiz.css';
import MathText from '../components/MathText';

export default function Quiz({ sheet, firebase, existingDocId, onFinish, onBack }) {
  const totalQ = sheet.questions.length;

  // Support resume from paused state
  const initFromPaused = () => {
    // pausedState is passed via existingDocId flow through ModeSelect
    // We store it in sessionStorage temporarily
    const raw = sessionStorage.getItem(`pause_${sheet.id}`);
    if (raw) {
      try { return JSON.parse(raw); } catch { return null; }
    }
    return null;
  };

  const paused = initFromPaused();

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState(paused?.answers || Array(totalQ).fill(null));
  const [timeLeft, setTimeLeft] = useState(paused?.timeLeft ?? (sheet.totalTime || 600));
  const [flagged, setFlagged] = useState(paused?.flagged || Array(totalQ).fill(false));
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [docId, setDocId] = useState(existingDocId || null);
  const [saving, setSaving] = useState(false);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef(null);

  // Clear session storage once loaded
  useEffect(() => {
    sessionStorage.removeItem(`pause_${sheet.id}`);
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  // ── Pause ────────────────────────────────────────────────────────────────
  const handlePause = async () => {
    clearInterval(timerRef.current);
    setSaving(true);
    const pausedState = { answers, timeLeft, flagged };
    const partialResult = buildResult(answers, Math.floor((Date.now() - startTimeRef.current) / 1000));

    if (firebase?.effectiveUid) {
      if (docId) {
        await firebase.updateAttempt(docId, sheet, partialResult, pausedState);
      } else {
        const newDocId = await firebase.saveAttempt(sheet, partialResult, pausedState);
        setDocId(newDocId);
      }
    } else {
      // Save to localStorage if not signed in (best effort)
      localStorage.setItem(`pause_${sheet.id}`, JSON.stringify(pausedState));
    }
    setSaving(false);
    onBack();
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (autoSubmit = false) => {
    clearInterval(timerRef.current);
    const timeTaken = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const result = buildResult(answers, timeTaken, autoSubmit);

    if (firebase?.effectiveUid) {
      setSaving(true);
      const isReattempt = !!(await firebase.getLastCompletedAttempt(sheet.id));
      const reattemptOf = isReattempt
        ? await firebase.getLastCompletedAttempt(sheet.id)
        : null;
      result.isReattempt = isReattempt;
      result.reattemptOf = reattemptOf;

      let savedDocId;
      if (docId) {
        await firebase.updateAttempt(docId, sheet, result, null);
        savedDocId = docId;
      } else {
        savedDocId = await firebase.saveAttempt(sheet, result, null);
      }
      setSaving(false);
      onFinish(result, savedDocId);
    } else {
      onFinish(result, null);
    }
  };

  const buildResult = (ans, timeTaken, autoSubmit = false) => {
    let correct = 0, incorrect = 0, skipped = 0;
    const details = ans.map((a, i) => {
      if (a === null) { skipped++; return { q: i, selected: null, correct: sheet.answers[i], status: 'skipped' }; }
      if (a === sheet.answers[i]) { correct++; return { q: i, selected: a, correct: sheet.answers[i], status: 'correct' }; }
      incorrect++;
      return { q: i, selected: a, correct: sheet.answers[i], status: 'incorrect' };
    });
    const marks = correct * (sheet.marksPerQuestion || 4);
    const total = totalQ * (sheet.marksPerQuestion || 4);
    return { correct, incorrect, skipped, marks, total, details, timeTaken, totalQ, autoSubmit, mode: 'quiz' };
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  const timePercent = (timeLeft / (sheet.totalTime || 600)) * 100;
  const timerColor = timeLeft < 60 ? 'var(--red)' : timeLeft < 180 ? 'var(--yellow)' : 'var(--accent)';
  const attempted = answers.filter(a => a !== null).length;
  const q = sheet.questions[current];

  return (
    <div className="quiz-page">
      {saving && <div className="saving-overlay">💾 Saving...</div>}

      {/* Top Bar */}
      <div className="quiz-topbar">
        <button className="btn btn-ghost btn-sm" onClick={() => setShowPauseConfirm(true)}>⏸ Pause</button>

        <div className="quiz-timer" style={{ color: timerColor }}>
          <span className="timer-icon">⏱</span>
          <span className="timer-val">{formatTime(timeLeft)}</span>
          <div className="timer-bar-track">
            <div className="timer-bar-fill" style={{ width: `${timePercent}%`, background: timerColor }} />
          </div>
        </div>

        <div className="quiz-progress-info">
          <span>{attempted}/{totalQ} attempted</span>
        </div>
      </div>

      <div className="quiz-body">
        {/* Question Panel */}
        <div className="quiz-main">
          <div className="q-header">
            <span className="q-num">Q{current + 1} / {totalQ}</span>
            <button
              className={`flag-btn ${flagged[current] ? 'flagged' : ''}`}
              onClick={() => { const f = [...flagged]; f[current] = !f[current]; setFlagged(f); }}
            >
              {flagged[current] ? '🚩 Flagged' : '⚑ Flag'}
            </button>
          </div>

          <div className="q-text fade-in" key={current}>
            {sheet.imagePaths?.[current] && (
              <img className="q-image" src={sheet.imagePaths[current]} alt={`Q${current+1}`} />
            )}
            <p><MathText text={q} /></p>
          </div>

          <div className="options-list fade-in" key={`opts-${current}`}>
            {sheet.options[current].map((opt, idx) => (
              <button
                key={idx}
                className={`option-btn ${answers[current] === idx ? 'selected' : ''}`}
                onClick={() => { const a = [...answers]; a[current] = idx; setAnswers(a); }}
              >
                <span className="opt-label">{String.fromCharCode(65 + idx)}</span>
                <span className="opt-text"><MathText text={opt} /></span>
              </button>
            ))}
          </div>

          <div className="q-nav">
            <button className="btn btn-ghost" disabled={current === 0} onClick={() => setCurrent(c => c - 1)}>← Prev</button>
            {answers[current] !== null && (
              <button className="btn btn-ghost" onClick={() => { const a = [...answers]; a[current] = null; setAnswers(a); }}>Clear</button>
            )}
            {current < totalQ - 1 ? (
              <button className="btn btn-primary" onClick={() => setCurrent(c => c + 1)}>Next →</button>
            ) : (
              <button className="btn btn-primary" onClick={() => setShowConfirm(true)}>Submit ✓</button>
            )}
          </div>
        </div>

        {/* Question Palette */}
        <div className="quiz-palette">
          <div className="palette-header">Question Palette</div>
          <div className="palette-legend">
            <span><span className="dot dot-answered"></span>Answered</span>
            <span><span className="dot dot-skipped"></span>Skipped</span>
            <span><span className="dot dot-flagged"></span>Flagged</span>
          </div>
          <div className="palette-grid">
            {Array.from({ length: totalQ }, (_, i) => (
              <button
                key={i}
                className={`palette-btn ${current === i ? 'palette-current' : ''} ${answers[i] !== null ? 'palette-answered' : ''} ${flagged[i] ? 'palette-flagged' : ''}`}
                onClick={() => setCurrent(i)}
              >
                {flagged[i] ? '🚩' : i + 1}
              </button>
            ))}
          </div>
          <button className="btn btn-primary submit-all-btn" onClick={() => setShowConfirm(true)}>
            Submit Sheet
          </button>
        </div>
      </div>

      {/* Pause Confirm Modal */}
      {showPauseConfirm && (
        <div className="modal-overlay fade-in" onClick={() => setShowPauseConfirm(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>⏸ Pause attempt?</h3>
            <p className="modal-note">
              {firebase?.effectiveUid
                ? 'Aapka progress Firebase mein save ho jayega. Baad mein resume kar sakte ho.'
                : 'App band karne ke baad data kho sakta hai. Sign in karo reliable save ke liye.'}
            </p>
            <div className="modal-stats">
              <div className="modal-stat"><span className="ms-val" style={{color:'var(--green)'}}>{attempted}</span><span className="ms-label">Attempted</span></div>
              <div className="modal-stat"><span className="ms-val" style={{color:'var(--text3)'}}>{totalQ - attempted}</span><span className="ms-label">Remaining</span></div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowPauseConfirm(false)}>Continue</button>
              <button className="btn btn-primary" onClick={handlePause}>⏸ Save & Pause</button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirm Modal */}
      {showConfirm && (
        <div className="modal-overlay fade-in" onClick={() => setShowConfirm(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Submit Sheet?</h3>
            <div className="modal-stats">
              <div className="modal-stat"><span className="ms-val" style={{color:'var(--green)'}}>{attempted}</span><span className="ms-label">Attempted</span></div>
              <div className="modal-stat"><span className="ms-val" style={{color:'var(--text3)'}}>{totalQ - attempted}</span><span className="ms-label">Skipped</span></div>
              <div className="modal-stat"><span className="ms-val" style={{color:'var(--yellow)'}}>{flagged.filter(Boolean).length}</span><span className="ms-label">Flagged</span></div>
            </div>
            {firebase?.effectiveUid
              ? <p className="modal-note">✅ Data Class Tracker mein save ho jayega.</p>
              : <p className="modal-note" style={{color:'var(--yellow)'}}>⚠️ Sign in nahi hai — data save nahi hoga.</p>
            }
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowConfirm(false)}>Continue Attempt</button>
              <button className="btn btn-primary" onClick={() => handleSubmit()}>Yes, Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
