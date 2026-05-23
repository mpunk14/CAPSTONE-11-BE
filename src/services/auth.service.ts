import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { schools, sppg, users } from "../db/skema";

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

type RegisterPayload = {
  role: string;
  name: string;
  email: string;
  phone?: string;
  code: string;
  address: string;
  sppg?: string | null;
  password: string;
};

const normalizeRegisterRole = (role: string) => {
  if (role === "sekolah") return "school";
  return role;
};

export const registerService = async (payload: RegisterPayload) => {
  const role = normalizeRegisterRole(payload.role);

  if (role !== "sppg" && role !== "school") {
    return { status: 400, data: { success: false, message: "Role tidak valid" } };
  }

  const email = payload.email.trim().toLowerCase();
  const name = payload.name.trim();
  const code = payload.code.trim();
  const address = payload.address.trim();

  if (!name || !email || !code || !address || !payload.password) {
    return { status: 400, data: { success: false, message: "Data registrasi belum lengkap" } };
  }

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existingUser) {
    return { status: 409, data: { success: false, message: "Email sudah terdaftar" } };
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);

  try {
    const created = await db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          email,
          password: passwordHash,
          role,
        })
        .returning({
          id: users.id,
          email: users.email,
          role: users.role,
        });

      if (role === "sppg") {
        const [newSppg] = await tx
          .insert(sppg)
          .values({
            userId: newUser.id,
            name,
            sppgCode: code,
            address,
            personInCharge: payload.phone?.trim() || "Belum diisi",
          })
          .returning({ id: sppg.id });

        return { user: newUser, profileId: newSppg.id };
      }

      let sppgId: string | null = null;
      const selectedSppgName = payload.sppg?.trim();
      if (selectedSppgName) {
        const [partnerSppg] = await tx.select({ id: sppg.id }).from(sppg).where(eq(sppg.name, selectedSppgName));
        sppgId = partnerSppg?.id ?? null;
      }

      const [newSchool] = await tx
        .insert(schools)
        .values({
          userId: newUser.id,
          schoolName: name,
          npsn: code,
          address,
          sppgId,
        })
        .returning({ id: schools.id });

      return { user: newUser, profileId: newSchool.id };
    });

    return {
      status: 201,
      data: {
        success: true,
        message: "Registrasi berhasil. Akun menunggu verifikasi admin.",
        data: {
          userId: created.user.id,
          profileId: created.profileId,
          role: created.user.role,
          email: created.user.email,
          verificationStatus: "pending",
        },
      },
    };
  } catch (error: any) {
    if (error?.code === "23505") {
      return {
        status: 409,
        data: { success: false, message: "Data unik sudah digunakan (email/kode/NPSN)" },
      };
    }

    throw error;
  }
};
