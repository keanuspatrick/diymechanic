import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Edge-swipe-back gesture, similar to iOS.
 * Triggers navigate(-1) when the user starts a touch within `edgeSize` px of
 * the left screen edge and drags right by at least `threshold` px (mostly
 * horizontal). Safe on desktop — only attaches touch listeners.
 */
export function useSwipeBack(opts?: {
  enabled?: boolean;
  edgeSize?: number;
  threshold?: number;
}) {
  const navigate = useNavigate();
  const enabled = opts?.enabled ?? true;
  const edgeSize = opts?.edgeSize ?? 28;
  const threshold = opts?.threshold ?? 70;

  useEffect(() => {
    if (!enabled) return;
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      if (t.clientX <= edgeSize) {
        tracking = true;
        startX = t.clientX;
        startY = t.clientY;
      } else {
        tracking = false;
      }
    };

    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (dx >= threshold && dx > dy * 1.5) {
        navigate(-1);
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [enabled, edgeSize, threshold, navigate]);
}
