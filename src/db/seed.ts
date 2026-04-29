import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './skema';
import bcrypt from 'bcrypt';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ ERROR: DATABASE_URL tidak ditemukan di file .env!');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function main() {
  console.log('🌱 Memulai proses seeding database SIMBA...');

  try {
    // ============================================================
    // BERSIHKAN DATA LAMA (Reverse order karena Foreign Key)
    // ============================================================
    console.log('🧹 Membersihkan tabel lama...');
    await db.delete(schema.notifications);
    await db.delete(schema.schoolReports);
    await db.delete(schema.mealDocumentation);
    await db.delete(schema.menus);
    await db.delete(schema.articles);
    await db.delete(schema.schools);
    await db.delete(schema.sppg);
    await db.delete(schema.users);

    const defaultPassword = await bcrypt.hash('password123', 10);

    // ============================================================
    // 1. USERS
    // ============================================================
    console.log('👤 Membuat data Users...');
    const insertedUsers = await db.insert(schema.users).values([
      // SPPG Users
      { email: 'dapur.jakarta@simba.id',   password: defaultPassword, role: 'sppg' },
      { email: 'dapur.bekasi@simba.id',    password: defaultPassword, role: 'sppg' },
      { email: 'dapur.depok@simba.id',     password: defaultPassword, role: 'sppg' },
      // School Users
      { email: 'sdn.sukamaju01@simba.id',  password: defaultPassword, role: 'school' },
      { email: 'smpn.nusantara@simba.id',  password: defaultPassword, role: 'school' },
      { email: 'sdn.mekarsari@simba.id',   password: defaultPassword, role: 'school' },
      { email: 'sdn.harapan@simba.id',     password: defaultPassword, role: 'school' },
      { email: 'smkn.teknologi@simba.id',  password: defaultPassword, role: 'school' },
      { email: 'sdn.cempaka@simba.id',     password: defaultPassword, role: 'school' },
    ]).returning({ id: schema.users.id });

    // ============================================================
    // 2. SPPG (3 Dapur)
    // ============================================================
    console.log('🍲 Membuat profil SPPG...');
    const insertedSppg = await db.insert(schema.sppg).values([
      {
        userId: insertedUsers[0].id,
        name: 'Dapur Umum Sehat Jakarta',
        sppgCode: 'SPPG-JKT-001',
        address: 'Jl. Sudirman No. 10, Jakarta Pusat',
        personInCharge: 'Budi Santoso',
        capacityPerDay: 5000,
        status: 'active',
        lat: '-6.2088', lng: '106.8456',
      },
      {
        userId: insertedUsers[1].id,
        name: 'Dapur Gizi Nusantara Bekasi',
        sppgCode: 'SPPG-BKS-001',
        address: 'Jl. Ahmad Yani No. 5, Bekasi Selatan',
        personInCharge: 'Siti Aminah',
        capacityPerDay: 3000,
        status: 'active',
        lat: '-6.2415', lng: '106.9924',
      },
      {
        userId: insertedUsers[2].id,
        name: 'Dapur Sehat Depok Mandiri',
        sppgCode: 'SPPG-DPK-001',
        address: 'Jl. Margonda Raya No. 88, Depok',
        personInCharge: 'Rahmat Hidayat',
        capacityPerDay: 2500,
        status: 'active',
        lat: '-6.3728', lng: '106.8317',
      },
    ]).returning({ id: schema.sppg.id });

    // ============================================================
    // 3. SCHOOLS (6 Sekolah)
    // ============================================================
    console.log('🏫 Membuat profil Sekolah...');
    const insertedSchools = await db.insert(schema.schools).values([
      // 2 sekolah → Dapur Jakarta
      {
        userId: insertedUsers[3].id, sppgId: insertedSppg[0].id,
        schoolName: 'SDN Sukamaju 01', npsn: '20101111',
        address: 'Jl. Merdeka No. 1, Jakarta Pusat',
        lat: '-6.2100', lng: '106.8500',
      },
      {
        userId: insertedUsers[4].id, sppgId: insertedSppg[0].id,
        schoolName: 'SMPN 2 Nusantara', npsn: '20102222',
        address: 'Jl. Pahlawan No. 2, Jakarta Pusat',
        lat: '-6.2200', lng: '106.8400',
      },
      // 2 sekolah → Dapur Bekasi
      {
        userId: insertedUsers[5].id, sppgId: insertedSppg[1].id,
        schoolName: 'SDN Mekarsari 03', npsn: '20103333',
        address: 'Jl. Patriot No. 3, Bekasi',
        lat: '-6.2500', lng: '106.9900',
      },
      {
        userId: insertedUsers[6].id, sppgId: insertedSppg[1].id,
        schoolName: 'SDN Harapan Bangsa', npsn: '20104444',
        address: 'Jl. Harapan No. 7, Bekasi Utara',
        lat: '-6.2350', lng: '107.0000',
      },
      // 2 sekolah → Dapur Depok
      {
        userId: insertedUsers[7].id, sppgId: insertedSppg[2].id,
        schoolName: 'SMKN 1 Teknologi Depok', npsn: '20105555',
        address: 'Jl. Raya Sawangan No. 12, Depok',
        lat: '-6.3900', lng: '106.8200',
      },
      {
        userId: insertedUsers[8].id, sppgId: insertedSppg[2].id,
        schoolName: 'SDN Cempaka Putih', npsn: '20106666',
        address: 'Jl. Cempaka No. 5, Depok',
        lat: '-6.3600', lng: '106.8400',
      },
    ]).returning({ id: schema.schools.id });

    // ============================================================
    // 4. MENUS — Minggu ini: 28 Apr – 2 Mei 2026 (Senin–Jumat)
    //    Dibuat untuk semua 3 SPPG
    // ============================================================
    console.log('🍱 Membuat Jadwal Menu Mingguan...');

    // Helper agar tidak ketik berulang
    const menuWeek = (sppgId: string, menus: { date: string; rice: string; side: string; fruit: string }[]) =>
      menus.map(m => ({
        sppgId,
        menuDate: m.date,
        rice: m.rice,
        sideDish: m.side,
        fruit: m.fruit,
        calories: '650.00', protein: '25.00', carbohydrate: '80.00', fat: '15.00',
      }));

    // Dapur Jakarta
    await db.insert(schema.menus).values(menuWeek(insertedSppg[0].id, [
      { date: '2026-04-28', rice: 'Nasi Putih',  side: 'Ayam Teriyaki & Telur Dadar',       fruit: 'Pisang'    },
      { date: '2026-04-29', rice: 'Nasi Merah',   side: 'Ikan Tongkol Balado & Tempe Orek', fruit: 'Jeruk'     },
      { date: '2026-04-30', rice: 'Nasi Putih',  side: 'Semur Daging & Tahu Goreng',        fruit: 'Semangka'  },
      { date: '2026-05-01', rice: 'Nasi Uduk',   side: 'Ayam Goreng & Perkedel Jagung',     fruit: 'Apel'      },
      { date: '2026-05-02', rice: 'Nasi Putih',  side: 'Rendang Ayam & Sayur Asem',         fruit: 'Pepaya'    },
    ]));

    // Dapur Bekasi
    await db.insert(schema.menus).values(menuWeek(insertedSppg[1].id, [
      { date: '2026-04-28', rice: 'Nasi Putih',  side: 'Semur Daging & Tahu',               fruit: 'Semangka'  },
      { date: '2026-04-29', rice: 'Nasi Putih',  side: 'Ayam Bakar & Capcay',               fruit: 'Pisang'    },
      { date: '2026-04-30', rice: 'Nasi Merah',  side: 'Lele Goreng & Tempe Mendoan',       fruit: 'Jeruk'     },
      { date: '2026-05-01', rice: 'Nasi Putih',  side: 'Sop Bakso & Tahu Pong',             fruit: 'Apel'      },
      { date: '2026-05-02', rice: 'Nasi Gurih',  side: 'Opor Ayam & Perkedel',              fruit: 'Melon'     },
    ]));

    // Dapur Depok
    await db.insert(schema.menus).values(menuWeek(insertedSppg[2].id, [
      { date: '2026-04-28', rice: 'Nasi Putih',  side: 'Ayam Kecap & Tempe Goreng',         fruit: 'Apel'      },
      { date: '2026-04-29', rice: 'Nasi Merah',  side: 'Pepes Ikan & Sayur Lodeh',          fruit: 'Pisang'    },
      { date: '2026-04-30', rice: 'Nasi Putih',  side: 'Daging Bumbu Bali & Tahu',          fruit: 'Semangka'  },
      { date: '2026-05-01', rice: 'Nasi Putih',  side: 'Soto Ayam & Tempe Orek',            fruit: 'Jeruk'     },
      { date: '2026-05-02', rice: 'Nasi Uduk',   side: 'Empal Daging & Telur Balado',       fruit: 'Pepaya'    },
    ]));

    // ============================================================
    // 5. SCHOOL REPORTS (Laporan dari Sekolah ke SPPG)
    // ============================================================
    console.log('📋 Membuat data School Reports...');
    await db.insert(schema.schoolReports).values([
      {
        schoolId: insertedSchools[0].id, sppgId: insertedSppg[0].id,
        note: 'Makanan hari ini sangat lezat, porsi cukup dan anak-anak makan dengan lahap.',
        rating: 5, status: 'reviewed',
        submittedAt: new Date('2026-04-28T10:00:00'),
      },
      {
        schoolId: insertedSchools[1].id, sppgId: insertedSppg[0].id,
        note: 'Ayam teriyaki agak kurang matang, tolong diperhatikan untuk pengiriman berikutnya.',
        rating: 3, status: 'received',
        submittedAt: new Date('2026-04-28T11:30:00'),
      },
      {
        schoolId: insertedSchools[2].id, sppgId: insertedSppg[1].id,
        note: 'Pengiriman terlambat 30 menit, mohon lebih tepat waktu.',
        rating: 3, status: 'submitted',
        submittedAt: new Date('2026-04-29T09:00:00'),
      },
      {
        schoolId: insertedSchools[3].id, sppgId: insertedSppg[1].id,
        note: 'Menu hari ini sangat bervariasi dan bergizi, siswa sangat antusias.',
        rating: 5, status: 'reviewed',
        submittedAt: new Date('2026-04-29T10:15:00'),
      },
      {
        schoolId: insertedSchools[4].id, sppgId: insertedSppg[2].id,
        note: 'Porsi nasi kurang banyak untuk siswa SMA, perlu ditambah.',
        rating: 4, status: 'received',
        submittedAt: new Date('2026-04-28T12:00:00'),
      },
    ]);

    // ============================================================
    // 6. NOTIFICATIONS (Notifikasi ke Dashboard SPPG)
    // ============================================================
    console.log('🔔 Membuat data Notifikasi...');
    await db.insert(schema.notifications).values([
      {
        sppgId: insertedSppg[0].id, schoolId: insertedSchools[0].id,
        type: 'notification',
        message: 'SDN Sukamaju 01 mengkonfirmasi penerimaan makanan hari ini.',
        status: 'received',
        createdAt: new Date('2026-04-28T10:05:00'),
      },
      {
        sppgId: insertedSppg[0].id, schoolId: insertedSchools[1].id,
        type: 'feedback',
        message: 'SMPN 2 Nusantara: Ayam teriyaki kurang matang, mohon diperhatikan.',
        status: 'new',
        createdAt: new Date('2026-04-28T11:32:00'),
      },
      {
        sppgId: insertedSppg[1].id, schoolId: insertedSchools[2].id,
        type: 'complaint',
        message: 'SDN Mekarsari 03: Pengiriman terlambat 30 menit dari jadwal.',
        status: 'new',
        createdAt: new Date('2026-04-29T09:05:00'),
      },
      {
        sppgId: insertedSppg[1].id, schoolId: insertedSchools[3].id,
        type: 'notification',
        message: 'SDN Harapan Bangsa mengkonfirmasi makanan diterima dengan baik.',
        status: 'reviewed',
        createdAt: new Date('2026-04-29T10:20:00'),
      },
      {
        sppgId: insertedSppg[2].id, schoolId: insertedSchools[4].id,
        type: 'feedback',
        message: 'SMKN 1 Teknologi: Porsi nasi perlu ditambah untuk siswa SMA.',
        status: 'new',
        createdAt: new Date('2026-04-28T12:05:00'),
      },
    ]);

    // ============================================================
    // 7. ARTICLES
    // ============================================================
    console.log('📰 Membuat Artikel Publik...');
    await db.insert(schema.articles).values([
      {
        title: 'Pentingnya Gizi Seimbang untuk Prestasi Anak',
        summary: 'Gizi yang baik dapat meningkatkan daya ingat dan fokus belajar siswa di kelas.',
        content: 'Gizi seimbang adalah fondasi penting bagi tumbuh kembang anak. Asupan protein, karbohidrat, lemak, vitamin, dan mineral yang tepat setiap hari terbukti meningkatkan konsentrasi belajar dan daya tahan tubuh siswa. Program Makan Bergizi Gratis hadir sebagai solusi nyata untuk memastikan setiap anak Indonesia mendapatkan haknya atas pangan bergizi.',
        author: 'Dr. Hendra Kusuma',
        coverImageUrl: 'https://placehold.co/800x400/4A90D9/ffffff?text=Gizi+Anak',
      },
      {
        title: 'Program Makan Siang Gratis Dimulai di Bekasi',
        summary: 'Dapur Umum SPPG Bekasi resmi beroperasi melayani 3000 porsi per hari untuk sekolah-sekolah di sekitarnya.',
        content: 'Dapur Gizi Nusantara Bekasi resmi beroperasi sejak April 2026 dengan kapasitas 3000 porsi per hari. Program ini menjangkau lebih dari 10 sekolah di wilayah Bekasi Selatan dan Bekasi Utara. Dengan menu yang dirancang ahli gizi, setiap porsi memenuhi kebutuhan kalori dan nutrisi harian siswa.',
        author: 'Admin SIMBA',
        coverImageUrl: 'https://placehold.co/800x400/2E7D32/ffffff?text=SPPG+Bekasi',
      },
      {
        title: 'Transparansi Distribusi Pangan: Peran SIMBA',
        summary: 'SIMBA hadir sebagai platform monitoring yang menghubungkan dapur, sekolah, dan masyarakat secara transparan.',
        content: 'SIMBA (Sistem Informasi Makan Bergizi) adalah platform digital yang memungkinkan masyarakat memantau distribusi makanan bergizi di sekolah-sekolah secara real-time. Dengan fitur peta interaktif, profil dapur, dan laporan sekolah, SIMBA memastikan program MBG berjalan transparan dan akuntabel.',
        author: 'Tim SIMBA',
        coverImageUrl: 'https://placehold.co/800x400/1565C0/ffffff?text=Transparansi+SIMBA',
      },
    ]);

    console.log('');
    console.log('✅ Seeding Selesai!');
    console.log('');
    console.log('📊 Ringkasan data yang dibuat:');
    console.log('   👤 Users     : 9 (3 SPPG + 6 Sekolah)');
    console.log('   🍲 SPPG      : 3 dapur (Jakarta, Bekasi, Depok)');
    console.log('   🏫 Sekolah   : 6 sekolah');
    console.log('   🍱 Menu      : 15 entri (Senin–Jumat × 3 SPPG, minggu ini)');
    console.log('   📋 Laporan   : 5 school reports');
    console.log('   🔔 Notif     : 5 notifikasi');
    console.log('   📰 Artikel   : 3 artikel');
    console.log('');
    console.log('🔑 Akun Demo:');
    console.log('   SPPG    → dapur.jakarta@simba.id  / password123');
    console.log('   Sekolah → sdn.sukamaju01@simba.id / password123');

  } catch (error) {
    console.error('❌ Gagal melakukan seeding:', error);
  } finally {
    process.exit(0);
  }
}

main();