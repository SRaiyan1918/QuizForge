import { useState, useEffect, useRef } from 'react';
import './Practice.css';
import MathText from '../components/MathText';

export default function Practice({ sheet, firebase, existingDocId, onFinish, onBack }) {
  const totalQ = sheet.questions.length;
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState(Array(totalQ).fill(null));
  const [submitted, setSubmitted] = useState(Array(totalQ).fill(false));
  const [qTimes, setQTimes] = useState(Array(totalQ).fill(0));
  const [showExplanation, setShowExplanation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [docId, setDocId] = useState(existingDocId || null);
  const timerRef = useRef(null);

  // Per-question timer - counts UP from 0
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setQTimes(t => {
        const copy = [...t];
        copy[current] += 1;
        return copy;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [current]);

  const handleSelect = (idx) => {
    if (submitted[current]) return;
    const a = [...answers];
    a[current] = idx;
    setAnswers(a);
  };

  const handleSubmitQ = () => {
    if (answers[current] === null) return;
    clearInterval(timerRef.current);
    const s = [...submitted];
    s[current] = true;
    setSubmitted(s);
    setShowExplanation(false);
  };

  const handleNext = () => {
    setShowExplanation(false);
    if (current < totalQ - 1) {
      setCurrent(c => c + 1);
    } else {
      finishAll();
    }
  };

  const finishAll = async () => {
    clearInterval(timerRef.current);
    let correct = 0, incorrect = 0, skipped = 0;
    const details = answers.map((a, i) => {
      if (!submitted[i] || a === null) {
        skipped++;
        return { q: i, selected: null, correct: sheet.answers[i], status: 'skipped', time: qTimes[i] };
      }
      if (a === sheet.answers[i]) {
        correct++;
        return { q: i, selected: a, correct: sheet.answers[i], status: 'correct', time: qTimes[i] };
      }
      incorrect++;
      return { q: i, selected: a, correct: sheet.answers[i], status: 'incorrect', time: qTimes[i] };
    });
    const marks = correct * (sheet.marksPerQuestion || 4);
    const total = totalQ * (sheet.marksPerQuestion || 4);
    const timeTaken = qTimes.reduce((a, b) => a + b, 0);
    const result = { correct, incorrect, skipped, marks, total, details, timeTaken, totalQ, mode: 'practice' };

    setSaving(true);
    const isReattempt = !!(await firebase.getLastCompletedAttempt(sheet.id));
    result.isReattempt = isReattempt;

    let savedDocId;
    if (docId) {
      await firebase.updateAttempt(docId, sheet, result, null);
      savedDocId = docId;
    } else {
      savedDocId = await firebase.saveAttempt(sheet, result, null);
    }
    setSaving(false);
    onFinish(result, savedDocId);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m > 0 ? m + 'm ' : ''}${String(sec).padStart(2,'0')}s`;
  };

  const q = sheet.questions[current];
  const isSubmitted = submitted[current];
  const selectedAns = answers[current];
  const correctAns = sheet.answers[current];
  const isCorrect = selectedAns === correctAns;
  const progressPct = ((current + 1) / totalQ) * 100;

  const getOptClass = (idx) => {
    if (!isSubmitted) return selectedAns === idx ? 'selected' : '';
    if (idx === correctAns) return 'correct';
    if (idx === selectedAns && selectedAns !== correctAns) return 'wrong';
    return 'dimmed';
  };

  return (
    <div className="practice-page">
      {saving && <div className="saving-overlay">💾 Saving...</div>}
      {/* Header */}
      <div className="practice-header">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Back</button>
        <div className="prac-sheet-info">
          <span className="prac-sheet-id">{sheet.id}</span>
          <div className="prac-progress-bar">
            <div className="prac-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="prac-q-count">{current + 1}/{totalQ}</span>
        </div>
        <button className="btn btn-ghost btn-sm finish-btn" onClick={finishAll}>Finish →</button>
      </div>

      <div className="practice-body">
        {/* Side nav dots */}
        <div className="prac-side-nav">
          {Array.from({ length: totalQ }, (_, i) => (
            <button
              key={i}
              className={`prac-dot 
                ${i === current ? 'prac-dot-current' : ''}
                ${submitted[i] && answers[i] === sheet.answers[i] ? 'prac-dot-correct' : ''}
                ${submitted[i] && answers[i] !== sheet.answers[i] ? 'prac-dot-wrong' : ''}
              `}
              onClick={() => { setShowExplanation(false); setCurrent(i); }}
              title={`Q${i+1}`}
            />
          ))}
        </div>

        {/* Main content */}
        <div className="prac-main">
          <div className="prac-q-meta">
            <span className="prac-q-label">Question {current + 1}</span>
            <span className="prac-timer">
              <span>⏱</span>
              <span className="prac-timer-val">{formatTime(qTimes[current])}</span>
            </span>
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
                className={`option-btn ${getOptClass(idx)}`}
                onClick={() => handleSelect(idx)}
                disabled={isSubmitted}
              >
                <span className="opt-label">{String.fromCharCode(65 + idx)}</span>
                <span className="opt-text"><MathText text={opt} /></span>
                {isSubmitted && idx === correctAns && <span className="opt-badge correct-badge">✓ Correct</span>}
                {isSubmitted && idx === selectedAns && selectedAns !== correctAns && <span className="opt-badge wrong-badge">✗ Wrong</span>}
              </button>
            ))}
          </div>

          {/* Result Banner */}
          {isSubmitted && (
            <div className={`result-banner fade-up ${isCorrect ? 'banner-correct' : 'banner-wrong'}`}>
              <span className="banner-icon">{isCorrect ? '🎉' : '❌'}</span>
              <span className="banner-text">{isCorrect ? 'Sahi jawab! Well done.' : 'Galat jawab.'}</span>
              <button
                className="explanation-toggle"
                onClick={() => setShowExplanation(e => !e)}
              >
                {showExplanation ? 'Hide' : 'Explanation'} 💡
              </button>
            </div>
          )}

          {/* Explanation */}
          {isSubmitted && showExplanation && sheet.explanations?.[current] && (
            <div className="explanation-box fade-up">
              <div className="exp-header">💡 Explanation</div>
              <p><MathText text={sheet.explanations[current]} /></p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="prac-actions">
            {!isSubmitted ? (
              <button
                className="btn btn-primary"
                disabled={selectedAns === null}
                onClick={handleSubmitQ}
              >
                Check Answer ✓
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleNext}>
                {current < totalQ - 1 ? 'Next Question →' : 'See Results 🏁'}
              </button>
            )}

            {!isSubmitted && (
              <button className="btn btn-ghost" onClick={() => { setAnswers(a => { const c=[...a]; c[current]=null; return c; }); }}>
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
