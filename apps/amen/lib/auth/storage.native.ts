import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ENCRYPTION_KEY_NAME = "supabase_session_key";
const SESSION_STORAGE_KEY = "supabase_session_data";

export class LargeSecureStore {
  private aesKey: Uint8Array | null = null;

  private async getOrCreateKey(): Promise<Uint8Array> {
    if (this.aesKey) return this.aesKey;

    const existingKey = await SecureStore.getItemAsync(ENCRYPTION_KEY_NAME);
    if (existingKey) {
      this.aesKey = this.hexToBytes(existingKey);
      return this.aesKey;
    }

    const newKey = new Uint8Array(32);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(newKey);
    } else {
      require("react-native-get-random-values");
      crypto.getRandomValues(newKey);
    }

    await SecureStore.setItemAsync(ENCRYPTION_KEY_NAME, this.bytesToHex(newKey));
    this.aesKey = newKey;
    return newKey;
  }

  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  private async encrypt(plaintext: string): Promise<string> {
    const key = await this.getOrCreateKey();
    const aesJs = require("aes-js");

    const textBytes = aesJs.utils.utf8.toBytes(plaintext);
    const paddedLength = Math.ceil(textBytes.length / 16) * 16;
    const padded = new Uint8Array(paddedLength);
    padded.set(textBytes);

    const iv = new Uint8Array(16);
    crypto.getRandomValues(iv);

    const aesCbc = new aesJs.ModeOfOperation.cbc(key, iv);
    const encryptedBytes = aesCbc.encrypt(padded);

    const ivHex = this.bytesToHex(iv);
    const encryptedHex = this.bytesToHex(encryptedBytes);
    const lengthHex = textBytes.length.toString(16).padStart(8, "0");

    return `${ivHex}:${lengthHex}:${encryptedHex}`;
  }

  private async decrypt(ciphertext: string): Promise<string> {
    const key = await this.getOrCreateKey();
    const aesJs = require("aes-js");

    const [ivHex, lengthHex, encryptedHex] = ciphertext.split(":");
    if (!ivHex || !lengthHex || !encryptedHex) {
      throw new Error("Invalid ciphertext format");
    }

    const iv = this.hexToBytes(ivHex);
    const originalLength = parseInt(lengthHex, 16);
    const encryptedBytes = this.hexToBytes(encryptedHex);

    const aesCbc = new aesJs.ModeOfOperation.cbc(key, iv);
    const decryptedBytes = aesCbc.decrypt(encryptedBytes);

    const trimmed = decryptedBytes.slice(0, originalLength);
    return aesJs.utils.utf8.fromBytes(trimmed);
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const encrypted = await AsyncStorage.getItem(`${SESSION_STORAGE_KEY}_${key}`);
      if (!encrypted) return null;
      return await this.decrypt(encrypted);
    } catch (error) {
      console.warn("Failed to decrypt session data, clearing:", error);
      await this.removeItem(key);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      const encrypted = await this.encrypt(value);
      await AsyncStorage.setItem(`${SESSION_STORAGE_KEY}_${key}`, encrypted);
    } catch (error) {
      console.error("Failed to encrypt and store session:", error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(`${SESSION_STORAGE_KEY}_${key}`);
  }
}

export const largeSecureStore = new LargeSecureStore();
