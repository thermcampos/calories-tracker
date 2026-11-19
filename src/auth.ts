import { getDivById } from "./utils/domUtils";

export function showAuthForms() {
  getDivById('auth-buttons').classList.remove('hidden');
  getDivById('user-info').classList.add('hidden');
  getDivById('app-content').classList.add('hidden');
  getDivById('landing-page').classList.remove('hidden');
}

export function hideAuthForms() {
  getDivById('auth-buttons').classList.add('hidden');
  getDivById('auth-modal').classList.add('hidden');
  getDivById('landing-page').classList.add('hidden');
}

export function openAuthModal() {
  getDivById('auth-modal').classList.remove('hidden');
}

export function closeAuthModal() {
  getDivById('auth-modal').classList.add('hidden');
}

export function toggleAuthForms() {
  document.getElementById('login-form')?.classList.toggle('hidden');
  document.getElementById('register-form')?.classList.toggle('hidden');

  const logForm = document.getElementById('loginForm') as HTMLFormElement;
  logForm.reset();

  const resetForm = document.getElementById('registerForm') as HTMLFormElement;
  resetForm.reset();
}

export function showRegisterForm() {
  document.getElementById('login-form')?.classList.add('hidden');
  document.getElementById('register-form')?.classList.remove('hidden');

  const resetForm = document.getElementById('registerForm') as HTMLFormElement;
  resetForm.reset();

  openAuthModal();
}

export function showLoginForm() {
  document.getElementById('login-form')?.classList.remove('hidden');
  document.getElementById('register-form')?.classList.add('hidden');

  const logForm = document.getElementById('loginForm') as HTMLFormElement;
  logForm.reset();

  openAuthModal();
}
