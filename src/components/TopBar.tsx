import { Link, useNavigate } from "react-router-dom";
import { Wrench, Settings, User, LogOut, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useVehicle } from "@/store/vehicle";
import { toast } from "sonner";

export default function TopBar() {
  const navigate = useNavigate();
  const vehicle = useVehicle((s) => s.vehicle);
  const clear = useVehicle((s) => s.clear);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary shadow-bold">
            <Wrench className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg tracking-wide">MyMechanic</span>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full border border-border">
              <User className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => toast.info("Sign-in coming soon")}>
              <User className="mr-2 h-4 w-4" /> Create account
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.info("Sign-in coming soon")}>
              <LogOut className="mr-2 h-4 w-4" /> Sign in
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Vehicle</DropdownMenuLabel>
            {vehicle && (
              <DropdownMenuItem disabled className="opacity-100">
                <Car className="mr-2 h-4 w-4 text-primary" />
                <span className="truncate">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => { clear(); navigate("/"); }}>
              <Car className="mr-2 h-4 w-4" /> Change vehicle
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast.info("Settings coming soon")}>
              <Settings className="mr-2 h-4 w-4" /> Preferences
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
