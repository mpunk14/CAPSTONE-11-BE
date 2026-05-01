import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { usersMockDb } from "../db/mockDb";

export const loginService = async (email: string, password: string) => {
  // 1. Cari user berdasarkan email
  const user = usersMockDb.find((u) => u.email === email);
  if (!user) {
    return { status: 404, data: { success: false, message: "User tidak ditemukan" } };
  }

  // 2. Compare password pakai bcrypt
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    return { status: 401, data: { success: false, message: "Password salah" } };
  }

  // 3. Generate JWT Token
  const payload = { id: user.id, email: user.email, role: user.role };
  const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: "1d", // Token valid 1 hari
  });

  return {
    status: 200,
    data: { success: true, token, role: user.role },
  };
};