import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Vehicle = {
  year: string;
  make: string;
  model: string;
};

type VehicleState = {
  vehicle: Vehicle | null;
  setVehicle: (v: Vehicle | null) => void;
  clear: () => void;
};

export const useVehicle = create<VehicleState>()(
  persist(
    (set) => ({
      vehicle: null,
      setVehicle: (vehicle) => set({ vehicle }),
      clear: () => set({ vehicle: null }),
    }),
    { name: "mymechanic.vehicle" },
  ),
);
