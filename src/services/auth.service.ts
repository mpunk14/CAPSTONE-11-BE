import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users } from "../db/skema";

const normalizeRole = (role?: string) => {
  if (!role) return undefined;
  if (role === "sekolah") return "school";
  return role;
};

export const loginService = async (identifier: string, password: string, role?: string) => {
  const [user] = await db.select().from(users).where(eq(users.email, identifier));

  if (!user) {
    return { status: 404, data: { success: false, message: "User tidak ditemukan" } };
  }

  const requestedRole = normalizeRole(role);
  if (requestedRole && requestedRole !== user.role) {
    return { status: 403, data: { success: false, message: "Role tidak sesuai dengan akun" } };
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return { status: 401, data: { success: false, message: "Password salah" } };
  }

  if (!process.env.JWT_SECRET) {
    return { status: 500, data: { success: false, message: "JWT_SECRET belum dikonfigurasi" } };
  }

  const payload = { id: user.id, email: user.email, role: user.role };
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  return {
    status: 200,
    data: {
      success: true,
      token,
      role: user.role,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    },
  };
};
