import { uuid } from "expo";
export function operationKey() {
  // Browsers on the local network can expose getRandomValues without randomUUID.
  if (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    typeof globalThis.crypto?.randomUUID !== "function"
  ) {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, (n) => n.toString(16).padStart(2, "0")).join(
      "",
    );
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20),
    ].join("-");
  }
  return uuid.v4();
}
