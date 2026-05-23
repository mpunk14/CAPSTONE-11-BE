import { cloudinary } from "../config/cloudinary";
// import db dari setup drizzle kamu
// import { db } from "../db"; 

export const deleteImageFromCloudinary = async (publicId: string) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Gagal menghapus gambar dari Cloudinary:", error);
    throw error;
  }
};

export const updateProfileImageUrl = async (userId: string, newImageUrl: string) => {
  // Logika Drizzle ORM kamu di sini untuk update tabel user/profil
  // const updatedUser = await db.update(users).set({ avatar: newImageUrl }).where(eq(users.id, userId));
  // return updatedUser;
};