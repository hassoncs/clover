/**
 * Cross-platform storage utility for non-sensitive data
 * 
 * Uses:
 * - Web: localStorage
 * - Native: AsyncStorage
 * 
 * For sensitive data (auth tokens, credentials), use lib/auth/storage instead.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

class WebStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`Failed to get item from localStorage:`, error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`Failed to set item in localStorage:`, error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove item from localStorage:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      console.error(`Failed to clear localStorage:`, error);
    }
  }
}

class NativeStorageAdapter implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn(`Failed to get item from AsyncStorage:`, error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`Failed to set item in AsyncStorage:`, error);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove item from AsyncStorage:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error(`Failed to clear AsyncStorage:`, error);
    }
  }
}

const adapter: StorageAdapter = Platform.OS === 'web' 
  ? new WebStorageAdapter() 
  : new NativeStorageAdapter();

export const storage = adapter;

/**
 * Type-safe storage helpers for JSON data
 */
export async function getStorageItem<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const stored = await storage.getItem(key);
    if (stored === null) return defaultValue;
    return JSON.parse(stored) as T;
  } catch (error) {
    console.warn(`Failed to parse storage item ${key}:`, error);
    return defaultValue;
  }
}

export async function setStorageItem<T>(key: string, value: T): Promise<void> {
  try {
    await storage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save storage item ${key}:`, error);
  }
}

export async function removeStorageItem(key: string): Promise<void> {
  await storage.removeItem(key);
}
