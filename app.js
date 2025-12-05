/* app.js - Firebase + UI for neon theme (Style B)
   Instructions: Replace firebaseConfig with your project's values.
*/

const API = {}; // placeholder if you want to later add server

// ---- Firebase init (modular SDK via CDN imports) ----
// We will load Firebase modules dynamically inside functions.
// You MUST replace the config with your project's config.
const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_AUTH_DOMAIN",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket: "REPLACE_WITH_YOUR_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_YOUR_MESSAGING_ID",
  appId: "REPLACE_WITH_YOUR_APP_ID"
};

// expose firebase objects after initialization
window._FB = { app: null, auth: null, db: null, storage: null };

// async init function
async function initFirebase() {
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js');
  const { getAuth } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js');
  const { getFirestore } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js');
  const { getStorage } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js');

  window._FB.app = initializeApp(firebaseConfig);
  window._FB.auth = getAuth(window._FB.app);
  window._FB.db = getFirestore(window._FB.app);
  window._FB.storage = getStorage(window._FB.app);
}

// call init early
initFirebase().catch(e => console.warn('Firebase init failed — replace config?', e));

/* ===== UI: theme toggle, modal, small helpers ===== */
document.addEventListener('DOMContentLoaded', () => {
  // theme toggle (neon effect)
  document.querySelectorAll('[data-toggle-theme]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.body.classList.toggle('dark-force');
      btn.classList.toggle('active');
    });
  });

  // gallery modal
  const modal = document.querySelector('.modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('modal-close')) modal.classList.remove('open');
    });
  }

  // attach default behaviors (login/signup) if forms exist
  attachAuthForms();
  attachGallery();
  attachEventsForm();
  onAuthStateUI();
});

/* ======= AUTH UI and Firebase wiring ======= */
function attachAuthForms(){
  // SIGNUP
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      try {
        const { createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js');
        const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js');

        const auth = window._FB.auth;
        const db = window._FB.db;
        if (!auth) throw new Error('Firebase not initialized');

        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        // update profile displayName
        if (name) {
          try { await updateProfile(userCred.user, { displayName: name }); } catch(e){}
        }
        // store profile in Firestore
        await setDoc(doc(db, 'users', userCred.user.uid), {
          uid: userCred.user.uid,
          name: name || '',
          email: email,
          createdAt: new Date().toISOString(),
          role: 'member'
        });
        window.location.href = 'success.html';
      } catch (err) {
        console.error(err);
        alert('Sign up failed: ' + (err.message || err));
      }
    });
  }

  // LOGIN
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      try {
        const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js');
        const auth = window._FB.auth;
        if (!auth) throw new Error('Firebase not initialized');
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = 'home.html';
      } catch (err) {
        console.error(err);
        alert('Sign in failed: ' + (err.message || err));
      }
    });
  }

  // LOGOUT (elements with data-logout)
  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        const { signOut } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js');
        await signOut(window._FB.auth);
        window.location.href = 'login.html';
      } catch (e) { console.warn(e); }
    });
  });
}

/* show simple user info on pages */
async function onAuthStateUI(){
  try {
    const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js');
    const auth = window._FB.auth;
    if (!auth) return;
    onAuthStateChanged(auth, async (user) => {
      const els = document.querySelectorAll('[data-user-name]');
      if (user) {
        // try to fetch user's profile from firestore
        try {
          const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js');
          const db = window._FB.db;
          const snap = await getDoc(doc(db, 'users', user.uid));
          const data = snap.exists() ? snap.data() : {};
          els.forEach(el => el.textContent = data.name || user.displayName || user.email);
        } catch (e) {
          els.forEach(el => el.textContent = user.displayName || user.email);
        }
      } else {
        els.forEach(el => el.textContent = '');
      }
    });
  } catch(e) { console.warn('onAuthStateUI err', e); }
}

/* ===== EVENTS: load + add to firestore ===== */
function attachEventsForm(){
  const evForm = document.getElementById('add-event-form');
  if (!evForm) return;
  evForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js');
      const db = window._FB.db;
      await addDoc(collection(db, 'events'), {
        title: e.target.title.value || 'New Event',
        date: e.target.date.value || '',
        desc: e.target.desc.value || '',
        createdAt: new Date()
      });
      e.target.reset();
      loadEvents();
    } catch (err) {
      console.error(err);
      alert('Failed to add event: ' + (err.message || err));
    }
  });
}

