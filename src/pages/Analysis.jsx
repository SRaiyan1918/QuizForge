import { useState } from 'react';
import './Analysis.css';
import MathText from '../components/MathText';

export default function Analysis({ result, sheet, onHome, onRetry }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [reviewFilter, setReviewFilter] = useState('all');

  const { correct, incorrect, skipped, marks, total, details, timeTaken, totalQ, mode } = result;
  const accuracy = correct + incorrect > 0 ? ((correct / (correct + incorrect)) * 100).toFixed(1) : '0.0';
  const completion = (((correct + incorrect) / totalQ) * 100).toFixed(0);

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2,'0')}m`;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  const scorePercent = (marks / total) * 100;
  const scoreColor = scorePercent >= 70 ? 'var(--green)' : scorePercent >= 40 ? 'var(--yellow)' : 'var(--red)';

  const filteredDetails = details.filter(d => {
    if (reviewFilter === 'all') return true;
    return d.status === reviewFilter;
  });

  const avgTimePerQ = totalQ > 0 ? Math.round(timeTaken / totalQ) : 0;

  return (
    <div className="analysis-page">
      {/* Hero Score Section */}
      <div className="analysis-hero fade-up">
        <div className="hero-inner">
          <div className="hero-badge" style={{ color: scoreColor }}>
            {scorePercent >= 70 ? '🏆' : scorePercent >= 40 ? '📈' : '💪'}
          </div>
          <div className="hero-score-block">
            <div className="hero-score" style={{ color: scoreColor }}>
              <span className="score-big">{marks}</span>
              <span className="score-total">/{total}</span>
            </div>
            <div className="hero-sheet-name">{sheet.title}</div>
            <div className="hero-mode-tag">
              <span className={`tag ${mode === 'quiz' ? 'tag-accent' : 'tag-green'}`}>
                {mode === 'quiz' ? '⏱ Quiz Mode' : '📖 Practice Mode'}
              </span>
            </div>
          </div>
        </div>

        {/* Stat Cards Row */}
        <div className="hero-stats fade-up" style={{ animationDelay: '0.1s' }}>
          <div className="hstat">
            <div className="hstat-icon" style={{ color: 'var(--green)' }}>✓</div>
            <div className="hstat-val" style={{ color: 'var(--green)' }}>{correct}/{totalQ}</div>
            <div className="hstat-label">Correct</div>
            <div className="hstat-bar-track">
              <div className="hstat-bar" style={{ width: `${(correct/totalQ)*100}%`, background: 'var(--green)' }} />
            </div>
          </div>
          <div className="hstat">
            <div className="hstat-icon" style={{ color: 'var(--red)' }}>✗</div>
            <div className="hstat-val" style={{ color: 'var(--red)' }}>{incorrect}/{totalQ}</div>
            <div className="hstat-label">Incorrect</div>
            <div className="hstat-bar-track">
              <div className="hstat-bar" style={{ width: `${(incorrect/totalQ)*100}%`, background: 'var(--red)' }} />
            </div>
          </div>
          <div className="hstat">
            <div className="hstat-icon" style={{ color: 'var(--text3)' }}>▷</div>
            <div className="hstat-val" style={{ color: 'var(--text2)' }}>{skipped}/{totalQ}</div>
            <div className="hstat-label">Skipped</div>
            <div className="hstat-bar-track">
              <div className="hstat-bar" style={{ width: `${(skipped/totalQ)*100}%`, background: 'var(--surface3)' }} />
            </div>
          </div>
        </div>

        {/* Mini metrics */}
        <div className="hero-metrics fade-up" style={{ animationDelay: '0.15s' }}>
          <div className="metric-chip">
            <span className="mc-icon">🎯</span>
            <div>
              <div className="mc-val">{accuracy}%</div>
              <div className="mc-label">Accuracy</div>
            </div>
          </div>
          <div className="metric-chip">
            <span className="mc-icon">📋</span>
            <div>
              <div className="mc-val">{completion}%</div>
              <div className="mc-label">Completed</div>
            </div>
          </div>
          <div className="metric-chip">
            <span className="mc-icon">⏱</span>
            <div>
              <div className="mc-val">{formatTime(timeTaken)}</div>
              <div className="mc-label">Time Taken</div>
            </div>
          </div>
          <div className="metric-chip">
            <span className="mc-icon">⚡</span>
            <div>
              <div className="mc-val">{formatTime(avgTimePerQ)}</div>
              <div className="mc-label">Avg / Q</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="analysis-tabs fade-up" style={{ animationDelay: '0.2s' }}>
        {['overview', 'review', 'flagged'].map(tab => (
          <button
            key={tab}
            className={`atab ${activeTab === tab ? 'atab-active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'overview' ? '📊 Overview' : tab === 'review' ? '📝 Review' : '🚩 Flagged'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="analysis-content fade-in" key={activeTab}>

        {activeTab === 'overview' && (
          <div className="overview-tab">
            {/* Score Visual */}
            <div className="score-visual-card card">
              <h3 className="card-heading">Score Breakdown</h3>
              <div className="score-donut-wrap">
                <ScoreDonut correct={correct} incorrect={incorrect} skipped={skipped} total={totalQ} />
              </div>
            </div>

            {/* Performance Summary */}
            <div className="perf-summary card">
              <h3 className="card-heading">Performance Summary</h3>
              <div className="perf-rows">
                <div className="perf-row">
                  <span className="pr-label">Marks Obtained</span>
                  <span className="pr-val" style={{ color: scoreColor }}>{marks} / {total}</span>
                </div>
                <div className="perf-row">
                  <span className="pr-label">Questions Correct</span>
                  <span className="pr-val" style={{ color: 'var(--green)' }}>{correct}</span>
                </div>
                <div className="perf-row">
                  <span className="pr-label">Questions Wrong</span>
                  <span className="pr-val" style={{ color: 'var(--red)' }}>{incorrect}</span>
                </div>
                <div className="perf-row">
                  <span className="pr-label">Questions Skipped</span>
                  <span className="pr-val">{skipped}</span>
                </div>
                <div className="perf-row">
                  <span className="pr-label">Accuracy</span>
                  <span className="pr-val">{accuracy}%</span>
                </div>
                <div className="perf-row">
                  <span className="pr-label">Total Time</span>
                  <span className="pr-val">{formatTime(timeTaken)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'review' && (
          <div className="review-tab">
            <div className="review-filters">
              {['all', 'correct', 'incorrect', 'skipped'].map(f => (
                <button
                  key={f}
                  className={`filter-tab ${reviewFilter === f ? 'active' : ''}`}
                  onClick={() => setReviewFilter(f)}
                >
                  {f === 'all' ? `All (${totalQ})` :
                   f === 'correct' ? `✓ Correct (${correct})` :
                   f === 'incorrect' ? `✗ Wrong (${incorrect})` :
                   `▷ Skipped (${skipped})`}
                </button>
              ))}
            </div>

            <div className="review-list">
              {filteredDetails.map((d, i) => (
                <ReviewCard key={i} d={d} sheet={sheet} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'flagged' && (
          <div className="review-tab">
            {result.flagged && result.flagged.filter(Boolean).length > 0 ? (
              <>
                <p style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '16px' }}>
                  🚩 {result.flagged.filter(Boolean).length} questions flagged — ye woh questions hain jo tumne bookmark kiye the
                </p>
                <div className="review-list">
                  {result.flagged.map((f, i) => f ? (
                    <ReviewCard
                      key={i}
                      d={details.find(d => d.q === i) || { q: i, selected: null, correct: sheet.answers[i], status: 'skipped' }}
                      sheet={sheet}
                    />
                  ) : null)}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🚩</div>
                <p>Koi flagged question nahi — Quiz mein ⚑ Flag button se questions bookmark karo</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="analysis-actions fade-up">
        <button className="btn btn-ghost" onClick={onHome}>🏠 Home</button>
        <button className="btn btn-primary" onClick={onRetry}>↺ Reattempt</button>
      </div>
    </div>
  );
}

function ScoreDonut({ correct, incorrect, skipped, total }) {
  const r = 70, cx = 90, cy = 90;
  const circ = 2 * Math.PI * r;
  const cPct = correct / total;
  const iPct = incorrect / total;
  const sPct = skipped / total;

  const segments = [
    { pct: cPct, color: 'var(--green)', offset: 0 },
    { pct: iPct, color: 'var(--red)', offset: cPct },
    { pct: sPct, color: 'var(--surface3)', offset: cPct + iPct },
  ];

  return (
    <div className="donut-wrap">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--surface2)" strokeWidth="18" />
        {segments.map((seg, i) => seg.pct > 0 && (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="18"
            strokeDasharray={`${seg.pct * circ} ${circ}`}
            strokeDashoffset={-seg.offset * circ}
            strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'all 0.8s ease' }}
          />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--text)" fontSize="22" fontWeight="700" fontFamily="DM Mono, monospace">
          {correct}/{total}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" fill="var(--text3)" fontSize="11" fontFamily="DM Sans, sans-serif">
          Correct
        </text>
      </svg>
      <div className="donut-legend">
        <span><span className="dot" style={{background:'var(--green)'}}></span> Correct</span>
        <span><span className="dot" style={{background:'var(--red)'}}></span> Incorrect</span>
        <span><span className="dot" style={{background:'var(--surface3)'}}></span> Skipped</span>
      </div>
    </div>
  );
}

function ReviewCard({ d, sheet }) {
  const [showExp, setShowExp] = useState(false);
  const statusColors = { correct: 'var(--green)', incorrect: 'var(--red)', skipped: 'var(--text3)' };
  const statusBg = { correct: 'var(--green-bg)', incorrect: 'var(--red-bg)', skipped: 'var(--surface2)' };

  return (
    <div className="review-card card fade-up" style={{ borderLeftColor: statusColors[d.status] }}>
      <div className="rc-header">
        <span className="rc-qnum">Q{d.q + 1}</span>
        <span className="rc-status" style={{ background: statusBg[d.status], color: statusColors[d.status] }}>
          {d.status === 'correct' ? '✓ Correct' : d.status === 'incorrect' ? '✗ Incorrect' : '▷ Skipped'}
        </span>
        {d.time !== undefined && (
          <span className="rc-time">⏱ {d.time}s</span>
        )}
      </div>

      <p className="rc-question"><MathText text={sheet.questions[d.q]} /></p>

      {sheet.imagePaths?.[d.q] && (
        <img src={sheet.imagePaths[d.q]} alt="" className="rc-img" />
      )}

      <div className="rc-opts">
        {sheet.options[d.q].map((opt, i) => {
          const isCorrect = i === d.correct;
          const isSelected = i === d.selected;
          const cls = isCorrect ? 'rc-opt-correct' : (isSelected && !isCorrect) ? 'rc-opt-wrong' : 'rc-opt-neutral';
          return (
            <div key={i} className={`rc-opt ${cls}`}>
              <span className="rc-opt-lbl">{String.fromCharCode(65 + i)}</span>
              <span><MathText text={opt} /></span>
              {isCorrect && <span className="rc-badge correct-badge">✓</span>}
              {isSelected && !isCorrect && <span className="rc-badge wrong-badge">✗</span>}
            </div>
          );
        })}
      </div>

      {sheet.explanations?.[d.q] && (
        <button className="exp-toggle-btn" onClick={() => setShowExp(e => !e)}>
          💡 {showExp ? 'Hide' : 'Show'} Explanation
        </button>
      )}
      {showExp && sheet.explanations?.[d.q] && (
        <div className="rc-explanation fade-up">
          <MathText text={sheet.explanations[d.q]} />
        </div>
      )}
    </div>
  );
}
