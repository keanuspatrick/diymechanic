import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVehicle } from "@/store/vehicle";
import { VEHICLE_MAKES, VEHICLE_YEARS } from "@/data/vehicles";
import { Wrench, ArrowRight } from "lucide-react";
import heroImg from "@/assets/hero-garage.jpg";

export default function VehicleSelect() {
  const navigate = useNavigate();
  const setVehicle = useVehicle((s) => s.setVehicle);
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");

  const ready = year && make && model.trim().length > 0;

  const handleStart = () => {
    if (!ready) return;
    setVehicle({ year, make, model: model.trim() });
    navigate("/dashboard");
  };

  return (
    <main className="min-h-screen relative overflow-hidden">
      <img
        src={heroImg}
        alt="Open hood with tools laid out in a warm-lit garage"
        width={1920}
        height={1080}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col px-5 pb-10 pt-14">
        <div className="mb-10 flex items-center gap-3 text-primary-foreground">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl gradient-primary shadow-bold">
            <Wrench className="h-6 w-6 origin-center animate-wrench-turn" />
          </div>
          <div className="font-display text-2xl tracking-wide text-background">MyMechanic</div>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <h1 className="font-display text-4xl leading-[0.95] text-background sm:text-5xl">
            SKIP THE SHOP.
            <br />
            <span className="text-primary">FIX IT YOURSELF.</span>
          </h1>
          <p className="mt-4 max-w-md text-base text-background/85">
            Step-by-step guides for repairs, installs and mods — built for your exact vehicle. Tools, time and what you'll save vs the shop.
          </p>

          <Card className="mt-8 border-0 shadow-deep">
            <CardContent className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Year
                </label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {VEHICLE_YEARS.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Make
                </label>
                <Select value={make} onValueChange={setMake}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="Select make" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {VEHICLE_MAKES.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Model
                </label>
                <input
                  className="flex h-12 w-full rounded-md border border-input bg-background px-3 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="e.g. Civic, F-150, Camry"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>

              <Button
                size="lg"
                disabled={!ready}
                onClick={handleStart}
                className="mt-2 h-14 w-full gradient-primary text-base font-bold uppercase tracking-wide text-primary-foreground shadow-bold hover:opacity-95"
              >
                Start Wrenching
                <ArrowRight className="ml-1 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
