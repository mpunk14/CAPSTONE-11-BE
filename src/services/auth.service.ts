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

const toNullableString = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const toNullableNumberString = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return undefined;
  return String(numberValue);
};

const toNullableInt = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue)) return undefined;
  return numberValue;
};

export const getMyProfileService = async (userId: string, role: string) => {
  const [user] = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) {
    return { status: 404, data: { success: false, message: "User tidak ditemukan" } };
  }

  if (role === "sppg") {
    const [profile] = await db
      .select()
      .from(sppg)
      .where(eq(sppg.userId, userId));

    if (!profile) {
      return { status: 404, data: { success: false, message: "Profil SPPG tidak ditemukan" } };
    }

    return {
      status: 200,
      data: {
        success: true,
        data: {
          user,
          profile,
        },
      },
    };
  }

  const [profile] = await db
    .select()
    .from(schools)
    .where(eq(schools.userId, userId));

  if (!profile) {
    return { status: 404, data: { success: false, message: "Profil Sekolah tidak ditemukan" } };
  }

  return {
    status: 200,
    data: {
      success: true,
      data: {
        user,
        profile,
      },
    },
  };
};

export const updateMyProfileService = async (userId: string, role: string, payload: Record<string, unknown>) => {
  try {
    const email = toNullableString(payload.email);
    const password = toNullableString(payload.password);

    return await db.transaction(async (tx) => {
      const [existingUser] = await tx.select().from(users).where(eq(users.id, userId));
      if (!existingUser) {
        return { status: 404, data: { success: false, message: "User tidak ditemukan" } };
      }

      const userPatch: Partial<typeof users.$inferInsert> = {
        updatedAt: new Date(),
      };

      if (email !== undefined) userPatch.email = email ?? existingUser.email;
      if (password) userPatch.password = await bcrypt.hash(password, 10);

      await tx.update(users).set(userPatch).where(eq(users.id, userId));

      if (role === "sppg") {
        const [currentProfile] = await tx.select().from(sppg).where(eq(sppg.userId, userId));
        if (!currentProfile) {
          return { status: 404, data: { success: false, message: "Profil SPPG tidak ditemukan" } };
        }

        const lat = toNullableNumberString(payload.lat);
        const lng = toNullableNumberString(payload.lng);
        const capacityPerDay = toNullableInt(payload.capacityPerDay);
        const staffCount = toNullableInt(payload.staffCount);

        if (lat === undefined || lng === undefined || capacityPerDay === undefined || staffCount === undefined) {
          return { status: 400, data: { success: false, message: "Format data profil tidak valid" } };
        }

        const profilePatch: Partial<typeof sppg.$inferInsert> = {
          updatedAt: new Date(),
        };

        const name = toNullableString(payload.name);
        const sppgCode = toNullableString(payload.sppgCode);
        const address = toNullableString(payload.address);
        const personInCharge = toNullableString(payload.personInCharge);
        const photoUrl = toNullableString(payload.photoUrl);

        if (name !== undefined) profilePatch.name = name ?? currentProfile.name;
        if (sppgCode !== undefined) profilePatch.sppgCode = sppgCode ?? currentProfile.sppgCode;
        if (address !== undefined) profilePatch.address = address ?? currentProfile.address;
        if (personInCharge !== undefined) profilePatch.personInCharge = personInCharge ?? currentProfile.personInCharge;
        if (photoUrl !== undefined) profilePatch.photoUrl = photoUrl;
        if (lat !== null) profilePatch.lat = lat;
        if (lng !== null) profilePatch.lng = lng;
        if (capacityPerDay !== null) profilePatch.capacityPerDay = capacityPerDay;
        if (staffCount !== null) profilePatch.staffCount = staffCount;

        await tx.update(sppg).set(profilePatch).where(eq(sppg.userId, userId));

        const [updatedUser] = await tx
          .select({ id: users.id, email: users.email, role: users.role })
          .from(users)
          .where(eq(users.id, userId));
        const [updatedProfile] = await tx.select().from(sppg).where(eq(sppg.userId, userId));

        return {
          status: 200,
          data: {
            success: true,
            message: "Profil berhasil diperbarui",
            data: { user: updatedUser, profile: updatedProfile },
          },
        };
      }

      const [currentProfile] = await tx.select().from(schools).where(eq(schools.userId, userId));
      if (!currentProfile) {
        return { status: 404, data: { success: false, message: "Profil Sekolah tidak ditemukan" } };
      }

      const lat = toNullableNumberString(payload.lat);
      const lng = toNullableNumberString(payload.lng);
      const studentCount = toNullableInt(payload.studentCount);

      if (lat === undefined || lng === undefined || studentCount === undefined) {
        return { status: 400, data: { success: false, message: "Format data profil tidak valid" } };
      }

      const profilePatch: Partial<typeof schools.$inferInsert> = {
        updatedAt: new Date(),
      };

      const schoolName = toNullableString(payload.schoolName);
      const npsn = toNullableString(payload.npsn);
      const address = toNullableString(payload.address);
      const photoUrl = toNullableString(payload.photoUrl);
      const sppgId = toNullableString(payload.sppgId);

      if (schoolName !== undefined) profilePatch.schoolName = schoolName ?? currentProfile.schoolName;
      if (npsn !== undefined) profilePatch.npsn = npsn ?? currentProfile.npsn;
      if (address !== undefined) profilePatch.address = address ?? currentProfile.address;
      if (photoUrl !== undefined) profilePatch.photoUrl = photoUrl;
      if (sppgId !== undefined) profilePatch.sppgId = sppgId;
      if (lat !== null) profilePatch.lat = lat;
      if (lng !== null) profilePatch.lng = lng;
      if (studentCount !== null) profilePatch.studentCount = studentCount;

      await tx.update(schools).set(profilePatch).where(eq(schools.userId, userId));

      const [updatedUser] = await tx
        .select({ id: users.id, email: users.email, role: users.role })
        .from(users)
        .where(eq(users.id, userId));
      const [updatedProfile] = await tx.select().from(schools).where(eq(schools.userId, userId));

      return {
        status: 200,
        data: {
          success: true,
          message: "Profil berhasil diperbarui",
          data: { user: updatedUser, profile: updatedProfile },
        },
      };
    });
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
