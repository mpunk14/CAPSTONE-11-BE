import multer from "multer";
import fs from "fs";
import path from "path";

// Bikin folder uploads otomatis kalau belum ada (ditaruh di luar folder src)
const uploadDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi tempat simpan dan nama file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate nama file unik: timestamp + nama asli (biar gak bentrok kalau namanya sama)
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

// Filter biar yang masuk beneran foto aja
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Hanya diperbolehkan mengunggah file gambar (JPG/PNG)"));
  }
};

export const uploadFile = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Limit maksimal 5MB
});