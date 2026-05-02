/**
 * useFirebase — QuizForge ka Firebase bridge
 *
 * Firestore collection: 'practices'
 * Document shape (same as Class Tracker expects):
 * {
 *   uid,
 *   sheetId,          // e.g. "KPP_01"
 *   sheetName,        // e.g. "KPP 01 : Electrostatics"
 *   chapter,          // e.g. "Electrostatics"
 *   subject,
 *   date,             // "YYYY-MM-DD"
 *   totalQns,
 *   correct,
 *   wrong,
 *   touched,
 *   skipped,
 *   accuracy,
 *   timeTaken,        // seconds
 *   mode,             // "quiz" | "practice"
 *   status,           // "paused" | "completed"
 *   isReattempt,      // boolean
 *   reattemptOf,      // docId of original, or null
 *   pausedState,      // { answers, timeLeft, flagged, qTimes } — only when paused
 *   timestamp,
 * }
 */

import { useState, useEffect } from 'react';
import {
  collection, addDoc, updateDoc, getDocs,
  doc, query, where, orderBy
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { db, auth, provider } from '../firebase';

export function useFirebase() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const signIn = () => signInWithPopup(auth, provider);
  const signOut = () => auth.signOut();

  /**
   * Save a NEW attempt (paused or completed)
   * Returns the new Firestore doc ID
   */
  async function saveAttempt(sheet, result, pausedState = null) {
    if (!user) return null;
    const data = buildDoc(sheet, result, pausedState, user.uid);
    try {
      const ref = await addDoc(collection(db, 'practices'), data);
      return ref.id;
    } catch (e) {
      console.error('saveAttempt failed', e);
      return null;
    }
  }

  /**
   * Update an existing attempt (e.g. pause→resume→complete, or reattempt edit)
   */
  async function updateAttempt(docId, sheet, result, pausedState = null) {
    if (!user || !docId) return;
    const data = buildDoc(sheet, result, pausedState, user.uid);
    try {
      await updateDoc(doc(db, 'practices', docId), data);
    } catch (e) {
      console.error('updateAttempt failed', e);
    }
  }

  /**
   * Load paused attempt for a given sheet (latest one)
   * Returns { docId, pausedState } or null
   */
  async function loadPausedAttempt(sheetId) {
    if (!user) return null;
    try {
      const q = query(
        collection(db, 'practices'),
        where('uid', '==', user.uid),
        where('sheetId', '==', sheetId),
        where('status', '==', 'paused'),
        orderBy('timestamp', 'desc')
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const d = snap.docs[0];
      return { docId: d.id, pausedState: d.data().pausedState };
    } catch (e) {
      console.error('loadPausedAttempt failed', e);
      return null;
    }
  }

  /**
   * Check if this sheet has been attempted before (for reattempt flag)
   * Returns the last completed docId or null
   */
  async function getLastCompletedAttempt(sheetId) {
    if (!user) return null;
    try {
      const q = query(
        collection(db, 'practices'),
        where('uid', '==', user.uid),
        where('sheetId', '==', sheetId),
        where('status', '==', 'completed'),
        orderBy('timestamp', 'desc')
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return snap.docs[0].id;
    } catch (e) {
      return null;
    }
  }

  return {
    user,
    authLoading,
    signIn,
    signOut,
    saveAttempt,
    updateAttempt,
    loadPausedAttempt,
    getLastCompletedAttempt,
  };
}

// ── Helper ──────────────────────────────────────────────────────────────────

function buildDoc(sheet, result, pausedState, uid) {
  const {
    correct = 0, incorrect = 0, skipped = 0,
    marks = 0, total = 0, timeTaken = 0,
    mode = 'quiz', isReattempt = false, reattemptOf = null,
  } = result;

  const touched = correct + incorrect;
  const accuracy = touched > 0
    ? parseFloat(((correct / touched) * 100).toFixed(1))
    : 0.0;

  const status = pausedState ? 'paused' : 'completed';
  const today = new Date().toISOString().split('T')[0];

  return {
    uid,
    sheetId: sheet.id,
    sheetName: sheet.title,
    chapter: sheet.chapter || sheet.id,
    subject: sheet.subject || 'Other',
    date: today,
    totalQns: sheet.questions.length,
    correct,
    wrong: incorrect,
    touched,
    skipped,
    accuracy,
    marks,
    totalMarks: total,
    timeTaken,
    mode,
    status,
    isReattempt: isReattempt || false,
    reattemptOf: reattemptOf || null,
    pausedState: pausedState || null,
    timestamp: new Date(),
    source: 'quizforge',
  };
}
