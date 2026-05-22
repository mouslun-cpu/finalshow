import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyDB6cMPoHJQCedLFrHOvxUazcwlVO0BTlA',
  authDomain: 'finalshow-86ba7.firebaseapp.com',
  databaseURL: 'https://finalshow-86ba7-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'finalshow-86ba7',
  storageBucket: 'finalshow-86ba7.firebasestorage.app',
  messagingSenderId: '205488876926',
  appId: '1:205488876926:web:d9e3146b1f5cb356d1172f',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getDatabase(app);
