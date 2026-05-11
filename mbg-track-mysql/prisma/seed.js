// prisma/seed.js — Data awal untuk database MySQL MBG-Track
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('\nMemulai seeding database MBG-Track (MySQL)...\n');

  // ── Admin ──────────────────────────────────────────────────────────────────
  const adminPw = await bcrypt.hash('Admin@MBG2025!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@mbg.go.id' },
    update: {},
    create: { name: 'Administrator Dapur MBG', email: 'admin@mbg.go.id', password: adminPw, role: 'admin' },
  });
  console.log(`[OK] Admin       : ${admin.email}`);

  // ── Sekolah ────────────────────────────────────────────────────────────────
  const schools = [
    { name: 'SDN 01 Menteng',         email: 'sdn01.menteng@mbg.go.id',   address: 'Jl. Menteng Raya No. 12, Jakarta Pusat',         principal: 'Ibu Sari Dewi Lestari, S.Pd',   students: 320 },
    { name: 'SDN 02 Kebayoran Baru',  email: 'sdn02.kebayoran@mbg.go.id', address: 'Jl. Kebayoran Lama No. 45, Jakarta Selatan',      principal: 'Bapak Hendra Gunawan, M.Pd',     students: 280 },
    { name: 'MIN 01 Cempaka Putih',   email: 'min01.cempaka@mbg.go.id',   address: 'Jl. Cempaka Putih Timur No. 8, Jakarta Pusat',   principal: 'Ibu Ratna Kusumawati, S.Pd',     students: 410 },
    { name: 'SMPN 03 Senayan',        email: 'smpn03.senayan@mbg.go.id',  address: 'Jl. Senayan No. 20, Jakarta Selatan',            principal: 'Bapak Budi Santoso, M.Si',       students: 550 },
    { name: 'SMAN 04 Kemayoran',      email: 'sman04.kemayoran@mbg.go.id',address: 'Jl. Kemayoran Raya No. 55, Jakarta Pusat',       principal: 'Ibu Siti Aminah, M.Pd',          students: 600 },
    { name: 'SDN 05 Tebet',           email: 'sdn05.tebet@mbg.go.id',     address: 'Jl. Tebet Barat No. 10, Jakarta Selatan',        principal: 'Bapak Agus Setiawan, S.Pd',      students: 350 },
    { name: 'SMPN 06 Blok M',         email: 'smpn06.blokm@mbg.go.id',    address: 'Jl. Melawai Raya No. 22, Jakarta Selatan',       principal: 'Ibu Rina Mariana, M.Si',         students: 480 },
    { name: 'SMAN 07 Thamrin',        email: 'sman07.thamrin@mbg.go.id',  address: 'Jl. MH Thamrin No. 8, Jakarta Pusat',            principal: 'Bapak Dedi Mulyadi, M.Pd',       students: 620 },
    { name: 'MIN 02 Cilandak',        email: 'min02.cilandak@mbg.go.id',  address: 'Jl. Cilandak Tengah No. 15, Jakarta Selatan',    principal: 'Ibu Lilis Suryani, S.Pd.I',      students: 310 },
    { name: 'SDN 08 Palmerah',        email: 'sdn08.palmerah@mbg.go.id',  address: 'Jl. Palmerah Barat No. 30, Jakarta Barat',       principal: 'Bapak Taufik Hidayat, M.Pd',     students: 290 },
    { name: 'SMPN 09 Setiabudi',      email: 'smpn09.setiabudi@mbg.go.id',address: 'Jl. Setiabudi Selatan No. 5, Jakarta Selatan',    principal: 'Ibu Anita Wijaya, S.Pd',         students: 520 },
    { name: 'SMAN 10 Grogol',         email: 'sman10.grogol@mbg.go.id',   address: 'Jl. Grogol Permai No. 18, Jakarta Barat',        principal: 'Bapak Bambang Susanto, M.Si',    students: 580 },
    { name: 'SDN 11 Tanah Abang',     email: 'sdn11.tabang@mbg.go.id',    address: 'Jl. KH Mas Mansyur No. 100, Jakarta Pusat',      principal: 'Ibu Erna Wati, S.Pd',            students: 330 },
    { name: 'SMPN 12 Jagakarsa',      email: 'smpn12.jagakarsa@mbg.go.id',address: 'Jl. Jagakarsa Raya No. 42, Jakarta Selatan',     principal: 'Bapak Yusuf Mansur, M.Pd',       students: 450 },
    { name: 'SMAN 13 Tanjung Priok',  email: 'sman13.priok@mbg.go.id',    address: 'Jl. Yos Sudarso No. 12, Jakarta Utara',          principal: 'Ibu Maria Ulfa, M.Si',           students: 650 },
  ];

  const pw = await bcrypt.hash('Sekolah@2025!', 12);
  for (const s of schools) {
    const u = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: { name: s.name, email: s.email, password: pw, role: 'school' },
    });
    await prisma.school.upsert({
      where: { userId: u.id },
      update: {},
      create: { name: s.name, address: s.address, principalName: s.principal, totalStudents: s.students, userId: u.id },
    });
    console.log(`[OK] Sekolah     : ${s.email}`);
  }

  // ── Kurir ──────────────────────────────────────────────────────────────────
  const couriers = [
    { name: 'Ahmad Rifai',    email: 'ahmad.rifai@mbg.go.id',    phone: '081234567890' },
    { name: 'Rudi Hermawan',  email: 'rudi.hermawan@mbg.go.id',  phone: '082345678901' },
    { name: 'Slamet Wahyudi', email: 'slamet.wahyudi@mbg.go.id', phone: '083456789012' },
  ];

  const cpw = await bcrypt.hash('Kurir@2025!', 12);
  for (const c of couriers) {
    const u = await prisma.user.upsert({
      where: { email: c.email },
      update: {},
      create: { name: c.name, email: c.email, password: cpw, role: 'courier' },
    });
    await prisma.courier.upsert({
      where: { userId: u.id },
      update: {},
      create: { name: c.name, phone: c.phone, userId: u.id },
    });
    console.log(`[OK] Kurir       : ${c.email}`);
  }

  // ── Inventaris Awal ────────────────────────────────────────────────────────
  const items = [
    { name: 'Beras',         unit: 'kg',    qty: 500  },
    { name: 'Ayam Potong',   unit: 'kg',    qty: 150  },
    { name: 'Minyak Goreng', unit: 'liter', qty: 80   },
    { name: 'Sayuran Hijau', unit: 'kg',    qty: 70   },
    { name: 'Bumbu Dapur',   unit: 'pack',  qty: 200  },
    { name: 'Telur Ayam',    unit: 'kg',    qty: 60   },
    { name: 'Garam',         unit: 'kg',    qty: 25   },
    { name: 'Gula Pasir',    unit: 'kg',    qty: 30   },
  ];

  for (const item of items) {
    const existing = await prisma.inventoryItem.findUnique({ where: { name: item.name } });
    if (!existing) {
      await prisma.inventoryItem.create({
        data: {
          name: item.name, unit: item.unit, quantity: item.qty,
          logs: { create: { quantity: item.qty, type: 'in', note: 'Stok awal (seed)' } },
        },
      });
      console.log(`[OK] Inventaris  : ${item.name} — ${item.qty} ${item.unit}`);
    }
  }

  console.log('\n✓ Seeding selesai!\n');
  console.log('┌──────────────────────────────────────────────────────────────┐');
  console.log('│  AKUN TERSEDIA                                               │');
  console.log('├────────────┬────────────────────────────────┬────────────────┤');
  console.log('│ Role       │ Email                          │ Password       │');
  console.log('├────────────┼────────────────────────────────┼────────────────┤');
  console.log('│ Admin      │ admin@mbg.go.id                │ Admin@MBG2025! │');
  console.log('│ Sekolah    │ sdn01.menteng@mbg.go.id        │ Sekolah@2025!  │');
  console.log('│ Sekolah    │ sdn02.kebayoran@mbg.go.id      │ Sekolah@2025!  │');
  console.log('│ Sekolah    │ min01.cempaka@mbg.go.id        │ Sekolah@2025!  │');
  console.log('│ Sekolah    │ smpn03.senayan@mbg.go.id       │ Sekolah@2025!  │');
  console.log('│ Sekolah    │ sman04.kemayoran@mbg.go.id     │ Sekolah@2025!  │');
  console.log('│ Sekolah    │ sdn05.tebet@mbg.go.id          │ Sekolah@2025!  │');
  console.log('│ Sekolah    │ smpn06.blokm@mbg.go.id         │ Sekolah@2025!  │');
  console.log('│ Sekolah    │ sman07.thamrin@mbg.go.id       │ Sekolah@2025!  │');
  console.log('│ Sekolah    │ min02.cilandak@mbg.go.id       │ Sekolah@2025!  │');
  console.log('│ Sekolah    │ sdn08.palmerah@mbg.go.id       │ Sekolah@2025!  │');
  console.log('│ Sekolah    │ smpn09.setiabudi@mbg.go.id     │ Sekolah@2025!  │');
  console.log('│ Sekolah    │ sman10.grogol@mbg.go.id        │ Sekolah@2025!  │');
  console.log('│ Sekolah    │ sdn11.tabang@mbg.go.id         │ Sekolah@2025!  │');
  console.log('│ Sekolah    │ smpn12.jagakarsa@mbg.go.id     │ Sekolah@2025!  │');
  console.log('│ Sekolah    │ sman13.priok@mbg.go.id         │ Sekolah@2025!  │');
  console.log('│ Kurir      │ ahmad.rifai@mbg.go.id          │ Kurir@2025!    │');
  console.log('│ Kurir      │ rudi.hermawan@mbg.go.id        │ Kurir@2025!    │');
  console.log('│ Kurir      │ slamet.wahyudi@mbg.go.id       │ Kurir@2025!    │');
  console.log('└────────────┴────────────────────────────────┴────────────────┘');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
