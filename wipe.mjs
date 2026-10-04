import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBuQ9NrQKgYSfbFOqXFwI5XGmXOA5M9AxI',
  authDomain: 'the-label-pos.firebaseapp.com',
  projectId: 'the-label-pos',
  storageBucket: 'the-label-pos.firebasestorage.app',
  messagingSenderId: '1026686993909',
  appId: '1:1026686993909:web:afb76ef4d7cb44bec98cbc'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function wipe() {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, 'umarpsycho3@gmail.com', '424212');
    const uid = userCredential.user.uid;
    console.log('Logged in as', uid);
    
    // Wipe the document
    await setDoc(doc(db, 'users', uid), {});
    console.log('WIPED DOCUMENT');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
wipe();
