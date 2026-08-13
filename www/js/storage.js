// 💾 ذخیره‌سازی روی دستگاه — بدون سرور، بدون اینترنت
const Storage = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem("kitty_" + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem("kitty_" + key, JSON.stringify(value));
  },
};
