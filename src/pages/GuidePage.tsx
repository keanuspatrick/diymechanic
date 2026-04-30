import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useVehicle } from "@/store/vehicle";
import TopBar from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, Wrench, Clock, DollarSign, AlertTriangle, Package,
  CheckCircle2, Lightbulb, Loader2,
} from "lucide-react";
import { toast } from "sonner";

type Step = { title: string; details: string[]; tip?: string };
type Guide = {
  title: string;
  difficulty: string;
  time_estimate: string;
  shop_cost_usd: string;
  diy_cost_usd: string;
  savings_usd: string;
  tools_needed: string[];
  parts_needed: string[];
  safety_warnings: string[];
  steps: Step[];
};

export default function GuidePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const task = params.get("task") || "";
  const vehicle = useVehicle((s) => s.vehicle);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vehicle) {
      navigate("/", { replace: true });
      return;
    }
    if (!task) {
      navigate("/dashboard", { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("vehicle-guide", {
        body: { vehicle, task },
      });
      if (cancelled) return;
      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Could not generate guide");
        setLoading(false);
        return;
      }
      setGuide(data.guide);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [task, vehicle, navigate]);

  return (
    <div className="min-h-screen-safe bg-background">
      <TopBar />
      <main className="mx-auto max-w-3xl px-5 px-safe pb-[max(8rem,calc(env(safe-area-inset-bottom)+6rem))] pt-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4 -ml-2 text-muted-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 font-display text-lg uppercase tracking-wide">
              Building your guide…
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tailoring steps for your {vehicle?.year} {vehicle?.make} {vehicle?.model}
            </p>
          </div>
        )}

        {!loading && guide && (
          <>
            <div className="text-xs font-bold uppercase tracking-widest text-primary">
              {vehicle?.year} {vehicle?.make} {vehicle?.model}
            </div>
            <h1 className="mt-1 font-display text-3xl leading-tight sm:text-4xl">
              {guide.title}
            </h1>

            {/* Cheat sheet */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat icon={<Wrench className="h-4 w-4" />} label="Difficulty" value={guide.difficulty} />
              <Stat icon={<Clock className="h-4 w-4" />} label="Time" value={guide.time_estimate} />
              <Stat icon={<DollarSign className="h-4 w-4" />} label="Shop cost" value={guide.shop_cost_usd} />
              <Stat
                icon={<DollarSign className="h-4 w-4" />}
                label="You save"
                value={guide.savings_usd}
                highlight
              />
            </div>

            {guide.safety_warnings.length > 0 && (
              <Card className="mt-5 border-destructive/40 bg-destructive/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 font-bold text-destructive">
                    <AlertTriangle className="h-5 w-5" /> Safety first
                  </div>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {guide.safety_warnings.map((w, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-destructive">•</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <ListCard title="Tools needed" icon={<Wrench className="h-4 w-4" />} items={guide.tools_needed} />
              <ListCard title="Parts needed" icon={<Package className="h-4 w-4" />} items={guide.parts_needed} />
            </div>

            <h2 className="mt-8 font-display text-2xl uppercase tracking-wide">
              The Steps
            </h2>
            <ol className="mt-3 space-y-3">
              {guide.steps.map((s, i) => (
                <li key={i}>
                  <Card className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex items-start gap-3 p-4">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg gradient-primary font-display text-base text-primary-foreground shadow-bold">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold leading-snug">{s.title}</h3>
                          <ul className="mt-2 space-y-1.5 text-sm text-foreground/90">
                            {s.details.map((d, j) => (
                              <li key={j} className="flex gap-2">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                                <span>{d}</span>
                              </li>
                            ))}
                          </ul>
                          {s.tip && (
                            <div className="mt-3 flex gap-2 rounded-lg bg-primary/10 p-3 text-sm">
                              <Lightbulb className="h-4 w-4 shrink-0 text-primary" />
                              <span><span className="font-bold">Pro tip: </span>{s.tip}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ol>

            <Card className="mt-6 border-0 gradient-dark text-background">
              <CardContent className="p-5">
                <Badge className="bg-primary text-primary-foreground hover:bg-primary">Nice work</Badge>
                <p className="mt-3 font-display text-xl">
                  You just saved {guide.savings_usd}.
                </p>
                <p className="mt-1 text-sm text-background/75">
                  Stuck on a step? Tap the chat in the bottom right for live help.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({
  icon, label, value, highlight,
}: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-primary bg-primary/5" : ""}>
      <CardContent className="p-3">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className={`mt-1 font-display text-lg leading-tight ${highlight ? "text-primary" : ""}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function ListCard({
  title, icon, items,
}: { title: string; icon: React.ReactNode; items: string[] }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {icon} {title}
        </div>
        <ul className="mt-2 space-y-1.5 text-sm">
          {items.map((it, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-primary">›</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
