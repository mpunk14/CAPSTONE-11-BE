export interface User {
  id: number;
  email: string;
  passwordHash: string;
  role: "sppg" | "sekolah";
}

export interface JwtPayload {
  id: number;
  email: string;
  role: "sppg" | "sekolah";
}