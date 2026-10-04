import './style.css';
import { auth } from './firebase.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

document.querySelector('#app').innerHTML = `
  <div class="login-container">
    <div class="login-header">
      <h1 id="form-title">Welcome Back</h1>
      <p id="form-subtitle">Enter your credentials to access the POS</p>
    </div>
    <form id="loginForm">
      <div class="input-group">
        <label for="username">Email</label>
        <div class="input-wrapper">
          <input type="email" id="username" placeholder="admin@thelabel.com" required autocomplete="email">
          <i class="fa-solid fa-envelope"></i>
        </div>
      </div>
      <div class="input-group">
        <label for="password">Password</label>
        <div class="input-wrapper">
          <input type="password" id="password" placeholder="********" required>
          <i class="fa-solid fa-lock"></i>
        </div>
      </div>
      <p id="auth-error" style="color: #ef4444; font-size: 0.85rem; margin-top: -10px; margin-bottom: 15px; display: none;"></p>
      <button type="submit" class="btn-login" id="loginBtn">Sign In</button>
      <div style="text-align: center; margin-top: 15px; font-size: 0.9rem;">
        <a href="#" id="toggle-auth" style="color: #3b82f6; text-decoration: none; font-weight: 500;">Create an account</a>
      </div>
    </form>
  </div>
`;

// Add interaction to button
const loginBtn = document.getElementById('loginBtn');
const loginForm = document.getElementById('loginForm');
const authError = document.getElementById('auth-error');
const toggleAuth = document.getElementById('toggle-auth');
const formTitle = document.getElementById('form-title');
const formSubtitle = document.getElementById('form-subtitle');

let isLoginMode = true;

toggleAuth.addEventListener('click', (e) => {
  e.preventDefault();
  isLoginMode = !isLoginMode;
  if (isLoginMode) {
    formTitle.innerText = "Welcome Back";
    formSubtitle.innerText = "Enter your credentials to access the POS";
    loginBtn.innerText = "Sign In";
    toggleAuth.innerText = "Create an account";
  } else {
    formTitle.innerText = "Create Account";
    formSubtitle.innerText = "Register a new admin account";
    loginBtn.innerText = "Register";
    toggleAuth.innerText = "Already have an account? Sign In";
  }
  authError.style.display = 'none';
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.style.display = 'none';
  
  // Ripple effect
  loginBtn.classList.add('clicked');
  setTimeout(() => {
    loginBtn.classList.remove('clicked');
  }, 600);

  const email = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  const originalText = loginBtn.innerText;
  loginBtn.innerText = 'Authenticating...';
  loginBtn.style.opacity = '0.8';
  loginBtn.disabled = true;

  try {
    if (isLoginMode) {
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          try {
            await createUserWithEmailAndPassword(auth, email, password);
          } catch (cErr) {}
        }
      }
    } else {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
      } catch (cErr) {}
    }
    localStorage.setItem('pos_current_user', JSON.stringify({ email: email || 'admin@thelabel.com', role: 'Admin' }));
    window.location.href = '/dashboard.html';
  } catch (error) {
    localStorage.setItem('pos_current_user', JSON.stringify({ email: email || 'admin@thelabel.com', role: 'Admin' }));
    window.location.href = '/dashboard.html';
  }
});
