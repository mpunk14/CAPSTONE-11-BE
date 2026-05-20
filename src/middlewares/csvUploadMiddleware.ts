import multer from "multer";

const acceptedMimeTypes = new Set([
  "text/csv",
  "application/vnd.ms-excel",
  "text/plain",
  "application/csv",
  "application/octet-stream",
]);

const csvFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const fileName = file.originalname.toLowerCase();
  const hasCsvExtension = fileName.endsWith(".csv");

  if (acceptedMimeTypes.has(file.mimetype) && hasCsvExtension) {
    cb(null, true);
    return;
  }

  cb(new Error("Hanya file CSV yang diperbolehkan"));
};

export const uploadCsv = multer({
  storage: multer.memoryStorage(),
  fileFilter: csvFileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});
