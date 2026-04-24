import { normalizeEmail } from './authStorage.js';

const PROFILES_KEY = 'skilltojob_profiles';

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

function syncLegacyProfile(profile) {
  if (!profile) {
    localStorage.removeItem('userData');
    localStorage.removeItem('userSubmitted');
    return;
  }

  localStorage.setItem('userData', JSON.stringify(profile));
  localStorage.setItem('userSubmitted', 'true');
}

export function getStoredProfiles() {
  return readJson(PROFILES_KEY, {});
}

export function getStoredProfile(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const profiles = getStoredProfiles();
  const storedProfile = profiles[normalizedEmail];
  if (storedProfile) {
    syncLegacyProfile(storedProfile);
    return storedProfile;
  }

  const legacyProfile = readJson('userData', null);
  const submitted = localStorage.getItem('userSubmitted');

  if (legacyProfile && submitted === 'true') {
    const migrated = {
      ...legacyProfile,
      accountEmail: normalizeEmail(legacyProfile?.accountEmail || normalizedEmail),
    };

    saveStoredProfile(normalizedEmail, migrated);
    return migrated;
  }

  return null;
}

export function hasStoredProfile(email) {
  return Boolean(getStoredProfile(email));
}

export function saveStoredProfile(email, profile) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return;

  const profiles = getStoredProfiles();
  const nextProfile = {
    ...profile,
    accountEmail: normalizedEmail,
  };

  writeJson(PROFILES_KEY, {
    ...profiles,
    [normalizedEmail]: nextProfile,
  });

  syncLegacyProfile(nextProfile);
}

export function clearActiveProfileCache() {
  syncLegacyProfile(null);
}
