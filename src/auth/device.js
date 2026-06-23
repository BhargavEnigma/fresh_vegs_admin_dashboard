const DEVICE_ID_KEY = "freshveg_admin_device_id_v1";

let fallbackDeviceId;

function createDeviceId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getDeviceId() {
  try {
    const stored = localStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;

    const deviceId = createDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    return deviceId;
  } catch {
    fallbackDeviceId ||= createDeviceId();
    return fallbackDeviceId;
  }
}

export function getDeviceName() {
  if (typeof navigator === "undefined") return "Web browser";

  const platform = navigator.userAgentData?.platform || navigator.platform;
  return [platform, navigator.userAgent].filter(Boolean).join(" — ") || "Web browser";
}
