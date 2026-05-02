import { useState, useMemo } from 'react';
import { allSheets } from '../data/index.js';
import './Home.css';

const SubjectColors = {
  Mathematics: { bg: 'rgba(124,106,247,0.12)', color: '#a594f9' },
  Physics: { bg: 'rgba(251,191,36,0.1)', color: '#fbbf24' },
  Chemistry: { bg: 'rgba(74,222,128,0.1)', color: '#4ade80' },
  Biology: { bg: 'rgba(248,113,113,0.1)', color: '#f87171' },
  Default: { bg: 'rgba(124,106,247,0.12)', color: '#a594f9' },
};

export default function Home({ onSelect }) {
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('All');

  const subjects = useMemo(() => {
    const s = new Set(allSheets.map(sh => sh.subject || 'Other'));
    return ['All', ...s];
  }, []);

  const filtered = useMemo(() => {
    return allSheets.filter(sh => {
      const matchSearch =
        sh.title.toLowerCase().includes(search.toLowerCase()) ||
        sh.id.toLowerCase().includes(search.toLowerCase()) ||
        (sh.subject || '').toLowerCase().includes(search.toLowerCase());
      const matchSubject = filterSubject === 'All' || sh.subject === filterSubject;
      return matchSearch && matchSubject;
    });
  }, [search, filterSubject]);

  const getSubjectStyle = (subject) =>
    SubjectColors[subject] || SubjectColors.Default;

  return (
    <div className="home">
      {/* Header */}
      <header className="home-header fade-up">
        <div className="home-header-inner">
          <div className="home-logo">
            <span className="logo-icon">◈</span>
            <span className="logo-text">QuizForge</span>
          </div>
          <div className="home-meta">
            <span className="meta-count">{allSheets.length} sheets</span>
          </div>
        </div>
        <div className="home-hero">
          <h1 className="home-title">Your Practice <span className="accent-text">Arsenal</span></h1>
          <p className="home-subtitle">Attempt sheets in quiz or practice mode. Track your progress.</p>
        </div>
      </header>

      {/* Search & Filter */}
      <div className="home-controls fade-up" style={{ animationDelay: '0.1s' }}>
        <div className="search-wrap">
          <span className="search-icon">⌕</span>
          <input
            className="search-input"
            type="text"
            placeholder="Search sheets by name, subject, or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        <div className="filter-tabs">
          {subjects.map(s => (
            <button
              key={s}
              className={`filter-tab ${filterSubject === s ? 'active' : ''}`}
              onClick={() => setFilterSubject(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Sheet Grid */}
      <div className="sheets-grid fade-up" style={{ animationDelay: '0.2s' }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">◎</div>
            <p>No sheets found for "<strong>{search}</strong>"</p>
          </div>
        ) : (
          filtered.map((sheet, i) => {
            const style = getSubjectStyle(sheet.subject);
            const qCount = sheet.questions.length;
            const totalMarks = qCount * (sheet.marksPerQuestion || 4);
            const mins = Math.floor((sheet.totalTime || 600) / 60);

            return (
              <div
                key={sheet.id}
                className="sheet-card fade-up"
                style={{ animationDelay: `${0.05 * i}s` }}
                onClick={() => onSelect(sheet)}
              >
                <div className="sheet-card-top">
                  <div className="sheet-id" style={{ color: style.color }}>{sheet.chapter || sheet.id}</div>
                  <span className="sheet-subject-tag" style={{ background: style.bg, color: style.color }}>
                    {sheet.subject || 'General'}
                  </span>
                </div>

                <h3 className="sheet-title">{sheet.title}</h3>

                <div className="sheet-stats">
                  <div className="stat">
                    <span className="stat-icon">❓</span>
                    <span>{qCount} Questions</span>
                  </div>
                  <div className="stat">
                    <span className="stat-icon">◎</span>
                    <span>{totalMarks} Marks</span>
                  </div>
                  <div className="stat">
                    <span className="stat-icon">◷</span>
                    <span>{mins} min</span>
                  </div>
                </div>

                <div className="sheet-arrow">→</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
