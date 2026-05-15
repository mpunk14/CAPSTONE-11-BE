import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { schools, sppg, users } from "../db/skema";
import { isUuid } from "../utils/uuid";

const normalizeRole = (role?: string) => {
  if (!role) return undefined;
  if (role === "sekolah") return "school";
  return role;
};

type RegisterPayload = {
  role?: string;
  name?: string;
  email?: string;
  phone?: string;
  code?: string;
  address?: string;
  sppg?: string;
  password?: string;
};

const findSppgId = async (value?: string) => {
  if (!value) return null;
  if (isUuid(value)) return value;

  const allSppg = await db.select().from(sppg);
  const normalizedValue = String(value).trim().toLowerCase();
  const found = allSppg.find((item) => {
    return item.sppgCode.toLowerCase() === normalizedValue || item.name.toLowerCase() === normalizedValue;
  });

  return found?.id ?? null;
};

const toSafeUser = (user: typeof users.$inferSelect) => ({
  id: user.id,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

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

export const registerService = async (payload: RegisterPayload) => {
  const role = normalizeRole(payload.role);
  const name = payload.name?.trim();
  const email = payload.email?.trim().toLowerCase();
  const password = payload.password;
  const code = payload.code?.trim();
  const address = payload.address?.trim();

  if (!role || !name || !email || !password || !code || !address) {
    return { status: 400, data: { success: false, message: "Role, nama, email, kode, alamat, dan password wajib diisi" } };
  }

  if (role !== "sppg" && role !== "school") {
    return { status: 400, data: { success: false, message: "Role tidak valid" } };
  }

  const [existingUser] = await db.select().from(users).where(eq(users.email, email));
  if (existingUser) {
    return { status: 409, data: { success: false, message: "Email sudah terdaftar" } };
  }

  if (role === "school") {
    const [existingSchool] = await db.select().from(schools).where(eq(schools.npsn, code));
    if (existingSchool) {
      return { status: 409, data: { success: false, message: "Kode sekolah/NPSN sudah terdaftar" } };
    }
  }

  if (role === "sppg") {
    const [existingSppg] = await db.select().from(sppg).where(eq(sppg.sppgCode, code));
    if (existingSppg) {
      return { status: 409, data: { success: false, message: "Kode SPPG sudah terdaftar" } };
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const sppgId = role === "school" ? await findSppgId(payload.sppg) : null;

  if (role === "school" && payload.sppg && !sppgId) {
    return { status: 400, data: { success: false, message: "SPPG tidak ditemukan" } };
  }

  const result = await db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(users)
      .values({
        email,
        password: passwordHash,
        role,
      })
      .returning();

    if (role === "school") {
      const [profile] = await tx
        .insert(schools)
        .values({
          userId: newUser.id,
          sppgId,
          schoolName: name,
          npsn: code,
          address,
        })
        .returning();

      return { user: newUser, profile };
    }

    const [profile] = await tx
      .insert(sppg)
      .values({
        userId: newUser.id,
        name,
        sppgCode: code,
        address,
        personInCharge: name,
      })
      .returning();

    return { user: newUser, profile };
  });

  return {
    status: 201,
    data: {
      success: true,
      data: {
        user: toSafeUser(result.user),
        profile: result.profile,
      },
    },
  };
};
