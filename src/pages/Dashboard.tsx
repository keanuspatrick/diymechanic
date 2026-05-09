import { useNavigate } from "react-router-dom";
import { useVehicle } from "@/store/vehicle";
import { POPULAR_TASKS } from "@/data/vehicles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import TopBar from "@/components/TopBar";
import { useState } from "react";
import { ArrowRight, Wrench, Clock, DollarSign } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const vehicle = useVehicle((s) => s.vehicle);
  const [task, setTask] = useState("");

  if (!vehicle) {
    navigate("/", { replace: true });
    return null;
  }

  const start = (t: string) => {
    if (!t.trim()) return;
    navigate(`/guide?task=${encodeURIComponent(t.trim())}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="mx-auto max-w-2xl px-5 pb-28 pt-6">
        <div className="rounded-2xl gradient-dark p-5 text-background shadow-deep">
          <div className="text-xs font-bold uppercase tracking-widest text-primary">
            Working on
          </div>
          <div className="mt-1 font-display text-2xl">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-background/80">
              <Wrench className="h-4 w-4 text-primary" /> Step-by-step
            </div>
            <div className="flex items-center gap-1.5 text-background/80">
              <Clock className="h-4 w-4 text-primary" /> Time estimate
            </div>
            <div className="flex items-center gap-1.5 text-background/80">
              <DollarSign className="h-4 w-4 text-primary" /> Save vs shop
            </div>
          </div>
        </div>

        <h2 className="mt-8 font-display text-xl uppercase tracking-wide">
          What are you doing today?
        </h2>

        <div className="mt-3 flex gap-2">
          <input
            className="flex h-12 w-full rounded-md border border-input bg-card px-3 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="e.g. replace front brake pads"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && start(task)}
          />
          <Button
            onClick={() => start(task)}
            disabled={!task.trim()}
            className="h-12 gradient-primary px-5 font-bold text-primary-foreground shadow-bold"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>

        <h3 className="mt-8 mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Popular jobs
        </h3>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {POPULAR_TASKS.map((t) => (
            <Card
              key={t}
              onClick={() => start(t)}
              className="group cursor-pointer border border-border transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-bold"
            >
              <CardContent className="flex items-center justify-between p-4">
                <span className="font-medium">{t}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
