import express from "express";
import dotenv from "dotenv";
import path from "path"; // Tambahan: Untuk menangani path folder uploads

// Import semua routes
import sppgRoutes from "./src/routes/sppgRoutes";
import sekolahRoutes from "./src/routes/schoolRoutes";
import authRoutes from "./src/routes/authRoutes";
import laporanRoutes from "./src/routes/laporanRoutes";

dotenv.config();

const app = express();

app.use(express.json());
// Middleware agar server bisa membaca data dari form-data (untuk upload foto)
app.use(express.urlencoded({ extended: true })); 

// ============================================================
// SETUP STATIC FILE SERVING
// Ini supaya foto di folder 'uploads' bisa diakses via browser/URL
// ============================================================
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Daftarkan Routes
app.use("/sppg", sppgRoutes);
app.use("/sekolah", sekolahRoutes);
app.use("/auth", authRoutes);
app.use("/laporan", laporanRoutes); // Tambahan: Endpoint Laporan

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});