import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';

function getFirebaseConfig() {
  if (typeof window !== 'undefined' && window.FIREBASE_CONFIG) return window.FIREBASE_CONFIG;
  try {
    const raw = localStorage.getItem('FIREBASE_CONFIG');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function getDb() {
  const config = getFirebaseConfig();
  if (!config) return null;
  const app = getApps().length ? getApps()[0] : initializeApp(config);
  return getFirestore(app);
}

export async function listCompanies() {
  const db = getDb();
  if (!db) throw new Error('Firebase not configured');
  const companiesRef = collection(db, 'companies');
  const q = query(companiesRef, orderBy('overallScore', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addCompany(company) {
  const db = getDb();
  if (!db) throw new Error('Firebase not configured');
  const companiesRef = collection(db, 'companies');
  const payload = { ...company, createdAt: serverTimestamp() };
  const doc = await addDoc(companiesRef, payload);
  return { id: doc.id, ...company };
}

export async function getCompanyById(companyId) {
  const db = getDb();
  if (!db) throw new Error('Firebase not configured');
  const ref = doc(db, 'companies', String(companyId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}


