// UI state Redux slice

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
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
      state.toasts.push({
        ...action.payload,
        id: Date.now().toString(),
      });
    },
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const { toggleTheme, toggleSidebar, addToast, removeToast } = uiSlice.actions;
export default uiSlice.reducer;
