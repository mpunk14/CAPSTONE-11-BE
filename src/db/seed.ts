import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './skema';
import bcrypt from 'bcrypt';
import 'dotenv/config'; // 👈 Panggil dotenv secara langsung di sini

// 1. Ambil URL koneksi langsung dari file .env
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ ERROR: DATABASE_URL tidak ditemukan di file .env!');
  process.exit(1);
}

// Inisialisasi koneksi khusus untuk seeding
const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function main() {
  console.log('🌱 Memulai proses seeding database Numgas...');

  try {
    // 1. Bersihkan data lama agar tidak bentrok (Reverse Order karena Foreign Key)
    console.log('🧹 Membersihkan tabel lama...');
    await db.delete(schema.menus);
    await db.delete(schema.articles);
    await db.delete(schema.schools);
    await db.delete(schema.sppg);
    await db.delete(schema.users);

    // Semua user dummy akan pakai password ini agar gampang dites login
    const defaultPassword = await bcrypt.hash('password123', 10);

    // --- 2. SEED USERS ---
    console.log('👨‍🍳 Membuat data Users...');
    const insertedUsers = await db.insert(schema.users).values([
      { email: 'dapur.jakarta@numgas.com', password: defaultPassword, role: 'sppg' },
      { email: 'dapur.bekasi@numgas.com', password: defaultPassword, role: 'sppg' },
      { email: 'sdn.sukamaju01@school.com', password: defaultPassword, role: 'school' },
      { email: 'smpn.nusantara@school.com', password: defaultPassword, role: 'school' },
      { email: 'sdn.mekarsari@school.com', password: defaultPassword, role: 'school' },
    ]).returning({ id: schema.users.id });

    // --- 3. SEED SPPG (DAPUR UMUM) ---
    console.log('🍲 Membuat profil SPPG...');
    const insertedSppg = await db.insert(schema.sppg).values([
      { 
        userId: insertedUsers[0].id, name: 'Dapur Umum Sehat Jakarta', 
        sppgCode: 'SPPG-JKT-001', address: 'Jl. Sudirman No. 10, Jakarta', 
        personInCharge: 'Budi Santoso', capacityPerDay: 5000, 
        lat: '-6.2088', lng: '106.8456' 
      },
      { 
        userId: insertedUsers[1].id, name: 'Dapur Gizi Nusantara Bekasi', 
        sppgCode: 'SPPG-BKS-001', address: 'Jl. Ahmad Yani No. 5, Bekasi', 
        personInCharge: 'Siti Aminah', capacityPerDay: 3000, 
        lat: '-6.2415', lng: '106.9924' 
      }
    ]).returning({ id: schema.sppg.id });

    // --- 4. SEED SCHOOLS ---
    console.log('🏫 Membuat profil Sekolah...');
    await db.insert(schema.schools).values([
      { 
        userId: insertedUsers[2].id, sppgId: insertedSppg[0].id, // Disuplai Dapur JKT
        schoolName: 'SDN Sukamaju 01', npsn: '20101111', 
        address: 'Jl. Merdeka 1, Jakarta', lat: '-6.2100', lng: '106.8500' 
      },
      { 
        userId: insertedUsers[3].id, sppgId: insertedSppg[0].id, // Disuplai Dapur JKT
        schoolName: 'SMPN 2 Nusantara', npsn: '20102222', 
        address: 'Jl. Pahlawan 2, Jakarta', lat: '-6.2200', lng: '106.8400' 
      },
      { 
        userId: insertedUsers[4].id, sppgId: insertedSppg[1].id, // Disuplai Dapur Bekasi
        schoolName: 'SDN Mekarsari 03', npsn: '20103333', 
        address: 'Jl. Patriot 3, Bekasi', lat: '-6.2500', lng: '106.9900' 
      },
    ]);

    // --- 5. SEED MENUS ---
    console.log('🍱 Membuat Jadwal Menu Mingguan...');
    await db.insert(schema.menus).values([
      { 
        sppgId: insertedSppg[0].id, menuDate: '2026-04-14', 
        rice: 'Nasi Putih', sideDish: 'Ayam Teriyaki & Telur Dadar', fruit: 'Pisang', 
        calories: '650.50', protein: '25.00', carbohydrate: '80.00', fat: '15.00' 
      },
      { 
        sppgId: insertedSppg[0].id, menuDate: '2026-04-15', 
        rice: 'Nasi Merah', sideDish: 'Ikan Tongkol Balado & Tempe Orek', fruit: 'Jeruk', 
        calories: '600.00', protein: '30.00', carbohydrate: '75.00', fat: '12.00' 
      },
      { 
        sppgId: insertedSppg[1].id, menuDate: '2026-04-14', 
        rice: 'Nasi Putih', sideDish: 'Semur Daging & Tahu', fruit: 'Semangka', 
        calories: '700.00', protein: '28.00', carbohydrate: '85.00', fat: '18.00' 
      },
    ]);

    // --- 6. SEED ARTICLES ---
    console.log('📰 Membuat Artikel Publik...');
    await db.insert(schema.articles).values([
      { 
        title: 'Pentingnya Gizi Seimbang untuk Prestasi Anak', 
        summary: 'Gizi yang baik dapat meningkatkan daya ingat dan fokus belajar siswa di kelas.', 
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.', 
        author: 'Dr. Hendra', coverImageUrl: 'https://placehold.co/800x400/png' 
      },
      { 
        title: 'Program Makan Siang Gratis Dimulai di Bekasi', 
        summary: 'Dapur Umum SPPG Bekasi resmi beroperasi melayani 3000 porsi per hari.', 
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut enim ad minim veniam, quis nostrud exercitation ullamco.', 
        author: 'Admin Numgas', coverImageUrl: 'https://placehold.co/800x400/png' 
      }
    ]);

    console.log('✅ Seeding Selesai! Data dummy sudah berhasil dimasukkan ke PostgreSQL.');
  } catch (error) {
    console.error('❌ Gagal melakukan seeding:', error);
  } finally {
    // Matikan koneksi database agar script bisa berhenti
    process.exit(0);
  }
}

main();