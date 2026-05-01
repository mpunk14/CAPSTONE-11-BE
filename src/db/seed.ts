import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import bcrypt from 'bcrypt';
import 'dotenv/config';
import * as schema from './skema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('ERROR: DATABASE_URL is missing. Add it to your .env file before seeding.');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });

const demoPassword = 'password123';

const ids = {
  users: {
    sppgKebayoran: '10000000-0000-4000-8000-000000000001',
    sppgMenteng: '10000000-0000-4000-8000-000000000002',
    sppgMatraman: '10000000-0000-4000-8000-000000000003',
    sppgPriok: '10000000-0000-4000-8000-000000000004',
    sppgCengkareng: '10000000-0000-4000-8000-000000000005',
    schoolKebayoran01: '10000000-0000-4000-8000-000000000101',
    schoolSmp12: '10000000-0000-4000-8000-000000000102',
    schoolPetogogan05: '10000000-0000-4000-8000-000000000103',
    schoolMenteng01: '10000000-0000-4000-8000-000000000104',
    schoolSmp1: '10000000-0000-4000-8000-000000000105',
    schoolGondangdia03: '10000000-0000-4000-8000-000000000106',
    schoolPisangan07: '10000000-0000-4000-8000-000000000107',
    schoolSmp97: '10000000-0000-4000-8000-000000000108',
    schoolUtanKayu01: '10000000-0000-4000-8000-000000000109',
    schoolSunter09: '10000000-0000-4000-8000-000000000110',
    schoolSmp95: '10000000-0000-4000-8000-000000000111',
    schoolKebonBawang03: '10000000-0000-4000-8000-000000000112',
    schoolCengkareng04: '10000000-0000-4000-8000-000000000113',
    schoolSmp45: '10000000-0000-4000-8000-000000000114',
    schoolRawaBuaya01: '10000000-0000-4000-8000-000000000115',
  },
  sppg: {
    kebayoran: '20000000-0000-4000-8000-000000000001',
    menteng: '20000000-0000-4000-8000-000000000002',
    matraman: '20000000-0000-4000-8000-000000000003',
    priok: '20000000-0000-4000-8000-000000000004',
    cengkareng: '20000000-0000-4000-8000-000000000005',
  },
  schools: {
    kebayoran01: '30000000-0000-4000-8000-000000000001',
    smp12: '30000000-0000-4000-8000-000000000002',
    petogogan05: '30000000-0000-4000-8000-000000000003',
    menteng01: '30000000-0000-4000-8000-000000000004',
    smp1: '30000000-0000-4000-8000-000000000005',
    gondangdia03: '30000000-0000-4000-8000-000000000006',
    pisangan07: '30000000-0000-4000-8000-000000000007',
    smp97: '30000000-0000-4000-8000-000000000008',
    utanKayu01: '30000000-0000-4000-8000-000000000009',
    sunter09: '30000000-0000-4000-8000-000000000010',
    smp95: '30000000-0000-4000-8000-000000000011',
    kebonBawang03: '30000000-0000-4000-8000-000000000012',
    cengkareng04: '30000000-0000-4000-8000-000000000013',
    smp45: '30000000-0000-4000-8000-000000000014',
    rawaBuaya01: '30000000-0000-4000-8000-000000000015',
  },
};

