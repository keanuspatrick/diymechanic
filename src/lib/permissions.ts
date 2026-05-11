// Permission helpers — uses Capacitor native plugins when available, browser APIs otherwise.
// Permissions are only requested at the moment a user actively taps a feature
// (per Apple Human Interface Guidelines & App Store Guideline 5.1.1).

import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

export async function requestMic(): Promise<MediaStream | null> {
  try {
    if (!navigator.mediaDevices?.getUserMedia) return null;
    return await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    console.warn("mic permission denied", e);
    return null;
  }
}

export async function requestCameraStream(): Promise<MediaStream | null> {
  try {
    if (!navigator.mediaDevices?.getUserMedia) return null;
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
  } catch (e) {
    console.warn("camera permission denied", e);
    return null;
  }
}

export function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Capture a photo. On iOS/Android (Capacitor) this uses the native Camera plugin
 * which prompts for NSCameraUsageDescription on first use. On web it returns null
 * so the caller can fall back to a hidden <input type="file" capture> element.
 *
 * IMPORTANT: must be invoked synchronously inside a user-gesture handler (tap),
 * otherwise iOS will block the camera launch.
 */
export async function captureNativePhoto(): Promise<string | null> {
  if (!isNative()) return null;
  try {
    const perms = await Camera.checkPermissions();
    if (perms.camera !== "granted") {
      const req = await Camera.requestPermissions({ permissions: ["camera"] });
      if (req.camera !== "granted") {
        return null;
      }
    }
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      saveToGallery: false,
      correctOrientation: true,
    });
    return photo.dataUrl ?? null;
  } catch (e) {
    console.warn("native camera failed", e);
    return null;
  }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  return btoa(binary);
}
