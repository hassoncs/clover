import AsyncStorage from "@react-native-async-storage/async-storage";
import { generateId } from "@/utils/id";

export const INSTALL_ID_KEY = "clover_install_id";

let cachedInstallId: string | null = null;

export function getInstallId(): string {
  if (cachedInstallId) return cachedInstallId;
  return `native-${Date.now()}`;
}

export async function getInstallIdAsync(): Promise<string> {
  if (cachedInstallId) return cachedInstallId;

  let installId = await AsyncStorage.getItem(INSTALL_ID_KEY);
  if (!installId) {
    installId = generateId();
    await AsyncStorage.setItem(INSTALL_ID_KEY, installId);
  }
  cachedInstallId = installId;
  return installId;
}

getInstallIdAsync();
