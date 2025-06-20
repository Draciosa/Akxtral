export interface SportsGround {
  id: string;
  name: string;
  rating: number;
  sports: string[];
  location: string;
  area: string;
  pricePerHour: number;
  distance: string;
  image?: string;
  openingTime: string;
}