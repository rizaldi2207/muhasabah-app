const db = require('./db');

// Daftar kegiatan default bertema ibadah harian. Semua dapat diedit/dihapus
// oleh pengguna; seed ini hanya dijalankan saat tabel masih kosong.
const DEFAULT_ACTIVITIES = [
  { name: 'Bangun tidur',            category: 'Rutinitas',     target_time: '03:30', weight: 1 },
  { name: 'Sholat Tahajud',          category: 'Ibadah Sunnah', target_time: '03:45', weight: 2 },
  { name: 'Tilawah Al-Qur’an',  category: 'Ibadah Sunnah', target_time: '04:00', weight: 2 },
  { name: 'Mandi sebelum subuh',     category: 'Rutinitas',     target_time: '04:30', weight: 1 },
  { name: 'Sholat Subuh berjamaah',  category: 'Ibadah Wajib',  target_time: '04:45', weight: 3 },
  { name: 'Dzikir pagi',             category: 'Ibadah Sunnah', target_time: '05:15', weight: 2 },
  { name: 'Sholat Dhuha',            category: 'Ibadah Sunnah', target_time: '07:00', weight: 2 },
  { name: 'Sholat Dzuhur',           category: 'Ibadah Wajib',  target_time: '12:15', weight: 3 },
  { name: 'Sholat Ashar',            category: 'Ibadah Wajib',  target_time: '15:30', weight: 3 },
  { name: 'Dzikir petang',           category: 'Ibadah Sunnah', target_time: '17:00', weight: 2 },
  { name: 'Sholat Maghrib',          category: 'Ibadah Wajib',  target_time: '18:00', weight: 3 },
  { name: 'Tilawah ba’da Maghrib', category: 'Ibadah Sunnah', target_time: '18:30', weight: 2 },
  { name: 'Sholat Isya',             category: 'Ibadah Wajib',  target_time: '19:15', weight: 3 },
  { name: 'Muhasabah malam',         category: 'Rutinitas',     target_time: '21:00', weight: 1 },
];

// Isi kegiatan default untuk satu pengguna. Hanya berjalan bila pengguna
// tersebut belum memiliki kegiatan apa pun.
function seedForUser(userId) {
  const { count } = db
    .prepare('SELECT COUNT(*) AS count FROM activities WHERE user_id = ?')
    .get(userId);
  if (count > 0) return false;

  const insert = db.prepare(`
    INSERT INTO activities (user_id, name, category, target_time, type, weight, sort_order, active)
    VALUES (@user_id, @name, @category, @target_time, 'daily', @weight, @sort_order, 1)
  `);
  const insertMany = db.transaction((rows) => {
    rows.forEach((row, i) => insert.run({ ...row, user_id: userId, sort_order: i }));
  });
  insertMany(DEFAULT_ACTIVITIES);
  return true;
}

module.exports = { seedForUser, DEFAULT_ACTIVITIES };
