import { User } from "../types/user.type";

// Password untuk kedua akun ini adalah: "password123"
// Hash di-*generate* pakai bcrypt dengan salt rounds = 10
export const usersMockDb: User[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    email: "admin@sppg.com",
    passwordHash: "$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW", 
    role: "sppg",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    email: "admin@sekolah.com",
    passwordHash: "$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW", 
    role: "school",
  },
];
