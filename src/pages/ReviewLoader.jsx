import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Analysis from './Analysis';
import { allSheets } from '../data/index.js';

export default function ReviewLoader({ docId, firebase, onHome }) {
  const [state, setState] = useState('loading'); // loading | loaded | error
  const [result, setResult] = useState(null);
  const [sheet, setSheet] = useState(null);

  useEffect(() => {
    if (!docId) { setState('error'); return; }
    loadAttempt();
  }, [docId]);

  const loadAttempt = async () => {
    try {
      const snap = await getDoc(doc(db, 'practices', docId));
      if (!snap.exists()) { setState('error'); return; }

      const data = snap.data();

      // Sheet dhundho allSheets mein
      const foundSheet = allSheets.find(s => s.id === data.sheetId);
      if (!foundSheet) { setState('error'); return; }

      // Result object banao Firebase data se — Analysis page ka format
      const result = {
        correct:    data.correct   || 0,
        incorrect:  data.wrong     || 0,
        skipped:    data.skipped   || 0,
        marks:      data.marks     || 0,
        total:      data.totalMarks || (foundSheet.questions.length * (foundSheet.marksPerQuestion || 4)),
        timeTaken:  data.timeTaken || 0,
        totalQ:     data.totalQns  || foundSheet.questions.length,
        mode:       data.mode      || 'quiz',
        isReattempt: data.isReattempt || false,
        details:    data.details   || [],
        flagged:    data.flagged   || [],
        date:       data.date,
        fromFirebase: true,   // flag to show "Past Attempt" label
      };

      setSheet(foundSheet);
      setResult(result);
      setState('loaded');
    } catch (e) {
      console.error('[QuizForge] ReviewLoader error:', e);
      setState('error');
    }
  };

  if (state === 'loading') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '16px',
        background: 'var(--bg)', color: 'var(--text2)'
      }}>
        <div style={{ fontSize: '40px' }}>🔬</div>
        <p style={{ fontSize: '15px' }}>Loading attempt data...</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '16px',
        background: 'var(--bg)', color: 'var(--text2)', padding: '20px', textAlign: 'center'
      }}>
        <div style={{ fontSize: '40px' }}>❌</div>
        <p style={{ fontSize: '15px' }}>Attempt data load nahi hua.<br/>Sheet ya record exist nahi karta.</p>
        <button className="btn btn-ghost" onClick={onHome}>🏠 Home</button>
      </div>
    );
  }

  return (
    <Analysis
      result={result}
      sheet={sheet}
      onHome={onHome}
      onRetry={onHome}
      isPastAttempt={true}
    />
  );
}
