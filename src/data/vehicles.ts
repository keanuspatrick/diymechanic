export const VEHICLE_MAKES = [
  "Acura", "Alfa Romeo", "Audi", "BMW", "Buick", "Cadillac", "Chevrolet",
  "Chrysler", "Dodge", "Fiat", "Ford", "Genesis", "GMC", "Honda", "Hyundai",
  "Infiniti", "Jaguar", "Jeep", "Kia", "Land Rover", "Lexus", "Lincoln",
  "Mazda", "Mercedes-Benz", "Mini", "Mitsubishi", "Nissan", "Porsche", "Ram",
  "Subaru", "Tesla", "Toyota", "Volkswagen", "Volvo",
];

export const VEHICLE_YEARS = Array.from(
  { length: new Date().getFullYear() - 1989 },
  (_, i) => String(new Date().getFullYear() - i),
);

export const POPULAR_TASKS = [
  "Replace brake pads and rotors",
  "Install window tint",
  "Change oil and filter",
  "Replace spark plugs",
  "Install cold air intake",
  "Replace cabin air filter",
  "Install a cat-back exhaust",
  "Replace battery",
  "Replace muffler",
  "Install dash cam",
  "Replace headlight bulbs",
  "Rotate tires",
];
