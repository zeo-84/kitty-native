// 🔔 نوتیفیکیشن بومی اندروید — فقط وقتی اپ داخل Capacitor باشه فعال می‌شه

function isNative() {
  return !!(
    window.Capacitor &&
    Capacitor.Plugins &&
    Capacitor.Plugins.LocalNotifications
  );
}

function reminderDate(r) {
  if (!r) return null;
  if (r.at) {
    const d = new Date(r.at);
    if (!isNaN(d)) return d;
  }
  if (r.timestamp) {
    const d = new Date(r.timestamp);
    if (!isNaN(d)) return d;
  }
  if (r.date && r.time) {
    const d = new Date(r.date + "T" + r.time);
    if (!isNaN(d)) return d;
  }
  if (r.day && r.time && typeof jalaliToGregorian === "function") {
    const p = String(r.day).split("-").map(Number);
    const g = jalaliToGregorian(p[0], p[1], p[2]);
    const t = r.time.split(":").map(Number);
    const d = new Date(g[0], g[1] - 1, g[2], t[0] || 0, t[1] || 0);
    if (!isNaN(d)) return d;
  }
  return null;
}

async function syncNativeReminders() {
  if (!isNative()) return;
  try {
    const LN = Capacitor.Plugins.LocalNotifications;
    let perm = await LN.checkPermissions();
    if (perm.display !== "granted") perm = await LN.requestPermissions();
    if (perm.display !== "granted") return;

    const rems = Storage.get("reminders", []);
    const now = Date.now();
    const pending = [];
    rems.forEach((r, i) => {
      const d = reminderDate(r);
      if (d && d.getTime() > now && !r.done) {
        pending.push({
          id: i + 1,
          title: r.title || "یادآور",
          body: r.desc || "وقتشه!",
          at: d,
        });
      }
    });

    // قبلی‌ها رو لغو کن و دوباره زمان‌بندی کن
    const prev = Storage.get("nativeIds", []);
    if (prev.length)
      await LN.cancel({ notifications: prev.map((id) => ({ id })) });

    if (pending.length) {
      await LN.schedule({
        notifications: pending.map((p) => ({
          id: p.id,
          title: "⏰ " + p.title,
          body: p.body,
          schedule: { at: p.at, allowWhileIdle: true },
        })),
      });
    }
    Storage.set(
      "nativeIds",
      pending.map((p) => p.id)
    );
  } catch (e) {
    console.log("native notif error:", e);
  }
}

// هر بار یادآورها عوض شدن → سینک با سیستم‌عامل
if (typeof Storage !== "undefined") {
  const _origSet = Storage.set.bind(Storage);
  Storage.set = function (key, val) {
    _origSet(key, val);
    if (key === "reminders") setTimeout(syncNativeReminders, 100);
  };
}

// سینک اول هنگام شروع اپ
window.addEventListener("load", () => setTimeout(syncNativeReminders, 1500));
