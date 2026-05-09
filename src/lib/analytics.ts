// GA4 + Consent Mode v2 wrapper. App Store / GDPR / CPRA compliant.
// All tracking is denied by default until the user grants consent.

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

const MEASUREMENT_ID = (import.meta.env.VITE_GA4_MEASUREMENT_ID as string) || "G-XXXXXXXXXX";
const CONSENT_KEY = "diy_consent_v1";

type ConsentState = "granted" | "denied";

export function getConsent(): ConsentState | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(state: ConsentState) {
  try { localStorage.setItem(CONSENT_KEY, state); } catch { /* ignore */ }
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("consent", "update", {
    ad_storage: state,
    ad_user_data: state,
    ad_personalization: state,
    analytics_storage: state,
    functionality_storage: state,
    personalization_storage: state,
    security_storage: "granted",
  });
}

function captureUtm() {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"].forEach((k) => {
      const v = params.get(k);
      if (v) utm[k] = v;
    });
    if (Object.keys(utm).length) {
      sessionStorage.setItem("utm", JSON.stringify(utm));
    }
    return utm;
  } catch { return {}; }
}

function deviceClass() {
  const ua = navigator.userAgent;
  return {
    screen_width: window.screen.width,
    screen_height: window.screen.height,
    dpr: window.devicePixelRatio,
    platform: /iPhone|iPad|iPod/.test(ua) ? "ios" : /Android/.test(ua) ? "android" : "web",
    ua_model: ua,
  };
}

let initialized = false;

export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };

  // Default: DENY everything until consent (Consent Mode v2 — required since March 2024).
  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "denied",
    personalization_storage: "denied",
    security_storage: "granted",
    wait_for_update: 500,
  });

  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID, {
    anonymize_ip: true,
    send_page_view: false, // we send screen_view manually on route changes
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });

  // Inject GA tag
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(s);

  const utm = captureUtm();
  const dev = deviceClass();
  window.gtag("set", "user_properties", { ...dev });
  if (Object.keys(utm).length) {
    window.gtag("event", "campaign_attribution", utm);
  }

  // Re-apply stored consent on load
  const stored = getConsent();
  if (stored) setConsent(stored);
}

export function track(event: string, params: Record<string, any> = {}) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", event, params);
}

export function trackScreen(path: string, title?: string) {
  track("screen_view", { screen_name: path, page_path: path, page_title: title || document.title });
}

// Funnel helpers
export const funnel = {
  vehicleSelected: (v: { year: string; make: string; model: string }) =>
    track("vehicle_selected", { year: v.year, make: v.make, model: v.model }),
  taskStarted: (task: string) => track("task_started", { task }),
  guideViewed: (task: string) => track("guide_viewed", { task }),
  chatOpened: () => track("ai_chat_opened"),
  photoAnalyzed: (ok: boolean) => track("photo_analyzed", { success: ok }),
  soundAnalyzed: (ok: boolean) => track("sound_analyzed", { success: ok }),
  guideCompleted: (task: string) => track("guide_completed", { task }),
  purchase: (value: number, currency = "USD", items: any[] = []) =>
    track("purchase", { value, currency, items }),
};
