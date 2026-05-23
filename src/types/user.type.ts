export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: "sppg" | "school";
}

export interface JwtPayload {
  id: string;
  email: string;
  role: "sppg" | "school";
}
