/**
 * SecureAttend Client Device Fingerprint Generator
 * Generates a persistent, deterministic hardware fingerprint combining
 * browser hardware entropy (WebGL, Screen, Concurrency, Canvas) and
 * a secure hardware UUID stored in local persistence.
 */

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'nocanvas';
    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial'";
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('SecureAttendDeviceID,10.50.100.0', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('SecureAttendDeviceID,10.50.100.0', 4, 17);
    return canvas.toDataURL();
  } catch (_e) {
    return 'canvaserror';
  }
}

function getWebGLRenderer(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return 'nowebgl';
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 'nodebug';
    return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'generic';
  } catch (_e) {
    return 'webglerror';
  }
}

function fnv1aHash(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Returns a persistent UUID representing this physical device / browser installation.
 */
export function getPersistentDeviceUUID(): string {
  const STORAGE_KEY = 'secureattend_device_uuid';
  let uuid = localStorage.getItem(STORAGE_KEY);
  if (!uuid) {
    uuid = 'dev_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem(STORAGE_KEY, uuid);
  }
  return uuid;
}

/**
 * Computes a deterministic hardware composite device fingerprint.
 * @returns {string} E.g. "DEV_8fa01b4c92"
 */
export function getDeviceFingerprint(): string {
  const persistentUUID = getPersistentDeviceUUID();
  const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const cpuCores = navigator.hardwareConcurrency || 4;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const webGL = getWebGLRenderer();
  const canvasHash = fnv1aHash(getCanvasFingerprint());

  const rawFingerprint = [
    persistentUUID,
    screenInfo,
    cpuCores,
    timeZone,
    webGL,
    canvasHash,
  ].join('|');

  return `DEV_${fnv1aHash(rawFingerprint).toUpperCase()}`;
}
