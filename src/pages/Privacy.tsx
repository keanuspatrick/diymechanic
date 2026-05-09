import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TopBar from "@/components/TopBar";
import { Switch } from "@/components/ui/switch";
import { getConsent, setConsent } from "@/lib/analytics";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Privacy() {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    setGranted(getConsent() === "granted");
  }, []);

  const toggle = (v: boolean) => {
    setGranted(v);
    setConsent(v ? "granted" : "denied");
  };

  return (
    <div className="min-h-screen-safe bg-background">
      <TopBar />
      <main className="mx-auto max-w-2xl px-5 pb-24 pt-4 pl-safe pr-safe">
        <Link to="/dashboard">
          <Button variant="ghost" className="mb-3 -ml-2 text-muted-foreground">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
        </Link>
        <h1 className="font-display text-3xl uppercase tracking-wide">Privacy</h1>
        <p className="mt-2 text-muted-foreground">
          Your trust matters. Here's exactly what DIYMechanic collects and how to control it.
        </p>

        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold">Analytics</div>
              <div className="text-sm text-muted-foreground">
                Anonymous usage stats (Google Analytics 4). No ads, no selling.
              </div>
            </div>
            <Switch checked={granted} onCheckedChange={toggle} aria-label="Toggle analytics" />
          </div>
        </div>

        <h2 className="mt-8 font-display text-xl uppercase tracking-wide">What we collect</h2>
        <ul className="mt-2 space-y-2 text-sm">
          <li>• Screen views and feature taps (e.g. chat opened, photo analyzed)</li>
          <li>• Coarse country/region from IP (no precise location)</li>
          <li>• Device class: model family, OS version, screen size</li>
          <li>• Acquisition source: UTM tags, referrer, install source</li>
          <li>• Camera & microphone are used <strong>only</strong> when you tap them, and audio/photo are sent to our AI then discarded.</li>
        </ul>

        <h2 className="mt-6 font-display text-xl uppercase tracking-wide">What we don't do</h2>
        <ul className="mt-2 space-y-2 text-sm">
          <li>• No precise GPS, no IMEI, no contact list</li>
          <li>• No selling or sharing data with brokers</li>
          <li>• No cross-app tracking unless you explicitly allow it (iOS ATT)</li>
        </ul>

        <p className="mt-8 text-xs text-muted-foreground">
          Questions? Contact privacy@diymechanic.app
        </p>
      </main>
    </div>
  );
}
