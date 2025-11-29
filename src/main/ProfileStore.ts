// ProfileStore - manages DuckDB profile persistence

import { app } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import type { DuckDBProfile, DuckDBProfileInput, DuckDBProfileUpdate } from '../shared/types';

export class ProfileStore {
  private profilesPath: string;
  private profiles: DuckDBProfile[] = [];
  private loaded = false;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.profilesPath = path.join(userDataPath, 'profiles.json');
  }

  async loadProfiles(): Promise<DuckDBProfile[]> {
    if (this.loaded) {
      return this.profiles;
    }

    try {
      const data = await fs.readFile(this.profilesPath, 'utf-8');
      this.profiles = JSON.parse(data);
      this.loaded = true;
      console.log(`Loaded ${this.profiles.length} profiles from ${this.profilesPath}`);
    } catch (error) {
      // If file doesn't exist, start with empty array
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.profiles = [];
        this.loaded = true;
        console.log('No profiles file found, starting with empty list');
      } else {
        console.error('Failed to load profiles:', error);
        throw error;
      }
    }

    return this.profiles;
  }

  async saveProfiles(profiles: DuckDBProfile[]): Promise<void> {
    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.profilesPath), { recursive: true });

      // Write atomically via temp file
      const tempPath = `${this.profilesPath}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(profiles, null, 2), 'utf-8');
      await fs.rename(tempPath, this.profilesPath);

      this.profiles = profiles;
      console.log(`Saved ${profiles.length} profiles to ${this.profilesPath}`);
    } catch (error) {
      console.error('Failed to save profiles:', error);
      throw error;
    }
  }

  async createProfile(input: DuckDBProfileInput): Promise<DuckDBProfile> {
    await this.loadProfiles();

    const now = new Date().toISOString();
    const profile: DuckDBProfile = {
      id: randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };

    this.profiles.push(profile);
    await this.saveProfiles(this.profiles);

    return profile;
  }

  async updateProfile(id: string, update: DuckDBProfileUpdate): Promise<DuckDBProfile> {
    await this.loadProfiles();

    const index = this.profiles.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Connection not found: ${id}`);
    }

    const updatedProfile: DuckDBProfile = {
      ...this.profiles[index],
      ...update,
      updatedAt: new Date().toISOString(),
    };

    this.profiles[index] = updatedProfile;
    await this.saveProfiles(this.profiles);

    return updatedProfile;
  }

  async deleteProfile(id: string): Promise<void> {
    await this.loadProfiles();

    const index = this.profiles.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error(`Connection not found: ${id}`);
    }

    this.profiles.splice(index, 1);
    await this.saveProfiles(this.profiles);
  }

  async getProfile(id: string): Promise<DuckDBProfile | undefined> {
    await this.loadProfiles();
    return this.profiles.find((p) => p.id === id);
  }
}
