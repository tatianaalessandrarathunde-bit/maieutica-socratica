
import { createClient } from '@supabase/supabase-js';
import { User, Journey, Question, Answer, Notification } from '../types';

const SUPABASE_URL = 'https://mipjhxarajybnljryxzm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_-UgBoFpfBGPt_qtRWNiSnQ_x37WeEP_';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const isDev = 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1' || 
  window.location.hostname.startsWith('192.168.');

const DB_NAME = isDev ? 'Maieutica_v16_DEV' : 'Maieutica_v16_PROD';
const DB_VERSION = 16;

const STORES = ['users', 'journeys', 'questions', 'answers', 'notifications'];

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      STORES.forEach(store => {
        if (!db.objectStoreNames.contains(store)) {
          const s = db.createObjectStore(store, { keyPath: 'id' });
          if (store === 'users') s.createIndex('email', 'email', { unique: true });
        }
      });
    };
  });
};

const cacheLocally = async (storeName: string, data: any) => {
  try {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put({ ...data, _synced: data._synced || false });
  } catch (e) {
    console.warn(`[Cache] Falha em ${storeName}:`, e);
  }
};

// Sincroniza dados locais não enviados para a nuvem
export const syncOfflineData = async (): Promise<{ success: boolean; count: number; error?: any }> => {
  let syncCount = 0;
  try {
    const db = await initDB();
    for (const storeName of STORES) {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const all = await new Promise<any[]>(r => {
        const req = store.getAll();
        req.onsuccess = () => r(req.result);
      });

      const pending = all.filter(item => !item._synced);
      for (const item of pending) {
        const { _synced, ...cleanItem } = item;
        const { error } = await supabase.from(storeName).upsert(cleanItem);
        if (error) throw error;
        
        await cacheLocally(storeName, { ...item, _synced: true });
        syncCount++;
      }
    }
    return { success: true, count: syncCount };
  } catch (e) {
    console.error("[Sincronia] Erro:", e);
    return { success: false, count: syncCount, error: e };
  }
};

export const saveUser = async (user: User): Promise<void> => {
  let synced = false;
  try {
    const { error } = await supabase.from('users').upsert(user);
    if (!error) synced = true;
  } catch (e) {}
  await cacheLocally('users', { ...user, _synced: synced });
};

export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const { data } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
    if (data) {
      await cacheLocally('users', { ...data, _synced: true });
      return data;
    }
  } catch (e) {}
  const db = await initDB();
  const req = db.transaction('users', 'readonly').objectStore('users').get(userId);
  return new Promise(r => req.onsuccess = () => r(req.result || null));
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const normalizedEmail = email.toLowerCase().trim();
  try {
    const { data } = await supabase.from('users').select('*').eq('email', normalizedEmail).maybeSingle();
    if (data) {
      await cacheLocally('users', { ...data, _synced: true });
      return data;
    }
  } catch (e) {}
  const db = await initDB();
  const tx = db.transaction('users', 'readonly');
  const index = tx.objectStore('users').index('email');
  const req = index.get(normalizedEmail);
  return new Promise(r => req.onsuccess = () => r(req.result || null));
};

export const saveJourney = async (journey: Journey): Promise<void> => {
  let synced = false;
  try {
    const { error } = await supabase.from('journeys').upsert(journey);
    if (!error) synced = true;
  } catch (e) {}
  await cacheLocally('journeys', { ...journey, _synced: synced });
};

export const ensureLiveJourney = async (userId: string): Promise<Journey> => {
  const journeyId = `live_oracle_${userId}`;
  const existing = await getAllJourneys(userId);
  const found = existing.find(j => j.id === journeyId);
  const journeyData: Journey = found || {
    id: journeyId, userId, name: 'Diálogos com o Oráculo',
    description: 'Registro das consultas vocais.', status: 'in_progress',
    createdAt: Date.now(), progress: 100
  };
  await saveJourney(journeyData);
  await saveQuestion({ id: 'live_turn', journeyId, text: 'Diálogo Vocal', order: 0, responseType: 'free_text' });
  return journeyData;
};

export const getAllJourneys = async (userId?: string): Promise<Journey[]> => {
  try {
    let query = supabase.from('journeys').select('*');
    if (userId) query = query.eq('userId', userId);
    const { data } = await query.order('createdAt', { ascending: false });
    if (data) {
      data.forEach(j => cacheLocally('journeys', { ...j, _synced: true }));
      return data;
    }
  } catch (e) {}
  const db = await initDB();
  const req = db.transaction('journeys', 'readonly').objectStore('journeys').getAll();
  return new Promise(r => req.onsuccess = () => {
    let all = req.result as Journey[];
    if (userId) all = all.filter(j => j.userId === userId);
    r(all.sort((a,b) => b.createdAt - a.createdAt));
  });
};

export const saveQuestion = async (q: Question): Promise<void> => {
  let synced = false;
  try {
    const { error } = await supabase.from('questions').upsert(q);
    if (!error) synced = true;
  } catch (e) {}
  await cacheLocally('questions', { ...q, _synced: synced });
};

export const getQuestionsByJourney = async (journeyId: string): Promise<Question[]> => {
  try {
    const { data } = await supabase.from('questions').select('*').eq('journeyId', journeyId).order('order');
    if (data) return data;
  } catch (e) {}
  const db = await initDB();
  const req = db.transaction('questions', 'readonly').objectStore('questions').getAll();
  return new Promise(r => req.onsuccess = () => r((req.result as Question[]).filter(q => q.journeyId === journeyId).sort((a,b) => a.order - b.order)));
};

export const saveAnswer = async (a: Answer): Promise<void> => {
  let synced = false;
  try { 
    const { error } = await supabase.from('answers').upsert(a);
    if (!error) synced = true;
  } catch (e) {}
  await cacheLocally('answers', { ...a, _synced: synced });
};

export const getAnswersByJourney = async (journeyId: string): Promise<Answer[]> => {
  try {
    const { data } = await supabase.from('answers').select('*').eq('journeyId', journeyId).order('timestamp');
    return data || [];
  } catch (e) {}
  const db = await initDB();
  const req = db.transaction('answers', 'readonly').objectStore('answers').getAll();
  return new Promise(r => req.onsuccess = () => r((req.result as Answer[]).filter(a => a.journeyId === journeyId).sort((a,b) => a.timestamp - b.timestamp)));
};

export const saveNotification = async (n: Notification): Promise<void> => {
  let synced = false;
  try { await supabase.from('notifications').upsert(n); synced = true; } catch (e) {}
  await cacheLocally('notifications', { ...n, _synced: synced });
};

export const getNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    const { data } = await supabase.from('notifications').select('*').eq('userId', userId).order('timestamp', { ascending: false });
    return data || [];
  } catch (e) {}
  const db = await initDB();
  const req = db.transaction('notifications', 'readonly').objectStore('notifications').getAll();
  return new Promise(r => req.onsuccess = () => r((req.result as Notification[]).filter(n => n.userId === userId).sort((a,b) => b.timestamp - a.timestamp)));
};

export const getAllStudents = async (): Promise<User[]> => {
  try {
    const { data } = await supabase.from('users').select('*').eq('userType', 'student');
    return data || [];
  } catch (e) { return []; }
}
