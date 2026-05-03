import { useState, useEffect, useRef } from 'react';
import {
  collection, addDoc, updateDoc, getDocs,
  doc, query, where, orderBy
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { db, auth, provider } from '../firebase';

// Read uid from URL ONCE at module load time — before any React renders
// This is the safest way — URL is read before App.jsx can modify it
const INITIAL_URL_UID = new URLSearchParams(window.location.search).get('uid');

console.log('[QuizForge] Initial URL uid:', INITIAL_URL_UID);

export function useFirebase() {
  const [user, setUser]             = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Keep uid in a ref so it's always accessible in async functions
  const uidRef = useRef(INITIAL_URL_UID);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setAuthLoading(false);
      // If no URL uid, use signed-in user uid
      if (!uidRef.current && u?.uid) {
        uidRef.current = u.uid;
        console.log('[QuizForge] Auth uid set:', u.uid);
      }
    });
    return unsub;
  }, []);

  const signIn  = () => signInWithPopup(auth, provider);
  const signOut = () => auth.signOut();

  // Helper — always gets latest uid
  const getUid = () => uidRef.current || user?.uid || null;

  // ── Save new attempt ────────────────────────────────────────────────────
  async function saveAttempt(sheet, result, pausedState = null) {
    const uid = getUid();
    console.log('[QuizForge] saveAttempt called — uid:', uid, '| correct:', result.correct, '| status:', pausedState ? 'paused' : 'completed');
    if (!uid) {
      console.error('[QuizForge] saveAttempt FAILED — no uid!');
      return null;
    }
    const data = buildDoc(sheet, result, pausedState, uid);
    try {
      const ref = await addDoc(collection(db, 'practices'), data);
      console.log('[QuizForge] ✅ Saved to Firestore — docId:', ref.id);
      return ref.id;
    } catch (e) {
      console.error('[QuizForge] ❌ Firestore save error:', e.code, e.message);
      return null;
    }
  }

  // ── Update existing attempt ─────────────────────────────────────────────
  async function updateAttempt(docId, sheet, result, pausedState = null) {
    const uid = getUid();
    if (!uid || !docId) return;
    const data = buildDoc(sheet, result, pausedState, uid);
    try {
      await updateDoc(doc(db, 'practices', docId), data);
      console.log('[QuizForge] ✅ Updated Firestore — docId:', docId);
    } catch (e) {
      console.error('[QuizForge] ❌ Firestore update error:', e.code, e.message);
    }
  }

  // ── Load paused attempt ─────────────────────────────────────────────────
  async function loadPausedAttempt(sheetId) {
    const uid = getUid();
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
      console.error('[QuizForge] loadPausedAttempt error:', e.code, e.message);
      return null;
    }
  }

  // ── Get last completed attempt ──────────────────────────────────────────
  async function getLastCompletedAttempt(sheetId) {
    const uid = getUid();
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

  const effectiveUid = getUid();

  return {
    user,
    authLoading,
    effectiveUid,
    isFromClassTracker: !!INITIAL_URL_UID,
    signIn,
    signOut,
    saveAttempt,
    updateAttempt,
    loadPausedAttempt,
    getLastCompletedAttempt,
  };
}

// ── buildDoc ───────────────────────────────────────────────────────────────
function buildDoc(sheet, result, pausedState, uid) {
  const {
    correct = 0, incorrect = 0, skipped = 0,
    marks = 0, total = 0, timeTaken = 0,
    mode = 'quiz', isReattempt = false, reattemptOf = null,
    details = [],
  } = result;

  const touched  = correct + incorrect;
  const accuracy = touched > 0 ? parseFloat(((correct / touched) * 100).toFixed(1)) : 0.0;
  const status   = pausedState ? 'paused' : 'completed';
  const today    = new Date().toISOString().split('T')[0];

  const safeDetails = (details || []).map(d => ({
    q:        d.q,
    selected: d.selected ?? null,
    correct:  d.correct,
    status:   d.status,
    time:     d.time ?? null,
  }));

  return {
    uid,
    sheetId:     sheet.id,
    sheetName:   sheet.title,
    chapter:     sheet.chapter || sheet.id,
    subject:     sheet.subject || 'Other',
    date:        today,
    totalQns:    sheet.questions.length,
    correct,
    wrong:       incorrect,
    touched,
    skipped,
    accuracy,
    marks,
    totalMarks:  total,
    timeTaken,
    mode,
    status,
    isReattempt: isReattempt || false,
    reattemptOf: reattemptOf || null,
    pausedState: pausedState || null,
    details:     safeDetails,
    timestamp:   new Date(),
    source:      'quizforge',
  };
}
