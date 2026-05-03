import { useState, useEffect, useRef } from 'react';
import {
  collection, addDoc, updateDoc, getDocs,
  doc, query, where, orderBy
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { db, auth, provider } from '../firebase';

export function useFirebase() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Read uid ONCE from URL and store in ref so it never gets lost
  const urlUidRef = useRef(new URLSearchParams(window.location.search).get('uid'));
  const urlUid = urlUidRef.current;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const signIn  = () => signInWithPopup(auth, provider);
  const signOut = () => auth.signOut();

  // urlUid (Class Tracker se) > signed-in user uid
  const effectiveUid = urlUid || user?.uid || null;

  // ── Save new attempt ────────────────────────────────────────────────────
  async function saveAttempt(sheet, result, pausedState = null) {
    const uid = urlUidRef.current || user?.uid;   // re-read from ref
    console.log('[QuizForge] saveAttempt uid=', uid, 'result=', result.correct);
    if (!uid) { console.warn('[QuizForge] No uid — not saving'); return null; }
    const data = buildDoc(sheet, result, pausedState, uid);
    try {
      const ref = await addDoc(collection(db, 'practices'), data);
      console.log('[QuizForge] Saved doc:', ref.id);
      return ref.id;
    } catch (e) {
      console.error('[QuizForge] saveAttempt error:', e);
      return null;
    }
  }

  // ── Update existing attempt ─────────────────────────────────────────────
  async function updateAttempt(docId, sheet, result, pausedState = null) {
    const uid = urlUidRef.current || user?.uid;
    if (!uid || !docId) return;
    const data = buildDoc(sheet, result, pausedState, uid);
    try {
      await updateDoc(doc(db, 'practices', docId), data);
      console.log('[QuizForge] Updated doc:', docId);
    } catch (e) {
      console.error('[QuizForge] updateAttempt error:', e);
    }
  }

  // ── Load paused attempt ─────────────────────────────────────────────────
  async function loadPausedAttempt(sheetId) {
    const uid = urlUidRef.current || user?.uid;
    if (!uid) return null;
    try {
      const q = query(
        collection(db, 'practices'),
        where('uid', '==', uid),
        where('sheetId', '==', sheetId),
        where('status', '==', 'paused'),
        orderBy('timestamp', 'desc')
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const d = snap.docs[0];
      return { docId: d.id, pausedState: d.data().pausedState };
    } catch (e) {
      console.error('[QuizForge] loadPausedAttempt error:', e);
      return null;
    }
  }

  // ── Get last completed attempt ──────────────────────────────────────────
  async function getLastCompletedAttempt(sheetId) {
    const uid = urlUidRef.current || user?.uid;
    if (!uid) return null;
    try {
      const q = query(
        collection(db, 'practices'),
        where('uid', '==', uid),
        where('sheetId', '==', sheetId),
        where('status', '==', 'completed'),
        orderBy('timestamp', 'desc')
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return snap.docs[0].id;
    } catch (e) { return null; }
  }

  return {
    user,
    authLoading,
    effectiveUid,
    isFromClassTracker: !!urlUid,
    signIn,
    signOut,
    saveAttempt,
    updateAttempt,
    loadPausedAttempt,
    getLastCompletedAttempt,
  };
}

// ── buildDoc: saara data + details array ───────────────────────────────────
function buildDoc(sheet, result, pausedState, uid) {
  const {
    correct = 0, incorrect = 0, skipped = 0,
    marks = 0, total = 0, timeTaken = 0,
    mode = 'quiz', isReattempt = false, reattemptOf = null,
    details = [],   // ← question-wise result array
  } = result;

  const touched  = correct + incorrect;
  const accuracy = touched > 0 ? parseFloat(((correct / touched) * 100).toFixed(1)) : 0.0;
  const status   = pausedState ? 'paused' : 'completed';
  const today    = new Date().toISOString().split('T')[0];

  // details array mein sirf zaruri fields rakho (Firestore size limit)
  const safeDetails = (details || []).map(d => ({
    q:        d.q,
    selected: d.selected ?? null,
    correct:  d.correct,
    status:   d.status,           // 'correct' | 'incorrect' | 'skipped'
    time:     d.time ?? null,     // practice mode per-q time
  }));

  return {
    uid,
    sheetId:      sheet.id,
    sheetName:    sheet.title,
    chapter:      sheet.chapter || sheet.id,
    subject:      sheet.subject || 'Other',
    date:         today,
    totalQns:     sheet.questions.length,
    correct,
    wrong:        incorrect,
    touched,
    skipped,
    accuracy,
    marks,
    totalMarks:   total,
    timeTaken,
    mode,
    status,
    isReattempt:  isReattempt || false,
    reattemptOf:  reattemptOf || null,
    pausedState:  pausedState || null,
    details:      safeDetails,      // ← ab save hoga
    timestamp:    new Date(),
    source:       'quizforge',
  };
}
