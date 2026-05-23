import { v2 as cloudinary } from "cloudinary";
import "./loadEnv";

const parseCloudinaryUrl = (url?: string) => {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "cloudinary:") return null;

    return {
      cloudName: parsed.hostname || "",
      apiKey: decodeURIComponent(parsed.username || ""),
      apiSecret: decodeURIComponent(parsed.password || ""),
    };
  } catch {
    return null;
  }
};

const fromUrl = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
// Prioritaskan CLOUDINARY_URL agar konsisten walau env terpisah tidak sinkron.
const cloudName = fromUrl?.cloudName || process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = fromUrl?.apiKey || process.env.CLOUDINARY_API_KEY;
const apiSecret = fromUrl?.apiSecret || process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.warn("[cloudinary] CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET belum lengkap");
} else {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export { cloudinary };
