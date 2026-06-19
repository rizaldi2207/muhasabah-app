const db = require('../db');

const LATE_GRACE_MINUTES = 15; // toleransi keterlambatan dianggap tepat waktu
const LATE_FACTOR = 0.5;       // poin untuk kegiatan yang dilakukan tapi terlambat

// --- util waktu ---
function toMinutes(hhmm) {
  if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// 0=Minggu .. 6=Sabtu (mengikuti Date.getUTCDay), dihitung dari string YYYY-MM-DD
function dayOfWeek(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function isApplicable(activity, dateStr) {
  if (!activity.active) return false;
  if (activity.type === 'weekly' && activity.days_of_week) {
    const days = activity.days_of_week.split(',').map((s) => Number(s.trim()));
    return days.includes(dayOfWeek(dateStr));
  }
  return true; // daily, atau weekly tanpa pembatasan hari
}

// Status sebuah item untuk satu tanggal.
// referenceNowMin (opsional): menit-dalam-hari "sekarang", dipakai membedakan
// 'pending' (belum waktunya / masih bisa) vs 'missed' (sudah lewat & belum dilakukan).
function itemStatus(activity, log, referenceNowMin = null) {
  const weight = activity.weight || 1;
  const target = toMinutes(activity.target_time);

  if (log && log.done) {
    const doneMin = toMinutes(log.done_time);
    const onTime =
      target === null ||
      doneMin === null ||
      doneMin <= target + LATE_GRACE_MINUTES;
    return {
      status: onTime ? 'done-ontime' : 'done-late',
      points: onTime ? weight : weight * LATE_FACTOR,
      maxPoints: weight,
      done: true,
      onTime,
    };
  }

  // belum dilakukan
  let status = 'pending';
  if (referenceNowMin !== null && target !== null && referenceNowMin > target + LATE_GRACE_MINUTES) {
    status = 'missed';
  } else if (referenceNowMin === null && target !== null) {
    // tanggal lampau (tanpa "now"): yang belum dilakukan dianggap terlewat
    status = 'missed';
  }
  return { status, points: 0, maxPoints: weight, done: false, onTime: false };
}

// Hitung skor satu tanggal untuk satu pengguna. referenceNowMin opsional (hari berjalan).
function scoreForDate(userId, dateStr, referenceNowMin = null) {
  const activities = db
    .prepare('SELECT * FROM activities WHERE user_id = ? ORDER BY sort_order, id')
    .all(userId)
    .filter((a) => isApplicable(a, dateStr));

  const logs = db.prepare('SELECT * FROM logs WHERE user_id = ? AND date = ?').all(userId, dateStr);
  const logByActivity = new Map(logs.map((l) => [l.activity_id, l]));

  let points = 0;
  let maxPoints = 0;
  let completed = 0;
  let ontime = 0;

  const items = activities.map((a) => {
    const log = logByActivity.get(a.id) || null;
    const st = itemStatus(a, log, referenceNowMin);
    points += st.points;
    maxPoints += st.maxPoints;
    if (st.done) completed += 1;
    if (st.onTime) ontime += 1;
    return {
      activity_id: a.id,
      name: a.name,
      category: a.category,
      target_time: a.target_time,
      weight: a.weight,
      type: a.type,
      done: st.done ? 1 : 0,
      done_time: log ? log.done_time : null,
      note: log ? log.note : null,
      status: st.status,
      points: st.points,
    };
  });

  const score = maxPoints > 0 ? Math.round((points / maxPoints) * 100) : 0;

  return {
    date: dateStr,
    score,
    points,
    maxPoints,
    total: activities.length,
    completed,
    ontime,
    items,
  };
}

// Bandingkan skor terhadap skor pembanding (kemarin / periode sebelumnya).
function compareStatus(score, prevScore) {
  if (prevScore === null || prevScore === undefined) {
    return {
      key: 'start',
      label: 'Awal',
      color: 'slate',
      message: 'Belum ada data pembanding. Mulailah hari ini dengan niat terbaik.',
    };
  }
  if (score > prevScore) {
    return {
      key: 'beruntung',
      label: 'Beruntung',
      color: 'green',
      message: 'Hari ini lebih baik dari kemarin — engkau tergolong orang yang beruntung.',
    };
  }
  if (score === prevScore) {
    return {
      key: 'merugi',
      label: 'Merugi',
      color: 'amber',
      message: 'Hari ini sama dengan kemarin — engkau termasuk orang yang merugi.',
    };
  }
  return {
    key: 'celaka',
    label: 'Celaka',
    color: 'red',
    message: 'Hari ini lebih buruk dari kemarin — berhati-hatilah, perbaiki esok hari.',
  };
}

// util tanggal: kembalikan "YYYY-MM-DD" dari Date
function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function prevDateStr(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return ymd(dt);
}

module.exports = {
  scoreForDate,
  compareStatus,
  isApplicable,
  dayOfWeek,
  prevDateStr,
  ymd,
  toMinutes,
  LATE_GRACE_MINUTES,
};
