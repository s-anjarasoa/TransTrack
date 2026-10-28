import { User } from "./user.model";

export interface Client {
  id: number;
  userId: number;
  phone?: string;
  address: string;
  CIN: string;
  passport?: string;
  createdAt: Date;
  user?: User;
}