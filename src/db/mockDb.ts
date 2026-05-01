import { User } from "../types/user.type";
import { Laporan } from "../types/laporan.type";

// In-memory array sebagai pengganti database asli
export const laporanDb: Laporan[] = [];

// Password untuk kedua akun ini adalah: "password123"
// Hash di-*generate* pakai bcrypt dengan salt rounds = 10
export const usersMockDb: User[] = [
  {
    id: 1,
    email: "admin@sppg.com",
    passwordHash: "$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW", 
    role: "sppg",
  },
  {
    id: 2,
    email: "admin@sekolah.com",
    passwordHash: "$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW", 
    role: "sekolah",
  },
];