const usersSeed = (password: string) => [
  { id: ids.users.sppgKebayoran, email: 'sppg.kebayoran@simba.id', password, role: 'sppg' as const },
  { id: ids.users.sppgMenteng, email: 'sppg.menteng@simba.id', password, role: 'sppg' as const },
  { id: ids.users.sppgMatraman, email: 'sppg.matraman@simba.id', password, role: 'sppg' as const },
  { id: ids.users.sppgPriok, email: 'sppg.tanjungpriok@simba.id', password, role: 'sppg' as const },
  { id: ids.users.sppgCengkareng, email: 'sppg.cengkareng@simba.id', password, role: 'sppg' as const },
  { id: ids.users.schoolKebayoran01, email: 'sdn.kebayoran01@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolSmp12, email: 'smpn12.jakarta@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolPetogogan05, email: 'sdn.petogogan05@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolMenteng01, email: 'sdn.menteng01@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolSmp1, email: 'smpn1.jakarta@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolGondangdia03, email: 'sdn.gondangdia03@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolPisangan07, email: 'sdn.pisanganbaru07@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolSmp97, email: 'smpn97.jakarta@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolUtanKayu01, email: 'sdn.utankayu01@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolSunter09, email: 'sdn.sunteragung09@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolSmp95, email: 'smpn95.jakarta@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolKebonBawang03, email: 'sdn.kebonbawang03@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolCengkareng04, email: 'sdn.cengkarengbarat04@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolSmp45, email: 'smpn45.jakarta@simba.id', password, role: 'school' as const },
  { id: ids.users.schoolRawaBuaya01, email: 'sdn.rawabuaya01@simba.id', password, role: 'school' as const },
];

const sppgSeed = [
  {
    id: ids.sppg.kebayoran,
    userId: ids.users.sppgKebayoran,
    name: 'SPPG Kebayoran Baru',
    sppgCode: 'SPPG-JKS-001',
    address: 'Jl. Melawai Raya No. 12, Kebayoran Baru, Jakarta Selatan',
    personInCharge: 'Dewi Lestari',
    capacityPerDay: 5200,
    status: 'active' as const,
    lat: '-6.2441000',
    lng: '106.8005000',
  },
  {
    id: ids.sppg.menteng,
    userId: ids.users.sppgMenteng,
    name: 'SPPG Menteng Berseri',
    sppgCode: 'SPPG-JKP-002',
    address: 'Jl. HOS Cokroaminoto No. 84, Menteng, Jakarta Pusat',
    personInCharge: 'Arif Prasetyo',
    capacityPerDay: 4600,
    status: 'active' as const,
    lat: '-6.1954000',
    lng: '106.8322000',
  },
  {
    id: ids.sppg.matraman,
    userId: ids.users.sppgMatraman,
    name: 'SPPG Matraman Sehat',
    sppgCode: 'SPPG-JKT-003',
    address: 'Jl. Matraman Raya No. 55, Matraman, Jakarta Timur',
    personInCharge: 'Nurul Hasanah',
    capacityPerDay: 4100,
    status: 'active' as const,
    lat: '-6.2030000',
    lng: '106.8625000',
  },
  {
    id: ids.sppg.priok,
    userId: ids.users.sppgPriok,
    name: 'SPPG Tanjung Priok Bahari',
    sppgCode: 'SPPG-JKU-004',
    address: 'Jl. Yos Sudarso No. 18, Tanjung Priok, Jakarta Utara',
    personInCharge: 'Maya Kartika',
    capacityPerDay: 3800,
    status: 'active' as const,
    lat: '-6.1286000',
    lng: '106.8708000',
  },
  {
    id: ids.sppg.cengkareng,
    userId: ids.users.sppgCengkareng,
    name: 'SPPG Cengkareng Peduli',
    sppgCode: 'SPPG-JKB-005',
    address: 'Jl. Outer Ring Road No. 7, Cengkareng, Jakarta Barat',
    personInCharge: 'Rizky Firmansyah',
    capacityPerDay: 3400,
    status: 'maintenance' as const,
    lat: '-6.1448000',
    lng: '106.7299000',
  },
];

const schoolsSeed = [
  {
    id: ids.schools.kebayoran01,
    userId: ids.users.schoolKebayoran01,
    sppgId: ids.sppg.kebayoran,
    schoolName: 'SDN Kebayoran Baru 01',
    npsn: '20101001',
    address: 'Jl. Wijaya II No. 1, Kebayoran Baru, Jakarta Selatan',
    lat: '-6.2448000',
    lng: '106.7993000',
  },
  {
    id: ids.schools.smp12,
    userId: ids.users.schoolSmp12,
    sppgId: ids.sppg.kebayoran,
    schoolName: 'SMPN 12 Jakarta',
    npsn: '20101002',
    address: 'Jl. Pattimura No. 50, Kebayoran Baru, Jakarta Selatan',
    lat: '-6.2385000',
    lng: '106.7950000',
  },
  {
    id: ids.schools.petogogan05,
    userId: ids.users.schoolPetogogan05,
    sppgId: ids.sppg.kebayoran,
    schoolName: 'SDN Petogogan 05',
    npsn: '20101003',
    address: 'Jl. Petogogan II No. 14, Kebayoran Baru, Jakarta Selatan',
    lat: '-6.2475000',
    lng: '106.8120000',
  },
  {
    id: ids.schools.menteng01,
    userId: ids.users.schoolMenteng01,
    sppgId: ids.sppg.menteng,
    schoolName: 'SDN Menteng 01',
    npsn: '20102001',
    address: 'Jl. Besuki No. 4, Menteng, Jakarta Pusat',
    lat: '-6.1957000',
    lng: '106.8313000',
  },
  {
    id: ids.schools.smp1,
    userId: ids.users.schoolSmp1,
    sppgId: ids.sppg.menteng,
    schoolName: 'SMPN 1 Jakarta',
    npsn: '20102002',
    address: 'Jl. Cikini Raya No. 87, Menteng, Jakarta Pusat',
    lat: '-6.1779000',
    lng: '106.8311000',
  },
  {
    id: ids.schools.gondangdia03,
    userId: ids.users.schoolGondangdia03,
    sppgId: ids.sppg.menteng,
    schoolName: 'SDN Gondangdia 03',
    npsn: '20102003',
    address: 'Jl. Probolinggo No. 21, Menteng, Jakarta Pusat',
    lat: '-6.1896000',
    lng: '106.8369000',
  },
  {
    id: ids.schools.pisangan07,
    userId: ids.users.schoolPisangan07,
    sppgId: ids.sppg.matraman,
    schoolName: 'SDN Pisangan Baru 07',
    npsn: '20103001',
    address: 'Jl. Pisangan Baru Tengah No. 9, Matraman, Jakarta Timur',
    lat: '-6.2059000',
    lng: '106.8722000',
  },
  {
    id: ids.schools.smp97,
    userId: ids.users.schoolSmp97,
    sppgId: ids.sppg.matraman,
    schoolName: 'SMPN 97 Jakarta',
    npsn: '20103002',
    address: 'Jl. Galur Sari Timur No. 2, Utan Kayu Selatan, Jakarta Timur',
    lat: '-6.2010000',
    lng: '106.8675000',
  },
  {
    id: ids.schools.utanKayu01,
    userId: ids.users.schoolUtanKayu01,
    sppgId: ids.sppg.matraman,
    schoolName: 'SDN Utan Kayu Selatan 01',
    npsn: '20103003',
    address: 'Jl. Utan Kayu Raya No. 60, Matraman, Jakarta Timur',
    lat: '-6.1977000',
    lng: '106.8810000',
  },
  {
    id: ids.schools.sunter09,
    userId: ids.users.schoolSunter09,
    sppgId: ids.sppg.priok,
    schoolName: 'SDN Sunter Agung 09',
    npsn: '20104001',
    address: 'Jl. Agung Utara No. 22, Sunter Agung, Jakarta Utara',
    lat: '-6.1420000',
    lng: '106.8632000',
  },
  {
    id: ids.schools.smp95,
    userId: ids.users.schoolSmp95,
    sppgId: ids.sppg.priok,
    schoolName: 'SMPN 95 Jakarta',
    npsn: '20104002',
    address: 'Jl. Danau Sunter Utara No. 5, Tanjung Priok, Jakarta Utara',
    lat: '-6.1280000',
    lng: '106.8660000',
  },
  {
    id: ids.schools.kebonBawang03,
    userId: ids.users.schoolKebonBawang03,
    sppgId: ids.sppg.priok,
    schoolName: 'SDN Kebon Bawang 03',
    npsn: '20104003',
    address: 'Jl. Swasembada Barat No. 11, Tanjung Priok, Jakarta Utara',
    lat: '-6.1226000',
    lng: '106.8797000',
  },
  {
    id: ids.schools.cengkareng04,
    userId: ids.users.schoolCengkareng04,
    sppgId: ids.sppg.cengkareng,
    schoolName: 'SDN Cengkareng Barat 04',
    npsn: '20105001',
    address: 'Jl. Utama Raya No. 40, Cengkareng, Jakarta Barat',
    lat: '-6.1439000',
    lng: '106.7240000',
  },
  {
    id: ids.schools.smp45,
    userId: ids.users.schoolSmp45,
    sppgId: ids.sppg.cengkareng,
    schoolName: 'SMPN 45 Jakarta',
    npsn: '20105002',
    address: 'Jl. Kapuk Cengkareng No. 17, Cengkareng, Jakarta Barat',
    lat: '-6.1533000',
    lng: '106.7351000',
  },
  {
    id: ids.schools.rawaBuaya01,
    userId: ids.users.schoolRawaBuaya01,
    sppgId: ids.sppg.cengkareng,
    schoolName: 'SDN Rawa Buaya 01',
    npsn: '20105003',
    address: 'Jl. Rawa Buaya Raya No. 19, Cengkareng, Jakarta Barat',
    lat: '-6.1674000',
    lng: '106.7366000',
  },
];

const menuTemplates = [
  {
    menuDate: '2026-04-27',
    rice: 'Nasi Putih',
    sideDish: 'Ayam Kecap, Tempe Orek, dan Sayur Bening',
    fruit: 'Pisang',
    calories: '625.00',
    protein: '26.00',
    carbohydrate: '82.00',
    fat: '16.00',
  },
  {
    menuDate: '2026-04-28',
    rice: 'Nasi Merah',
    sideDish: 'Ikan Tongkol Balado, Tahu Kukus, dan Capcay',
    fruit: 'Jeruk',
    calories: '645.00',
    protein: '29.00',
    carbohydrate: '78.00',
    fat: '18.00',
  },
  {
    menuDate: '2026-04-29',
    rice: 'Nasi Putih',
    sideDish: 'Semur Daging, Telur Dadar, dan Tumis Buncis',
    fruit: 'Semangka',
    calories: '670.00',
    protein: '31.00',
    carbohydrate: '84.00',
    fat: '19.00',
  },
  {
    menuDate: '2026-04-30',
    rice: 'Nasi Uduk',
    sideDish: 'Ayam Goreng Lengkuas, Perkedel, dan Lalap Timun',
    fruit: 'Apel',
    calories: '690.00',
    protein: '28.00',
    carbohydrate: '88.00',
    fat: '21.00',
  },
  {
    menuDate: '2026-05-01',
    rice: 'Nasi Putih',
    sideDish: 'Soto Ayam, Tahu Bacem, dan Sayur Sop',
    fruit: 'Pepaya',
    calories: '635.00',
    protein: '27.00',
    carbohydrate: '81.00',
    fat: '17.00',
  },
  {
    menuDate: '2026-05-04',
    rice: 'Nasi Kuning',
    sideDish: 'Ayam Suwir, Telur Balado, dan Urap Sayur',
    fruit: 'Melon',
    calories: '680.00',
    protein: '30.00',
    carbohydrate: '86.00',
    fat: '20.00',
  },
  {
    menuDate: '2026-05-05',
    rice: 'Nasi Putih',
    sideDish: 'Lele Goreng, Tempe Mendoan, dan Sayur Asem',
    fruit: 'Pisang',
    calories: '650.00',
    protein: '28.00',
    carbohydrate: '83.00',
    fat: '18.00',
  },
  {
    menuDate: '2026-05-06',
    rice: 'Nasi Merah',
    sideDish: 'Daging Bumbu Bali, Tahu Goreng, dan Cah Kangkung',
    fruit: 'Jeruk',
    calories: '665.00',
    protein: '32.00',
    carbohydrate: '79.00',
    fat: '19.00',
  },
  {
    menuDate: '2026-05-07',
    rice: 'Nasi Putih',
    sideDish: 'Opor Ayam, Telur Rebus, dan Tumis Labu Siam',
    fruit: 'Apel',
    calories: '675.00',
    protein: '30.00',
    carbohydrate: '85.00',
    fat: '20.00',
  },
  {
    menuDate: '2026-05-08',
    rice: 'Nasi Gurih',
    sideDish: 'Pepes Ikan, Perkedel Jagung, dan Sup Wortel',
    fruit: 'Semangka',
    calories: '640.00',
    protein: '29.00',
    carbohydrate: '80.00',
    fat: '18.00',
  },
];

const menusSeed = sppgSeed.flatMap((unit, unitIndex) =>
  menuTemplates.map((menu, menuIndex) => {
    const calorieBump = unitIndex * 5 + (menuIndex % 2) * 3;
    const proteinBump = unitIndex % 2;

    return {
      sppgId: unit.id,
      menuDate: menu.menuDate,
      rice: menu.rice,
      sideDish: menu.sideDish,
      fruit: menu.fruit,
      calories: (Number(menu.calories) + calorieBump).toFixed(2),
      protein: (Number(menu.protein) + proteinBump).toFixed(2),
      carbohydrate: menu.carbohydrate,
      fat: menu.fat,
    };
  }),
);

const reportsSeed = [
  {
    schoolId: ids.schools.kebayoran01,
    sppgId: ids.sppg.kebayoran,
    note: 'Porsi diterima lengkap, suhu makanan masih hangat, dan siswa menyukai menu soto ayam.',
    rating: 5,
    status: 'reviewed' as const,
    submittedAt: new Date('2026-05-01T10:25:00+07:00'),
  },
  {
    schoolId: ids.schools.smp12,
    sppgId: ids.sppg.kebayoran,
    note: 'Distribusi terlambat 20 menit karena kepadatan lalu lintas di sekitar sekolah.',
    rating: 4,
    status: 'received' as const,
    submittedAt: new Date('2026-05-01T11:05:00+07:00'),
  },
  {
    schoolId: ids.schools.petogogan05,
    sppgId: ids.sppg.kebayoran,
    note: 'Menu sesuai rencana, namun jumlah sendok cadangan perlu ditambah.',
    rating: 4,
    status: 'submitted' as const,
    submittedAt: new Date('2026-05-01T11:40:00+07:00'),
  },
  {
    schoolId: ids.schools.menteng01,
    sppgId: ids.sppg.menteng,
    note: 'Anak-anak sangat antusias dengan buah jeruk dan lauk ikan tongkol.',
    rating: 5,
    status: 'reviewed' as const,
    submittedAt: new Date('2026-04-30T10:35:00+07:00'),
  },
  {
    schoolId: ids.schools.smp1,
    sppgId: ids.sppg.menteng,
    note: 'Kualitas makanan baik, kemasan rapi, dan tidak ada porsi rusak.',
    rating: 5,
    status: 'reviewed' as const,
    submittedAt: new Date('2026-04-30T10:55:00+07:00'),
  },
  {
    schoolId: ids.schools.gondangdia03,
    sppgId: ids.sppg.menteng,
    note: 'Sayur capcay agak asin untuk sebagian siswa kelas rendah.',
    rating: 4,
    status: 'received' as const,
    submittedAt: new Date('2026-04-29T11:15:00+07:00'),
  },
  {
    schoolId: ids.schools.pisangan07,
    sppgId: ids.sppg.matraman,
    note: 'Jumlah paket sesuai daftar hadir dan pengiriman tiba sebelum jam istirahat.',
    rating: 5,
    status: 'reviewed' as const,
    submittedAt: new Date('2026-05-01T10:10:00+07:00'),
  },
  {
    schoolId: ids.schools.smp97,
    sppgId: ids.sppg.matraman,
    note: 'Beberapa paket nasi kurang padat untuk siswa SMP, mohon dievaluasi.',
    rating: 3,
    status: 'received' as const,
    submittedAt: new Date('2026-04-30T11:50:00+07:00'),
  },
  {
    schoolId: ids.schools.utanKayu01,
    sppgId: ids.sppg.matraman,
    note: 'Menu bervariasi dan buah diterima dalam kondisi segar.',
    rating: 5,
    status: 'reviewed' as const,
    submittedAt: new Date('2026-04-29T10:45:00+07:00'),
  },
  {
    schoolId: ids.schools.sunter09,
    sppgId: ids.sppg.priok,
    note: 'Ada tiga paket dengan tutup kurang rapat, sudah dipisahkan oleh petugas sekolah.',
    rating: 3,
    status: 'submitted' as const,
    submittedAt: new Date('2026-05-01T11:20:00+07:00'),
  },
  {
    schoolId: ids.schools.smp95,
    sppgId: ids.sppg.priok,
    note: 'Paket tiba tepat waktu dan menu sesuai dengan daftar menu mingguan.',
    rating: 5,
    status: 'reviewed' as const,
    submittedAt: new Date('2026-04-30T10:20:00+07:00'),
  },
  {
    schoolId: ids.schools.kebonBawang03,
    sppgId: ids.sppg.priok,
    note: 'Porsi lauk cukup, namun siswa meminta variasi buah selain pisang.',
    rating: 4,
    status: 'received' as const,
    submittedAt: new Date('2026-04-29T10:40:00+07:00'),
  },
  {
    schoolId: ids.schools.cengkareng04,
    sppgId: ids.sppg.cengkareng,
    note: 'Distribusi tetap berjalan baik selama dapur menjalani perawatan alat masak.',
    rating: 4,
    status: 'received' as const,
    submittedAt: new Date('2026-05-01T10:30:00+07:00'),
  },
  {
    schoolId: ids.schools.smp45,
    sppgId: ids.sppg.cengkareng,
    note: 'Kemasan bersih dan rapi, tetapi pengiriman datang 15 menit setelah jadwal.',
    rating: 4,
    status: 'submitted' as const,
    submittedAt: new Date('2026-04-30T11:35:00+07:00'),
  },
  {
    schoolId: ids.schools.rawaBuaya01,
    sppgId: ids.sppg.cengkareng,
    note: 'Siswa menyukai menu nasi kuning dan lauk ayam suwir pada distribusi terakhir.',
    rating: 5,
    status: 'reviewed' as const,
    submittedAt: new Date('2026-04-29T10:30:00+07:00'),
  },
];

const notificationsSeed = [
  {
    sppgId: ids.sppg.kebayoran,
    schoolId: ids.schools.kebayoran01,
    type: 'notification' as const,
    message: 'SDN Kebayoran Baru 01 mengonfirmasi seluruh paket diterima lengkap.',
    status: 'received' as const,
    createdAt: new Date('2026-05-01T10:30:00+07:00'),
  },
  {
    sppgId: ids.sppg.kebayoran,
    schoolId: ids.schools.smp12,
    type: 'complaint' as const,
    message: 'SMPN 12 Jakarta melaporkan keterlambatan distribusi sekitar 20 menit.',
    status: 'new' as const,
    createdAt: new Date('2026-05-01T11:08:00+07:00'),
  },
  {
    sppgId: ids.sppg.kebayoran,
    schoolId: ids.schools.petogogan05,
    type: 'feedback' as const,
    message: 'SDN Petogogan 05 meminta tambahan sendok cadangan untuk distribusi berikutnya.',
    status: 'new' as const,
    createdAt: new Date('2026-05-01T11:45:00+07:00'),
  },
  {
    sppgId: ids.sppg.menteng,
    schoolId: ids.schools.menteng01,
    type: 'notification' as const,
    message: 'SDN Menteng 01 memberi rating 5 untuk menu ikan tongkol dan buah jeruk.',
    status: 'reviewed' as const,
    createdAt: new Date('2026-04-30T10:38:00+07:00'),
  },
  {
    sppgId: ids.sppg.menteng,
    schoolId: ids.schools.gondangdia03,
    type: 'feedback' as const,
    message: 'SDN Gondangdia 03 mencatat rasa capcay agak asin.',
    status: 'received' as const,
    createdAt: new Date('2026-04-29T11:18:00+07:00'),
  },
  {
    sppgId: ids.sppg.matraman,
    schoolId: ids.schools.pisangan07,
    type: 'notification' as const,
    message: 'SDN Pisangan Baru 07 menerima paket sebelum jam istirahat.',
    status: 'reviewed' as const,
    createdAt: new Date('2026-05-01T10:15:00+07:00'),
  },
  {
    sppgId: ids.sppg.matraman,
    schoolId: ids.schools.smp97,
    type: 'feedback' as const,
    message: 'SMPN 97 Jakarta meminta porsi nasi lebih padat untuk siswa SMP.',
    status: 'received' as const,
    createdAt: new Date('2026-04-30T11:55:00+07:00'),
  },
  {
    sppgId: ids.sppg.priok,
    schoolId: ids.schools.sunter09,
    type: 'complaint' as const,
    message: 'SDN Sunter Agung 09 menemukan tiga tutup paket kurang rapat.',
    status: 'new' as const,
    createdAt: new Date('2026-05-01T11:23:00+07:00'),
  },
  {
    sppgId: ids.sppg.priok,
    schoolId: ids.schools.smp95,
    type: 'notification' as const,
    message: 'SMPN 95 Jakarta mengonfirmasi menu sesuai rencana mingguan.',
    status: 'reviewed' as const,
    createdAt: new Date('2026-04-30T10:25:00+07:00'),
  },
  {
    sppgId: ids.sppg.cengkareng,
    schoolId: ids.schools.smp45,
    type: 'complaint' as const,
    message: 'SMPN 45 Jakarta melaporkan pengiriman datang 15 menit setelah jadwal.',
    status: 'new' as const,
    createdAt: new Date('2026-04-30T11:40:00+07:00'),
  },
];

const mealDocumentationSeed = [
  {
    sppgId: ids.sppg.kebayoran,
    targetSchoolId: ids.schools.kebayoran01,
    productionDate: '2026-05-01',
    photoUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=900&q=80',
    notes: 'Paket soto ayam siap dikirim untuk SDN Kebayoran Baru 01.',
    uploadedByRole: 'sppg' as const,
  },
  {
    sppgId: ids.sppg.kebayoran,
    targetSchoolId: ids.schools.smp12,
    productionDate: '2026-05-01',
    photoUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=900&q=80',
    notes: 'Dokumentasi penerimaan paket oleh petugas SMPN 12 Jakarta.',
    uploadedByRole: 'school' as const,
  },
  {
    sppgId: ids.sppg.menteng,
    targetSchoolId: ids.schools.menteng01,
    productionDate: '2026-04-30',
    photoUrl: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=900&q=80',
    notes: 'Menu nasi uduk dan lauk ayam goreng lengkuas.',
    uploadedByRole: 'sppg' as const,
  },
  {
    sppgId: ids.sppg.menteng,
    targetSchoolId: ids.schools.gondangdia03,
    productionDate: '2026-04-29',
    photoUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=900&q=80',
    notes: 'Verifikasi kualitas buah dan sayur sebelum distribusi.',
    uploadedByRole: 'school' as const,
  },
  {
    sppgId: ids.sppg.matraman,
    targetSchoolId: ids.schools.pisangan07,
    productionDate: '2026-05-01',
    photoUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&q=80',
    notes: 'Paket makan tiba sebelum jam istirahat pertama.',
    uploadedByRole: 'school' as const,
  },
  {
    sppgId: ids.sppg.matraman,
    targetSchoolId: null,
    productionDate: '2026-05-01',
    photoUrl: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=900&q=80',
    notes: 'Persiapan umum dapur sebelum pembagian rute Matraman.',
    uploadedByRole: 'sppg' as const,
  },
  {
    sppgId: ids.sppg.priok,
    targetSchoolId: ids.schools.smp95,
    productionDate: '2026-04-30',
    photoUrl: 'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?w=900&q=80',
    notes: 'Paket siap kirim untuk rute Tanjung Priok.',
    uploadedByRole: 'sppg' as const,
  },
  {
    sppgId: ids.sppg.cengkareng,
    targetSchoolId: ids.schools.rawaBuaya01,
    productionDate: '2026-04-29',
    photoUrl: 'https://images.unsplash.com/photo-1528712306091-ed0763094c98?w=900&q=80',
    notes: 'Dokumentasi penerimaan nasi kuning dan ayam suwir.',
    uploadedByRole: 'school' as const,
  },
];

const articlesSeed = [
  {
    title: 'Mengapa Sarapan Bergizi Membantu Konsentrasi Belajar',
    summary: 'Asupan karbohidrat kompleks, protein, buah, dan sayur membantu siswa tetap fokus hingga jam pelajaran terakhir.',
    content:
      'Menu makan bergizi yang terencana membantu siswa menjaga energi, konsentrasi, dan daya tahan tubuh. Kombinasi nasi, lauk berprotein, sayur, dan buah memberi sumber tenaga sekaligus zat gizi mikro yang dibutuhkan selama kegiatan belajar. Dalam pelaksanaan MBG, sekolah dan SPPG perlu mencatat penerimaan menu agar kualitasnya dapat dievaluasi setiap hari.',
    coverImageUrl: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1200&q=80',
    author: 'Tim Edukasi Gizi SIMBA',
    publishedAt: new Date('2026-04-24T08:00:00+07:00'),
  },
  {
    title: 'Standar Distribusi Aman untuk Paket Makan Sekolah',
    summary: 'Pengiriman tepat waktu, kemasan tertutup, dan dokumentasi penerimaan menjadi kunci mutu layanan SPPG.',
    content:
      'Distribusi makanan sekolah perlu memperhatikan kebersihan, waktu tempuh, dan kondisi kemasan. Petugas SPPG menyiapkan paket berdasarkan rute sekolah, sementara pihak sekolah memverifikasi jumlah dan kondisi makanan saat tiba. Setiap catatan keterlambatan atau kemasan rusak perlu dilaporkan agar dapur dapat segera melakukan perbaikan operasional.',
    coverImageUrl: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=1200&q=80',
    author: 'Admin Operasional SIMBA',
    publishedAt: new Date('2026-04-25T09:30:00+07:00'),
  },
  {
    title: 'Peran Laporan Sekolah dalam Evaluasi Program MBG',
    summary: 'Laporan harian sekolah membantu dapur membaca pola masalah dan meningkatkan kepuasan siswa.',
    content:
      'Laporan dari sekolah bukan hanya catatan keluhan. Data rating, status tindak lanjut, dan catatan penerimaan membantu SPPG memantau mutu menu dari hari ke hari. Dengan laporan yang konsisten, tim operasional dapat melihat pola keterlambatan, menyesuaikan porsi, dan menjaga variasi menu agar sesuai kebutuhan siswa.',
    coverImageUrl: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=1200&q=80',
    author: 'Pusat Pemantauan SIMBA',
    publishedAt: new Date('2026-04-27T10:00:00+07:00'),
  },
  {
    title: 'Membaca Data Peta SPPG dan Sekolah di SIMBA',
    summary: 'Peta publik memudahkan masyarakat melihat dapur aktif, sekolah mitra, dan cakupan layanan di wilayah Jakarta.',
    content:
      'Peta SIMBA menghubungkan titik SPPG dengan sekolah mitra berdasarkan koordinat lokasi. Data ini membantu masyarakat melihat cakupan layanan, kapasitas dapur, dan hubungan distribusi antar unit. Untuk MVP, setiap SPPG dan sekolah perlu memiliki koordinat valid agar peta dapat menampilkan marker dan garis relasi dengan benar.',
    coverImageUrl: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200&q=80',
    author: 'Tim Produk SIMBA',
    publishedAt: new Date('2026-04-29T13:00:00+07:00'),
  },
  {
    title: 'Variasi Menu Mingguan untuk Anak Usia Sekolah',
    summary: 'Rotasi lauk, sayur, dan buah membuat siswa lebih antusias serta membantu pemenuhan gizi harian.',
    content:
      'Variasi menu membantu siswa mendapatkan sumber gizi yang lebih lengkap. Rotasi antara ayam, ikan, telur, tahu, tempe, sayur hijau, dan buah segar membuat program makan bergizi terasa lebih menyenangkan. Data menu mingguan juga memudahkan sekolah memberi masukan jika ada rasa, porsi, atau jenis makanan yang perlu disesuaikan.',
    coverImageUrl: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=1200&q=80',
    author: 'Ahli Gizi Mitra SIMBA',
    publishedAt: new Date('2026-05-01T07:30:00+07:00'),
  },
];

async function clearExistingData() {
  await db.delete(schema.notifications);
  await db.delete(schema.schoolReports);
  await db.delete(schema.mealDocumentation);
  await db.delete(schema.menus);
  await db.delete(schema.articles);
  await db.delete(schema.schools);
  await db.delete(schema.sppg);
  await db.delete(schema.users);
}

async function main() {
  console.log('Starting SIMBA database seed...');

  try {
    const hashedPassword = await bcrypt.hash(demoPassword, 10);

    await clearExistingData();
    console.log('Old seed data cleared.');

    await db.insert(schema.users).values(usersSeed(hashedPassword));
    await db.insert(schema.sppg).values(sppgSeed);
    await db.insert(schema.schools).values(schoolsSeed);
    await db.insert(schema.menus).values(menusSeed);
    await db.insert(schema.schoolReports).values(reportsSeed);
    await db.insert(schema.notifications).values(notificationsSeed);
    await db.insert(schema.mealDocumentation).values(mealDocumentationSeed);
    await db.insert(schema.articles).values(articlesSeed);

    console.log('Seed completed successfully.');
    console.log('');
    console.log('Data summary:');
    console.log(`- Users: ${usersSeed(hashedPassword).length} demo accounts`);
    console.log(`- SPPG: ${sppgSeed.length} Jakarta-area kitchens`);
    console.log(`- Schools: ${schoolsSeed.length} partner schools`);
    console.log(`- Menus: ${menusSeed.length} entries across 2026-04-27 to 2026-05-08`);
    console.log(`- Reports: ${reportsSeed.length} school reports`);
    console.log(`- Notifications: ${notificationsSeed.length} SPPG dashboard items`);
    console.log(`- Meal documentation: ${mealDocumentationSeed.length} upload records`);
    console.log(`- Articles: ${articlesSeed.length} public article records`);
    console.log('');
    console.log('Demo login:');
    console.log(`- SPPG: sppg.kebayoran@simba.id / ${demoPassword}`);
    console.log(`- School: sdn.kebayoran01@simba.id / ${demoPassword}`);
    console.log('');
    console.log('Stable profile IDs for manual testing:');
    console.log(`- SPPG Kebayoran Baru: ${ids.sppg.kebayoran}`);
    console.log(`- SDN Kebayoran Baru 01: ${ids.schools.kebayoran01}`);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
