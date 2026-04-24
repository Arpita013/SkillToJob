import { fetchApi } from './apiClient.js';

const AUTH_USERS_KEY = 'skilltojob_auth_users';
const CURRENT_AUTH_KEY = 'skilltojob_current_auth';
const AUTH_API_BASE = '/api/user/auth';

function readJson(key, fallbackValue) {
  const stored = localStorage.getItem(key);
  if (!stored) return fallbackValue;

  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error(`Failed to parse storage key "${key}":`, error);
    return fallbackValue;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function getRegisteredUsers() {
  return readJson(AUTH_USERS_KEY, []);
}

export function getCurrentAuthUser() {
  return readJson(CURRENT_AUTH_KEY, null);
}

export function setCurrentAuthUser(user) {
  if (!user?.email) return;

  writeJson(CURRENT_AUTH_KEY, {
    email: normalizeEmail(user.email),
    createdAt: user.createdAt || new Date().toISOString(),
  });
}

export function clearCurrentAuthUser() {
  localStorage.removeItem(CURRENT_AUTH_KEY);
}

async function hashPassword(password) {
  const encoded = new TextEncoder().encode(String(password || ''));
  const buffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function requestAuth(path, payload, fallbackMessage) {
  const response = await fetchApi(`${AUTH_API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(String(data?.message || fallbackMessage));
    error.status = response.status;
    throw error;
  }

  return data;
}

function shouldUseLocalAuthFallback(error, { allowMissingAccount = false } = {}) {
  if (error instanceof TypeError) {
    return true;
  }

  if (error?.status >= 500) {
    return true;
  }

  if (error?.status === 404) {
    return allowMissingAccount || /not found/i.test(String(error?.message || ''));
  }

  return false;
}

async function saveRegisteredUserLocally({ email, password, createdAt }) {
  const normalizedEmail = normalizeEmail(email);
  const users = getRegisteredUsers();
  const passwordHash = await hashPassword(password);
  const nextUser = {
    email: normalizedEmail,
    passwordHash,
    createdAt: createdAt || new Date().toISOString(),
  };

  const nextUsers = [
    ...users.filter((user) => normalizeEmail(user.email) !== normalizedEmail),
    nextUser,
  ];

  writeJson(AUTH_USERS_KEY, nextUsers);
  return nextUser;
}

export function findRegisteredUser(email) {
  const normalizedEmail = normalizeEmail(email);
  return getRegisteredUsers().find((user) => normalizeEmail(user.email) === normalizedEmail) || null;
}

export async function registerAuthUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email);

  try {
    const data = await requestAuth(
      '/register',
      { email: normalizedEmail, password },
      'Could not create account.',
    );

    const nextUser = {
      email: normalizeEmail(data?.user?.email || normalizedEmail),
      createdAt: data?.user?.createdAt || new Date().toISOString(),
    };

    await saveRegisteredUserLocally({
      email: nextUser.email,
      password,
      createdAt: nextUser.createdAt,
    });

    setCurrentAuthUser(nextUser);
    return nextUser;
  } catch (error) {
    if (!shouldUseLocalAuthFallback(error)) {
      throw error;
    }

    const existing = findRegisteredUser(normalizedEmail);

    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    const nextUser = await saveRegisteredUserLocally({
      email: normalizedEmail,
      password,
      createdAt: new Date().toISOString(),
    });

    setCurrentAuthUser(nextUser);
    return nextUser;
  }
}

export async function authenticateAuthUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email);

  try {
    const data = await requestAuth(
      '/login',
      { email: normalizedEmail, password },
      'Could not login.',
    );

    const nextUser = {
      email: normalizeEmail(data?.user?.email || normalizedEmail),
      createdAt: data?.user?.createdAt || new Date().toISOString(),
    };

    setCurrentAuthUser(nextUser);
    return nextUser;
  } catch (error) {
    if (!shouldUseLocalAuthFallback(error, { allowMissingAccount: true })) {
      throw error;
    }

    const existing = findRegisteredUser(normalizedEmail);

    if (!existing) {
      throw new Error('No account found for this email.');
    }

    const passwordHash = await hashPassword(password);
    if (passwordHash !== existing.passwordHash) {
      throw new Error('Incorrect password.');
    }

    setCurrentAuthUser(existing);
    return existing;
  }
}
