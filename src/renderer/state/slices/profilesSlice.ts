// Profiles Redux slice

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { DuckDBProfile, DuckDBProfileInput, DuckDBProfileUpdate } from '@shared/types';

interface ProfilesState {
  list: DuckDBProfile[];
  activeProfileId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProfilesState = {
  list: [],
  activeProfileId: null,
  loading: false,
  error: null,
};

// Async thunks
export const loadProfiles = createAsyncThunk('profiles/load', async () => {
  return await window.orbitalDb.profiles.list();
});

export const createProfile = createAsyncThunk(
  'profiles/create',
  async (input: DuckDBProfileInput) => {
    return await window.orbitalDb.profiles.create(input);
  }
);

export const updateProfile = createAsyncThunk(
  'profiles/update',
  async ({ id, update }: { id: string; update: DuckDBProfileUpdate }) => {
    return await window.orbitalDb.profiles.update(id, update);
  }
);

export const deleteProfile = createAsyncThunk('profiles/delete', async (id: string) => {
  await window.orbitalDb.profiles.delete(id);
  return id;
});

export const openConnection = createAsyncThunk(
  'profiles/openConnection',
  async (profileId: string) => {
    await window.orbitalDb.connection.open(profileId);
    return profileId;
  }
);

export const closeConnection = createAsyncThunk(
  'profiles/closeConnection',
  async (profileId: string) => {
    await window.orbitalDb.connection.close(profileId);
    return profileId;
  }
);

const profilesSlice = createSlice({
  name: 'profiles',
  initialState,
  reducers: {
    setActiveProfile: (state, action: PayloadAction<string | null>) => {
      state.activeProfileId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Load profiles
      .addCase(loadProfiles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadProfiles.fulfilled, (state, action) => {
        state.list = action.payload;
        state.loading = false;
      })
      .addCase(loadProfiles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load profiles';
      })
      // Create profile
      .addCase(createProfile.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      // Update profile
      .addCase(updateProfile.fulfilled, (state, action) => {
        const index = state.list.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
      })
      // Delete profile
      .addCase(deleteProfile.fulfilled, (state, action) => {
        state.list = state.list.filter((p) => p.id !== action.payload);
        if (state.activeProfileId === action.payload) {
          state.activeProfileId = null;
        }
      })
      // Open connection
      .addCase(openConnection.fulfilled, (state, action) => {
        state.activeProfileId = action.payload;
      });
  },
});

export const { setActiveProfile } = profilesSlice.actions;
export default profilesSlice.reducer;