async function loadEvents(){
  const grid = document.querySelector('.events-grid');
  if (!grid) return;
  try {
    const { collection, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js');
    const db = window._FB.db;
    const snaps = await getDocs(query(collection(db,'events'), orderBy('createdAt','desc')));
    grid.innerHTML = '';
    snaps.forEach(snap => {
      const d = snap.data();
      const card = document.createElement('div'); card.className = 'event-card fade';
      card.innerHTML = `<div class="event-title">${d.title}</div>
                        <div class="event-meta">${d.date || ''}</div>
                        <p style="margin-top:8px;color:var(--muted)">${d.desc || ''}</p>`;
      grid.appendChild(card);
    });
  } catch (e) { console.warn('loadEvents', e); }
}
setTimeout(loadEvents, 1200); // delay to allow firebase init

/* ===== GALLERY: upload to Storage + store metadata in Firestore ===== */
function attachGallery(){
  const uploadForm = document.getElementById('upload-form');
  const galleryList = document.getElementById('gallery-list');
  if (!uploadForm || !galleryList) return;

  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = document.getElementById('image-file').files[0];
    if (!file) return alert('Select an image');
    try {
      // upload to storage
      const { ref, uploadBytes, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-storage.js');
      const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js');
      const storage = window._FB.storage;
      const db = window._FB.db;
      const fileRef = ref(storage, `gallery/${Date.now()}_${file.name}`);
      const snap = await uploadBytes(fileRef, file);
      const url = await getDownloadURL(snap.ref);
      await addDoc(collection(db,'gallery'), { url, name: file.name, createdAt: new Date() });
      uploadForm.reset();
      loadGallery();
    } catch(e) { console.error(e); alert('Upload failed: '+(e.message||e)); }
  });
}

async function loadGallery(){
  const grid = document.getElementById('gallery-list');
  if (!grid) return;
  try {
    const { collection, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js');
    const db = window._FB.db;
    const snaps = await getDocs(query(collection(db,'gallery'), orderBy('createdAt','desc')));
    grid.innerHTML = '';
    snaps.forEach(snap => {
      const d = snap.data();
      const div = document.createElement('div'); div.className = 'thumb fade';
      div.innerHTML = `<img src="${d.url}" alt="${d.name}">`;
      div.addEventListener('click', () => {
        const modal = document.querySelector('.modal');
        modal.querySelector('img').src = d.url;
        modal.classList.add('open');
      });
      grid.appendChild(div);
    });
  } catch (e) { console.warn('loadGallery', e); }
}
setTimeout(loadGallery, 1200);

/* ===== PROFILE: load user profile ===== */
async function loadProfile(){
  const elName = document.getElementById('profile-name');
  const elEmail = document.getElementById('profile-email');
  if (!elName || !elEmail) return;
  try {
    const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js');
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js');
    const auth = window._FB.auth;
    onAuthStateChanged(auth, async (user) => {
      if (!user) { window.location.href = 'login.html'; return; }
      const db = window._FB.db;
      const snap = await getDoc(doc(db,'users', user.uid));
      const data = snap.exists() ? snap.data() : {};
      elName.textContent = data.name || user.displayName || 'Member';
      elEmail.textContent = data.email || user.email;
    });
  } catch(e){ console.warn('loadProfile', e); }
}
setTimeout(loadProfile, 600);

/* ===== ADMIN: load members for admin.html ===== */
async function loadMembers(){
  const table = document.getElementById('members-table');
  if (!table) return;
  try {
    const { collection, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js');
    const db = window._FB.db;
    const snaps = await getDocs(query(collection(db,'users'), orderBy('createdAt','desc')));
    const tbody = table.querySelector('tbody');
    tbody.innerHTML = '';
    snaps.forEach(snap => {
      const d = snap.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${d.name||''}</td><td>${d.email||''}</td><td>${new Date(d.createdAt).toLocaleDateString()}</td>
      <td class="status">${d.role||'member'}</td>
      <td><button class="btn btn-primary btn-approve">Promote</button> <button class="btn btn-ghost btn-remove">Remove</button></td>`;
      tbody.appendChild(tr);
    });

    // wire approve / remove (client-side only)
    tbody.querySelectorAll('.btn-approve').forEach(b=>{
      b.addEventListener('click', (e)=>{
        const row = e.target.closest('tr');
        row.querySelector('.status').textContent = 'admin';
        e.target.disabled = true;
      });
    });
    tbody.querySelectorAll('.btn-remove').forEach(b=>{
      b.addEventListener('click', (e)=>{
        const row = e.target.closest('tr');
        row.style.opacity = 0; setTimeout(()=>row.remove(), 180);
      });
    });
  } catch(e){ console.warn('loadMembers', e); }
}
setTimeout(loadMembers, 900);

/* ===== small helpers for page guards ===== */
async function authGuard(){
  // pages that must be protected
  const protectedPaths = ['home.html','profile.html','admin.html','events.html','gallery.html','contact.html'];
  const path = window.location.pathname.split('/').pop();
  if (!protectedPaths.includes(path)) return;
  try {
    const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js');
    const auth = window._FB.auth;
    if (!auth) return;
    onAuthStateChanged(auth, (user)=> {
      if (!user) window.location.href = 'login.html';
    });
  } catch(e){ console.warn(e); }
}
setTimeout(authGuard, 800);

/* Expose some functions for debugging */
window._app = {
  loadEvents, loadGallery, loadProfile, loadMembers
};
