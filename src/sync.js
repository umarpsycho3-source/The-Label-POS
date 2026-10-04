import { auth, db } from './firebase.js';
import { doc, setDoc, onSnapshot, updateDoc, deleteField } from "firebase/firestore";
import { onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

let isSyncing = false;
window.hasLoadedCloudInitial = false;

// Store original localStorage methods
const originalSetItem = localStorage.setItem.bind(localStorage);
const originalRemoveItem = localStorage.removeItem.bind(localStorage);

// Shared master POS store document in Firestore (Fresh clean database)
const storeDocRef = doc(db, 'the_label_pos_v2', 'live_store');

// Function to upload key-value to Firestore
async function uploadToCloud(key, value) {
    if (!key.startsWith('pos_')) return;
    try {
        await setDoc(storeDocRef, {
            [key]: value
        }, { merge: true });
    } catch (e) {
        console.error("Cloud Sync Upload Error:", e);
    }
}

// Function to remove key from Firestore
async function removeFromCloud(key) {
    if (!key.startsWith('pos_')) return;
    try {
        await updateDoc(storeDocRef, {
            [key]: deleteField()
        });
    } catch (e) {
        console.error("Cloud Sync Delete Error:", e);
    }
}

// Override localStorage.setItem
localStorage.setItem = function(key, value) {
    originalSetItem(key, value);
    if (!isSyncing) {
        uploadToCloud(key, value);
    }
};

// Override localStorage.removeItem
localStorage.removeItem = function(key) {
    originalRemoveItem(key);
    if (!isSyncing) {
        removeFromCloud(key);
    }
};

// Listen to Firestore real-time changes
let unsubscribeSnapshot = null;
function startRealtimeSync() {
    if (unsubscribeSnapshot) return;
    
    unsubscribeSnapshot = onSnapshot(storeDocRef, (docSnap) => {
        isSyncing = true;
        
        if (docSnap.exists()) {
            const cloudData = docSnap.data() || {};
            
            // Clean up legacy sample sales if present in cloud
            if (cloudData.pos_sales_data && cloudData.pos_sales_data.includes('John Doe') && cloudData.pos_sales_data.includes('1001')) {
                cloudData.pos_sales_data = '[]';
                uploadToCloud('pos_sales_data', '[]');
            }

            // 1. Update/Add keys from cloud to localStorage
            Object.keys(cloudData).forEach(key => {
                if (key.startsWith('pos_')) {
                    const localVal = localStorage.getItem(key);
                    const cloudVal = cloudData[key];
                    if (localVal !== cloudVal) {
                        originalSetItem(key, cloudVal);
                    }
                }
            });
            
            // 2. Sync local keys that are not in cloud yet (first load) or delete local keys if deleted in cloud
            if (!window.hasLoadedCloudInitial) {
                const payload = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const localKey = localStorage.key(i);
                    if (localKey && localKey.startsWith('pos_') && !(localKey in cloudData)) {
                        payload[localKey] = localStorage.getItem(localKey);
                    }
                }
                if (Object.keys(payload).length > 0) {
                    setDoc(storeDocRef, payload, { merge: true }).catch(console.error);
                }
            } else {
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const localKey = localStorage.key(i);
                    if (localKey && localKey.startsWith('pos_')) {
                        if (!(localKey in cloudData)) {
                            originalRemoveItem(localKey);
                        }
                    }
                }
            }
        } else {
            // Cloud snapshot empty: Push existing local pos_ keys to cloud
            const initialPayload = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('pos_')) {
                    initialPayload[key] = localStorage.getItem(key);
                }
            }
            if (Object.keys(initialPayload).length > 0) {
                setDoc(storeDocRef, initialPayload, { merge: true }).catch(console.error);
            }
        }
        
        isSyncing = false;
        window.hasLoadedCloudInitial = true;
        
        // Notify all open pages and tabs to refresh their UI
        window.dispatchEvent(new CustomEvent('cloudDataSynced'));
    }, (error) => {
        console.error("Firestore onSnapshot error:", error);
        window.hasLoadedCloudInitial = true;
    });
}

// Auto-authenticate so every device on Firebase or Vercel can seamlessly read & write
async function ensureAuthenticated() {
    if (!auth.currentUser) {
        try {
            await signInAnonymously(auth);
        } catch (e) {
            try {
                await signInWithEmailAndPassword(auth, "store@thelabelpos.com", "store123456");
            } catch (err) {
                try {
                    await createUserWithEmailAndPassword(auth, "store@thelabelpos.com", "store123456");
                } catch (createErr) {
                    // Continue with local sync
                }
            }
        }
    }
    startRealtimeSync();
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        startRealtimeSync();
    } else {
        ensureAuthenticated();
    }
});

window.logoutPOS = function(e) {
    if (e) e.preventDefault();
    auth.signOut().then(() => {
        window.location.href = '/index.html';
    });
};

document.addEventListener('DOMContentLoaded', () => {
    ensureAuthenticated();
    const logoutBtns = document.querySelectorAll('.logout-btn-sidebar, .logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', window.logoutPOS);
    });
});

