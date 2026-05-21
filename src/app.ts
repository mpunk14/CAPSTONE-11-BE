import cors from "cors";
import express from "express";
import "./config/loadEnv";

import authRoutes from "./routes/authRoutes";
import laporanRoutes from "./routes/laporanRoutes";
import menuRoutes from "./routes/menuRoutes";
import notifikasiRoutes from "./routes/notifikasiRoutes";
import publicRoutes from "./routes/publicRoutes";
import sekolahRoutes from "./routes/schoolRoutes";
import sppgRoutes from "./routes/sppgRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import { errorMiddleware } from "./middlewares/errorMiddleware";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// simple request timing logger to diagnose slow endpoints
app.use((req, res, next) => {
  const start = Date.now();
  res.once("finish", () => {
    const ms = Date.now() - start;
    // keep logs concise
    // eslint-disable-next-line no-console
    console.log(`[req] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
  });
  next();
});

app.use("/api/sppg", sppgRoutes);
app.use("/api/sekolah", sekolahRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/laporan", laporanRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/notifikasi", notifikasiRoutes);
app.use("/api/notifications", notifikasiRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api", publicRoutes);
app.use(errorMiddleware);

app.use("/api", (_req, res) => {
  return res.status(404).json({
    success: false,
    message: "Endpoint API tidak ditemukan",
  });
});

export default app;
