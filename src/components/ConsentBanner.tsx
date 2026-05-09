import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getConsent, setConsent } from "@/lib/analytics";

export default function ConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (getConsent() === null) {
      const t = setTimeout(() => setShow(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  if (!show) return null;

  const decide = (state: "granted" | "denied") => {
    setConsent(state);
    setShow(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Privacy consent"
      className="fixed inset-x-0 bottom-0 z-[60] pb-safe pl-safe pr-safe"
    >
      <div className="mx-auto max-w-2xl m-3 rounded-2xl border border-border bg-card p-4 shadow-deep">
        <div className="font-display text-base uppercase tracking-wide">Privacy choice</div>
        <p className="mt-1.5 text-sm text-muted-foreground">
          We use Google Analytics to understand which features help DIYers most. No personal data,
          no ads, no selling. You can change this anytime in{" "}
          <Link to="/privacy" className="underline text-primary">Privacy</Link>.
        </p>
        <div className="mt-3 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => decide("denied")}>
            Decline
          </Button>
          <Button className="flex-1 gradient-primary text-primary-foreground" onClick={() => decide("granted")}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
