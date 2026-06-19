const express = require('express');
const db = require('../db');
const { scoreForDate, compareStatus, isApplicable, prevDateStr, ymd } = require('../lib/score');
const { requireAuth, effectiveUserId } = require('../lib/auth');

const router = express.Router();
router.use(requireAuth);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function pad(n) {
  return String(n).padStart(2, '0');
}
function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate(); // month: 1-12
}
function todayStr() {
  return ymd(new Date());
}

// Rata-rata skor untuk rentang tanggal [startStr..endStr], hanya hari <= hari ini.
function averageScore(userId, startStr, endStr) {
  const today = todayStr();
  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  let sum = 0;
  let count = 0;
  const series = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const ds = ymd(d);
    if (ds > today) {
      series.push({ date: ds, score: null });
      continue;
    }
    const { score } = scoreForDate(userId, ds);
    series.push({ date: ds, score });
    sum += score;
    count += 1;
  }
  return { average: count ? Math.round(sum / count) : 0, count, series };
}

// GET /api/stats/daily?date=YYYY-MM-DD
router.get('/daily', (req, res) => {
  const userId = effectiveUserId(req);
  const date = req.query.date || todayStr();
  if (!DATE_RE.test(date)) return res.status(400).json({ error: 'Format "date" salah.' });

  const isToday = date === todayStr();
  let referenceNowMin = null;
  if (isToday) {
    const now = new Date();
    referenceNowMin = now.getHours() * 60 + now.getMinutes();
  }

  const today = scoreForDate(userId, date, referenceNowMin);
  const prev = scoreForDate(userId, prevDateStr(date));
  const prevScore = prev.total > 0 ? prev.score : null;
  const status = compareStatus(today.score, prevScore);

  res.json({ ...today, prevScore, status });
});

// GET /api/stats/monthly?year=YYYY&month=M
router.get('/monthly', (req, res) => {
  const userId = effectiveUserId(req);
  const now = new Date();
  const year = parseInt(req.query.year, 10) || now.getFullYear();
  const month = parseInt(req.query.month, 10) || now.getMonth() + 1;

  const startStr = `${year}-${pad(month)}-01`;
  const endStr = `${year}-${pad(month)}-${pad(lastDayOfMonth(year, month))}`;
  const current = averageScore(userId, startStr, endStr);

  // bulan sebelumnya
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevStart = `${prevYear}-${pad(prevMonth)}-01`;
  const prevEnd = `${prevYear}-${pad(prevMonth)}-${pad(lastDayOfMonth(prevYear, prevMonth))}`;
  const previous = averageScore(userId, prevStart, prevEnd);
  const prevAvg = previous.count > 0 ? previous.average : null;

  const status = compareStatus(current.average, prevAvg);

  // konsistensi per kegiatan: % hari (yang berlaku & <= hari ini) kegiatan dilakukan
  const consistency = activityConsistency(userId, startStr, endStr);

  res.json({
    year,
    month,
    average: current.average,
    daysCounted: current.count,
    series: current.series, // { date, score|null } per tanggal
    prevAverage: prevAvg,
    status,
    consistency,
  });
});

// GET /api/stats/yearly?year=YYYY
router.get('/yearly', (req, res) => {
  const userId = effectiveUserId(req);
  const now = new Date();
  const year = parseInt(req.query.year, 10) || now.getFullYear();

  const months = monthlyAverages(userId, year);
  const prevMonths = monthlyAverages(userId, year - 1);

  const valid = months.filter((m) => m.count > 0);
  const average = valid.length
    ? Math.round(valid.reduce((s, m) => s + m.average, 0) / valid.length)
    : 0;
  const prevValid = prevMonths.filter((m) => m.count > 0);
  const prevAverage = prevValid.length
    ? Math.round(prevValid.reduce((s, m) => s + m.average, 0) / prevValid.length)
    : null;

  const status = compareStatus(average, prevAverage);

  res.json({
    year,
    average,
    prevAverage,
    status,
    months: months.map((m) => ({ month: m.month, average: m.count ? m.average : null })),
  });
});

// GET /api/stats/compare?type=month|year
// Beberapa periode terakhir untuk grafik perbandingan.
router.get('/compare', (req, res) => {
  const userId = effectiveUserId(req);
  const type = req.query.type === 'year' ? 'year' : 'month';
  const now = new Date();

  if (type === 'year') {
    const thisYear = now.getFullYear();
    const data = [];
    for (let y = thisYear - 4; y <= thisYear; y += 1) {
      const months = monthlyAverages(userId, y).filter((m) => m.count > 0);
      const avg = months.length
        ? Math.round(months.reduce((s, m) => s + m.average, 0) / months.length)
        : 0;
      data.push({ label: String(y), average: avg });
    }
    return res.json({ type, data });
  }

  // 12 bulan terakhir
  const data = [];
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const start = `${y}-${pad(m)}-01`;
    const end = `${y}-${pad(m)}-${pad(lastDayOfMonth(y, m))}`;
    const { average } = averageScore(userId, start, end);
    data.push({ label: `${names[m - 1]} ${String(y).slice(2)}`, average });
  }
  res.json({ type, data });
});

// --- helpers ---

function monthlyAverages(userId, year) {
  const out = [];
  for (let m = 1; m <= 12; m += 1) {
    const start = `${year}-${pad(m)}-01`;
    const end = `${year}-${pad(m)}-${pad(lastDayOfMonth(year, m))}`;
    const { average, count } = averageScore(userId, start, end);
    out.push({ month: m, average, count });
  }
  return out;
}

function activityConsistency(userId, startStr, endStr) {
  const activities = db.prepare('SELECT * FROM activities WHERE user_id = ? ORDER BY sort_order, id').all(userId);
  const today = todayStr();
  const logs = db
    .prepare('SELECT activity_id, date, done FROM logs WHERE user_id = ? AND date BETWEEN ? AND ?')
    .all(userId, startStr, endStr);
  const doneSet = new Set(logs.filter((l) => l.done).map((l) => `${l.activity_id}|${l.date}`));

  const start = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');

  return activities.map((a) => {
    let applicable = 0;
    let done = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = ymd(d);
      if (ds > today) break;
      if (!isApplicable(a, ds)) continue;
      applicable += 1;
      if (doneSet.has(`${a.id}|${ds}`)) done += 1;
    }
    return {
      activity_id: a.id,
      name: a.name,
      category: a.category,
      percent: applicable ? Math.round((done / applicable) * 100) : 0,
      done,
      applicable,
    };
  });
}

module.exports = router;
