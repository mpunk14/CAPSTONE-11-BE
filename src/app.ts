import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "path";

import authRoutes from "./routes/authRoutes";
import laporanRoutes from "./routes/laporanRoutes";
import notifikasiRoutes from "./routes/notifikasiRoutes";
import publicRoutes from "./routes/publicRoutes";
import sekolahRoutes from "./routes/schoolRoutes";
import sppgRoutes from "./routes/sppgRoutes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api/sppg", sppgRoutes);
app.use("/api/sekolah", sekolahRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/laporan", laporanRoutes);
app.use("/api/notifikasi", notifikasiRoutes);
app.use("/api/notifications", notifikasiRoutes);
app.use("/api", publicRoutes);

app.use("/api", (_req, res) => {
  return res.status(404).json({
    success: false,
    message: "Endpoint API tidak ditemukan",
  });
});

export default app;
