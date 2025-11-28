// UI state Redux slice

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number; // Auto-dismiss after this many milliseconds (default: 5000)
  dismissible?: boolean; // Can user manually dismiss? (default: true)
}

interface UiState {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  toasts: Toast[];
}

const initialState: UiState = {
  theme: 'dark',
  sidebarCollapsed: false,
  toasts: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
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

export const { toggleTheme, toggleSidebar, addToast, removeToast, clearAllToasts } = uiSlice.actions;
export default uiSlice.reducer;
