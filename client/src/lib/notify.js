// Registrasi service worker (PWA) + pengingat berbasis Notification API.
// Catatan: notifikasi hanya muncul selama aplikasi/tab terbuka. Pengingat saat
// aplikasi tertutup memerlukan Web Push + server berjadwal (di luar lingkup awal).

import { api, todayStr } from '../api.js';

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}

export function notificationSupported() {
  return 'Notification' in window;
}

export async function requestNotificationPermission() {
  if (!notificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  const result = await Notification.requestPermission();
  return result;
}

function showNotification(title, body) {
  if (!notificationSupported() || Notification.permission !== 'granted') return;
  const options = {
    body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    tag: 'muhasabah-reminder',
  };
  if (navigator.serviceWorker && navigator.serviceWorker.ready) {
    navigator.serviceWorker.ready
      .then((reg) => reg.showNotification(title, options))
      .catch(() => new Notification(title, options));
  } else {
    new Notification(title, options);
  }
}

// penanda agar tidak notifikasi ganda di hari yang sama
function notifiedKey(date, activityId) {
  return `notified:${date}:${activityId}`;
}

let timer = null;

// Mulai scheduler: tiap menit cek kegiatan yang jam targetnya tiba & belum dilakukan.
export function startReminderScheduler() {
  if (timer) return;
  const tick = async () => {
    if (Notification.permission !== 'granted') return;
    try {
      const date = todayStr();
      const { items } = await api.getDay(date);
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      for (const it of items) {
        if (it.done || !it.target_time) continue;
        const [h, m] = it.target_time.split(':').map(Number);
        const targetMin = h * 60 + m;
        // tepat saat jam target (jendela 1 menit)
        if (nowMin === targetMin) {
          const key = notifiedKey(date, it.activity_id);
          if (!localStorage.getItem(key)) {
            showNotification('Saatnya: ' + it.name, `Jam ${it.target_time} — sudah dilakukan?`);
            localStorage.setItem(key, '1');
          }
        }
      }
    } catch {
      /* offline / error diabaikan */
    }
  };
  tick();
  timer = setInterval(tick, 60 * 1000);
}

export function stopReminderScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}

export function testNotification() {
  showNotification('Pengingat aktif', 'Notifikasi Muhasabah Harian berhasil diaktifkan.');
}
