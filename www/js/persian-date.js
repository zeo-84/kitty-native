// 📅 تبدیل میلادی به شمسی — الگوریتم استاندارد
function div(a, b) {
  return ~~(a / b);
}
function mod(a, b) {
  return a - ~~(a / b) * b;
}

function gregorianToJalali(gy, gm, gd) {
  const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    ~~((gy2 + 3) / 4) -
    ~~((gy2 + 99) / 100) +
    ~~((gy2 + 399) / 400) +
    gd +
    gdm[gm - 1];
  let jy = -1595 + 33 * div(days, 12053);
  days = mod(days, 12053);
  jy += 4 * div(days, 1461);
  days = mod(days, 1461);
  if (days > 365) {
    jy += div(days - 1, 365);
    days = mod(days - 1, 365);
  }
  let jm, jd;
  if (days < 186) {
    jm = 1 + div(days, 31);
    jd = 1 + mod(days, 31);
  } else {
    jm = 7 + div(days - 186, 30);
    jd = 1 + mod(days - 186, 30);
  }
  return [jy, jm, jd];
}

const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

function toPersianDigits(s) {
  return String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
}

// تاریخ امروز به شمسی (فا) یا میلادی (en)
function todayString(locale) {
  const now = new Date();
  if (locale === "fa") {
    const [jy, jm, jd] = gregorianToJalali(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate()
    );
    return toPersianDigits(`${jd} ${JALALI_MONTHS[jm - 1]} ${jy}`);
  }
  return now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// کلید یکتای روز (برای گروه‌بندی کارها)
function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

// ----- ابزارهای تقویم شمسی -----
function jalaliToGregorian(jy, jm, jd) {
  jy += 1595;
  let days = -355668 + (365 * jy) + (div(jy, 33) * 8) + div(mod(jy, 33) + 3, 4)
           + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * div(days, 146097);
  days = mod(days, 146097);
  if (days > 36524) {
    gy += 100 * div(--days, 36524);
    days = mod(days, 36524);
    if (days >= 365) days++;
  }
  gy += 4 * div(days, 1461);
  days = mod(days, 1461);
  if (days > 365) {
    gy += div(days - 1, 365);
    days = mod(days - 1, 365);
  }
  let gd = days + 1;
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0) ? 29 : 28,
                 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
  return [gy, gm, gd];
}

function jalaliMonthLength(jy, jm) {
  const a = jalaliToGregorian(jy, jm, 1);
  const b = jm < 12 ? jalaliToGregorian(jy, jm + 1, 1) : jalaliToGregorian(jy + 1, 1, 1);
  return Math.round((new Date(b[0], b[1] - 1, b[2]) - new Date(a[0], a[1] - 1, a[2])) / 86400000);
}

// روز هفته‌ی اول ماه (شنبه = 0)
function jalaliFirstWeekday(jy, jm) {
  const g = jalaliToGregorian(jy, jm, 1);
  return (new Date(g[0], g[1] - 1, g[2]).getDay() + 1) % 7;
}

function jalaliKey(jy, jm, jd) { return jy + '/' + jm + '/' + jd; }

