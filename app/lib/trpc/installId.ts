export const INSTALL_ID_KEY = "clover_install_id";

export function getInstallId(): string {
  throw new Error("getInstallId must be called from platform-specific module");
}

export function getInstallIdAsync(): Promise<string> {
  throw new Error("getInstallIdAsync must be called from platform-specific module");
}
