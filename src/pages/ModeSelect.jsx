import { useEffect, useState } from 'react';
import './ModeSelect.css';

export default function ModeSelect({ sheet, firebase, onMode, onBack }) {
  const qCount = sheet.questions.length;
  const totalMarks = qCount * (sheet.marksPerQuestion || 4);
  const mins = Math.floor((sheet.totalTime || 600) / 60);

  const [pausedDoc, setPausedDoc] = useState(null);   // { docId, pausedState }
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!firebase?.user) return;
    setChecking(true);
    firebase.loadPausedAttempt(sheet.id).then(res => {
      setPausedDoc(res);
      setChecking(false);
    });
  }, [sheet.id, firebase?.user]);

  return (
    <div className="mode-page">
      <button className="back-btn btn btn-ghost" onClick={onBack}>← Back</button>

      <div className="mode-header fade-up">
        <span className="mode-sheet-id">{sheet.id}</span>
        <h1 className="mode-title">{sheet.title}</h1>
        <div className="mode-info-row">
          <span className="info-chip">❓ {qCount} Questions</span>
          <span className="info-chip">◎ {totalMarks} Marks</span>
          <span className="info-chip">◷ {mins} min (Quiz)</span>
        </div>
      </div>

      {/* Resume Banner */}
      {!checking && pausedDoc && (
        <div className="resume-banner fade-up">
          <span className="resume-icon">⏸</span>
          <div className="resume-text">
            <strong>Paused attempt found!</strong>
            <span>Aapne beech mein chodha tha — wahan se continue karoge?</span>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => onMode('quiz', { docId: pausedDoc.docId, pausedState: pausedDoc.pausedState })}
          >
            ▶ Resume
          </button>
        </div>
      )}

      <div className="mode-cards fade-up" style={{ animationDelay: '0.1s' }}>
        {/* Quiz Mode */}
        <div className="mode-card mode-quiz" onClick={() => onMode('quiz')}>
          <div className="mode-card-icon">⏱</div>
          <div className="mode-card-body">
            <h2 className="mode-card-title">Quiz Mode</h2>
            <p className="mode-card-desc">
              Ek fixed timer milega puri sheet ke liye. Submit karo ya time khatam hone par auto-submit.
            </p>
            <ul className="mode-features">
              <li>⏳ Total time: <strong>{mins} minutes</strong></li>
              <li>🔒 Answers locked until submit</li>
              <li>⏸ Pause karke baad mein resume karo</li>
              <li>📊 Data Class Tracker mein jayega</li>
            </ul>
          </div>
          <div className="mode-card-arrow">→</div>
        </div>

        {/* Practice Mode */}
        <div className="mode-card mode-practice" onClick={() => onMode('practice')}>
          <div className="mode-card-icon">📖</div>
          <div className="mode-card-body">
            <h2 className="mode-card-title">Practice Mode</h2>
            <p className="mode-card-desc">
              Har question ka apna timer hoga. Attempt karo apni speed pe, explanation bhi milega.
            </p>
            <ul className="mode-features">
              <li>⏱ Per-question timer (starts at 0)</li>
              <li>✅ Instant answer feedback</li>
              <li>💡 Explanation after each question</li>
              <li>📊 Data Class Tracker mein jayega</li>
            </ul>
          </div>
          <div className="mode-card-arrow">→</div>
        </div>
      </div>
    </div>
  );
}
