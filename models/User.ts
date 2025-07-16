export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  emailVerified?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Device {
  id: string;
  userId: string;
  name: string;
  coordinates: [number, number];
  status: "active" | "inactive";
  humidity: string;
  location: string;
  createdAt: Date;
  updatedAt: Date;
}
