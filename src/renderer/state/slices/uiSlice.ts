// UI state Redux slice

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number; // Auto-dismiss after this many milliseconds (default: 5000)
  dismissible?: boolean; // Can user manually dismiss? (default: true)
}

export interface AppSettings {
  // Appearance
  themeMode: 'light' | 'dark' | 'auto';

  // Editor Preferences
  editorFontSize: number;
  editorShowLineNumbers: boolean;

  // Startup Behavior
  reopenLastProfile: boolean;
  lastOpenedProfileId: string | null;
}

interface UiState {
  theme: 'light' | 'dark'; // Resolved theme (computed from themeMode)
  sidebarCollapsed: boolean;
  toasts: Toast[];
  settings: AppSettings;
}

const defaultSettings: AppSettings = {
  themeMode: 'auto',
  editorFontSize: 14,
  editorShowLineNumbers: true,
  reopenLastProfile: false,
  lastOpenedProfileId: null,
};

// Load settings from localStorage
const loadSettings = (): AppSettings => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return defaultSettings;
  }
  try {
    const stored = localStorage.getItem('orbital-db-settings');
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
  return defaultSettings;
};

// Detect system theme
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
};

// Resolve theme based on mode
const resolveTheme = (themeMode: 'light' | 'dark' | 'auto'): 'light' | 'dark' => {
  if (themeMode === 'auto') {
    return getSystemTheme();
  }
  return themeMode;
};

const loadedSettings = loadSettings();

const initialState: UiState = {
  theme: resolveTheme(loadedSettings.themeMode),
  sidebarCollapsed: false,
  toasts: [],
  settings: loadedSettings,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      // Legacy toggle - cycles through auto -> light -> dark -> auto
      if (state.settings.themeMode === 'auto') {
        state.settings.themeMode = 'light';
      } else if (state.settings.themeMode === 'light') {
        state.settings.themeMode = 'dark';
      } else {
        state.settings.themeMode = 'auto';
      }
      state.theme = resolveTheme(state.settings.themeMode);
      localStorage.setItem('orbital-db-settings', JSON.stringify(state.settings));
    },
    setThemeMode: (state, action: PayloadAction<'light' | 'dark' | 'auto'>) => {
      state.settings.themeMode = action.payload;
      state.theme = resolveTheme(action.payload);
      localStorage.setItem('orbital-db-settings', JSON.stringify(state.settings));
    },
    updateSettings: (state, action: PayloadAction<Partial<AppSettings>>) => {
      state.settings = { ...state.settings, ...action.payload };
      // Resolve theme if themeMode changed
      if (action.payload.themeMode) {
        state.theme = resolveTheme(action.payload.themeMode);
      }
      localStorage.setItem('orbital-db-settings', JSON.stringify(state.settings));
    },
    resetSettings: (state) => {
      state.settings = defaultSettings;
      state.theme = resolveTheme(defaultSettings.themeMode);
      localStorage.setItem('orbital-db-settings', JSON.stringify(state.settings));
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    addToast: (state, action: PayloadAction<Omit<Toast, 'id'>>) => {
      const toast: Toast = {
        ...action.payload,
        id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        duration: action.payload.duration ?? 5000,
        dismissible: action.payload.dismissible ?? true,
      };
      state.toasts.push(toast);
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    clearAllToasts: (state) => {
      state.toasts = [];
    },
  },
});

export const {
  toggleTheme,
  setThemeMode,
  updateSettings,
  resetSettings,
  toggleSidebar,
  addToast,
  removeToast,
  clearAllToasts
} = uiSlice.actions;

export default uiSlice.reducer;
