export const INSTALL_ID_KEY = "clover_install_id";

export function getInstallId(): string {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return "server-render";
  }

  let installId = localStorage.getItem(INSTALL_ID_KEY);
  if (!installId) {
    installId = crypto.randomUUID();
    localStorage.setItem(INSTALL_ID_KEY, installId);
  }
  return installId;
}

export async function getInstallIdAsync(): Promise<string> {
  return getInstallId();
}
