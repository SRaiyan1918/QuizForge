import { useState, useEffect } from 'react';
import Home from './pages/Home';
import ModeSelect from './pages/ModeSelect';
import Quiz from './pages/Quiz';
import Practice from './pages/Practice';
import Analysis from './pages/Analysis';
import ReviewLoader from './pages/ReviewLoader';
import { useFirebase } from './hooks/useFirebase.js';
import { allSheets } from './data/index.js';
import './App.css';

export default function App() {
  const firebase = useFirebase();
  const [page, setPage] = useState('home');
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [result, setResult] = useState(null);
  const [currentDocId, setCurrentDocId] = useState(null);
  const [reviewDocId, setReviewDocId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sheetId  = params.get('sheetId');
    const reviewId = params.get('reviewId');

    // Deep Analysis mode — load past attempt
    if (reviewId) {
      setReviewDocId(reviewId);
      setPage('review');
      window.history.replaceState({}, '', window.location.pathname +
        (params.get('uid') ? `?uid=${params.get('uid')}` : ''));
      return;
    }

    // Normal attempt from Class Tracker
    if (sheetId) {
      const sheet = allSheets.find(s => s.id === sheetId);
      if (sheet) {
        setSelectedSheet(sheet);
        setPage('modeSelect');
        const newParams = new URLSearchParams(window.location.search);
        newParams.delete('sheetId');
        const newSearch = newParams.toString();
        window.history.replaceState({}, '', newSearch ? `?${newSearch}` : window.location.pathname);
      }
    }
  }, []);

  const navigate = (to, data = {}) => {
    setPage(to);
    if (data.sheet    !== undefined) setSelectedSheet(data.sheet);
    if (data.result   !== undefined) setResult(data.result);
    if (data.docId    !== undefined) setCurrentDocId(data.docId);
  };

  return (
    <div className="app-root">
      {!firebase.authLoading && !firebase.user && !firebase.isFromClassTracker && page !== 'home' && (
        <div className="auth-banner">
          <span>🔒 Sign in to save attempts</span>
          <button className="btn btn-primary btn-sm" onClick={firebase.signIn}>Sign in with Google</button>
        </div>
      )}

      {firebase.isFromClassTracker && (
        <div className="auth-topbar linked">
          <span>🔗 Class Tracker se linked — data automatically save hoga</span>
        </div>
      )}
      {!firebase.isFromClassTracker && firebase.user && (
        <div className="auth-topbar">
          <span className="auth-user-name">👤 {firebase.user.displayName?.split(' ')[0]}</span>
          <button className="auth-signout" onClick={firebase.signOut}>Sign out</button>
        </div>
      )}

      {page === 'home'       && <Home onSelect={(sheet) => navigate('modeSelect', { sheet })} />}
      {page === 'modeSelect' && <ModeSelect sheet={selectedSheet} firebase={firebase} onMode={(m, docId) => navigate(m === 'quiz' ? 'quiz' : 'practice', { docId: docId || null })} onBack={() => navigate('home')} />}
      {page === 'quiz'       && <Quiz sheet={selectedSheet} firebase={firebase} existingDocId={currentDocId} onFinish={(res, docId) => navigate('analysis', { result: res, docId })} onBack={() => navigate('modeSelect')} />}
      {page === 'practice'   && <Practice sheet={selectedSheet} firebase={firebase} existingDocId={currentDocId} onFinish={(res, docId) => navigate('analysis', { result: res, docId })} onBack={() => navigate('modeSelect')} />}
      {page === 'analysis'   && <Analysis result={result} sheet={selectedSheet} onHome={() => navigate('home')} onRetry={() => navigate('modeSelect')} />}
      {page === 'review'     && <ReviewLoader docId={reviewDocId} firebase={firebase} onHome={() => navigate('home')} />}
    </div>
  );
}
