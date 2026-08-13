// kitty runner game
let game = null;
let gameLoopId = null;

const kittyImg = new Image();
kittyImg.src = "images/kitty_game.webp";
const runImg1 = new Image();
runImg1.src = "images/kitty_run1.png";
const runImg2 = new Image();
runImg2.src = "images/kitty_run2.png";

function getCoins() {
  return Storage.get("coins", 0);
}
function addCoins(n) {
  Storage.set("coins", getCoins() + n);
}
function getBest() {
  return Storage.get("bestScore", 0);
}
function setBest(v) {
  Storage.set("bestScore", v);
}

const G = { W: 640, H: 300, groundY: 250, gravity: 0.9, jumpV: -15 };

// 🎨 انواع مانع‌ها (آیکون برداری + رنگ)
const OB_TYPES = [
  { icon: "cactus", color: "#6FBF73" },
  { icon: "cone", color: "#FF8FA3" },
];

// رسم آیکون SVG روی بوم (مرکز = x,y)
function drawIcon(ctx, name, x, y, size, color) {
  const p = new Path2D(ICONS[name]);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.translate(-12, -12);
  ctx.fillStyle = color;
  ctx.fill(p);
  ctx.restore();
}

// 🪙 سکه‌ی طلایی
function drawCoin(ctx, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#FFC94D";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#E8A62D";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r - 2.5, 0, Math.PI * 2);
  ctx.stroke();
  drawIcon(ctx, "star", 0, 0, r * 1.1, "#FFF3D6");
  ctx.restore();
}

function stopGameLoop() {
  if (gameLoopId) cancelAnimationFrame(gameLoopId);
  gameLoopId = null;
  game = null;
}

function beginPlay() {
  const ov = $("game-overlay");
  if (ov) ov.classList.add("hidden");
  startGame();
}

function startGame() {
  game = {
    running: true,
    over: false,
    y: G.groundY,
    vy: 0,
    onGround: true,
    speed: 3.5,
    score: 0,
    coins: 0,
    frame: 0,
    obstacles: [],
    coinsArr: [],
    dusts: [],
    clouds: [
      { x: 100, y: 60 },
      { x: 350, y: 40 },
      { x: 550, y: 80 },
    ],
    spawnTimer: 90,
    coinTimer: 90,
  };
  if (gameLoopId) cancelAnimationFrame(gameLoopId);
  loop();
}

function jump() {
  if (game && game.running && game.onGround) {
    game.vy = G.jumpV;
    game.onGround = false;
  }
}

function onGameTap() {
  if (game && game.running) jump();
}

function overlayTap() {
  if (!(game && game.over)) beginPlay();
}

function gameOver() {
  game.running = false;
  game.over = true;
  cancelAnimationFrame(gameLoopId);
  const sc = Math.floor(game.score);
  const best = getBest();
  const isRecord = sc > best;
  if (isRecord) setBest(sc);
  addCoins(game.coins);
  renderAppBar();
  const s = S();
  $("game-overlay-content").innerHTML = `
    <h2 style="color:var(--accent)">${s.gameOver}</h2>
    <p style="margin-top:8px">${s.scoreWord}: <b>${toPersianIfFa(sc)}</b></p>
    <p>🪙 ${s.coinsWord}: <b>${toPersianIfFa(game.coins)}</b></p>
    <p>🏆 ${s.bestWord}: <b>${toPersianIfFa(Math.max(best, sc))}</b>${
    isRecord ? " — " + s.newRecord : ""
  }</p>
    <button class="btn-primary" style="margin-top:14px" onclick="beginPlay()">${
      s.playAgain
    }</button>`;
  $("game-overlay").classList.remove("hidden");
}

function loop() {
  gameLoopId = requestAnimationFrame(loop);
  update();
  draw();
}

function update() {
  const g = game;
  g.frame++;
  g.speed = Math.min(13, 3.5 + g.frame * 0.002);
  g.score += g.speed * 0.05;

  g.vy += G.gravity;
  g.y += g.vy;
  if (g.y >= G.groundY) {
    g.y = G.groundY;
    g.vy = 0;
    g.onGround = true;
  }

  g.clouds.forEach((c) => {
    c.x -= g.speed * 0.3;
    if (c.x < -60) {
      c.x = G.W + 60;
      c.y = 30 + Math.random() * 70;
    }
  });

  // 💨 غبار دویدن
  if (g.onGround && g.frame % 5 === 0) {
    g.dusts.push({ x: 52, y: G.groundY - 2, life: 14 });
  }
  g.dusts.forEach((d) => {
    d.x -= 2.2;
    d.life--;
  });
  g.dusts = g.dusts.filter((d) => d.life > 0);

  g.spawnTimer--;
  if (g.spawnTimer <= 0) {
    g.obstacles.push({
      x: G.W + 40,
      size: 34 + Math.random() * 16,
      t: Math.floor(Math.random() * OB_TYPES.length),
    });
    g.spawnTimer = Math.max(45, 90 - g.speed * 4) + Math.random() * 50;
  }
  g.obstacles.forEach((o) => (o.x -= g.speed));
  g.obstacles = g.obstacles.filter((o) => o.x > -60);

  g.coinTimer--;
  if (g.coinTimer <= 0) {
    g.coinsArr.push({ x: G.W + 40, y: G.groundY - 80 - Math.random() * 70 });
    g.coinTimer = 70 + Math.random() * 80;
  }
  g.coinsArr.forEach((c) => (c.x -= g.speed));
  g.coinsArr = g.coinsArr.filter((c) => c.x > -40 && !c.taken);

  // برخورد با مانع
  const kx = 60,
    kw = 46;
  for (const o of g.obstacles) {
    if (
      kx + kw > o.x + o.size * 0.15 &&
      kx < o.x + o.size * 0.7 &&
      g.y > G.groundY - o.size * 0.9
    ) {
      gameOver();
      return;
    }
  }
  // جمع کردن سکه
  for (const c of g.coinsArr) {
    if (
      Math.abs(c.x - (kx + kw / 2)) < 30 &&
      Math.abs(c.y - (g.y - 46 + 23)) < 34
    ) {
      c.taken = true;
      g.coins++;
    }
  }

  const hs = $("hud-score");
  if (hs)
    hs.textContent = S().scoreWord + ": " + toPersianIfFa(Math.floor(g.score));
  const hc = $("hud-coins");
  if (hc) hc.textContent = "🪙 " + toPersianIfFa(g.coins);
}

function draw() {
  const cv = $("game-canvas");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const g = game;
  ctx.fillStyle = "#FFF5F7";
  ctx.fillRect(0, 0, G.W, G.H);

  // ابرها
  ctx.font = "34px sans-serif";
  g.clouds.forEach((c) => ctx.fillText("☁️", c.x, c.y));

  // 💨 خط‌های سرعت
  if (g.speed > 7) {
    ctx.strokeStyle = "rgba(239,160,174,.45)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const ly = 40 + i * 55;
      const lx = G.W - ((g.frame * (g.speed + 4) + i * 200) % (G.W + 120));
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + 46, ly);
      ctx.stroke();
    }
  }

  // زمین
  ctx.fillStyle = "#F9D3DA";
  ctx.fillRect(0, G.groundY, G.W, 6);
  ctx.fillStyle = "#EFA0AE";
  const off = (g.frame * g.speed) % 80;
  for (let x = -off; x < G.W; x += 80) ctx.fillRect(x, G.groundY + 14, 24, 3);

  // 💨 غبار پشت پا
  g.dusts.forEach((d) => {
    ctx.globalAlpha = (d.life / 14) * 0.5;
    ctx.fillStyle = "#EFA0AE";
    ctx.beginPath();
    ctx.arc(d.x, d.y, 3 + (14 - d.life) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // 🪙 سکه‌ها
  g.coinsArr.forEach((c) =>
    drawCoin(ctx, c.x, c.y + Math.sin((g.frame + c.x) * 0.05) * 4, 13)
  );

  // 🌵 موانع
  g.obstacles.forEach((o) => {
    const t = OB_TYPES[o.t];
    drawIcon(
      ctx,
      t.icon,
      o.x + o.size / 2,
      G.groundY - o.size / 2,
      o.size,
      t.color
    );
  });

  // 🐱 کیتی دونده
  const hasRun =
    runImg1.complete &&
    runImg1.naturalWidth > 0 &&
    runImg2.complete &&
    runImg2.naturalWidth > 0;
  const img = hasRun
    ? Math.floor(g.frame / 7) % 2 === 0
      ? runImg1
      : runImg2
    : kittyImg;
  const bounce = g.onGround ? -Math.abs(Math.sin(g.frame * 0.22)) * 4 : 0;
  const cx = 82,
    cy = g.y - 26 + bounce;

  // سایه‌ی نرم زیر پا
  ctx.fillStyle = "rgba(217,58,73,.15)";
  ctx.beginPath();
  ctx.ellipse(cx, G.groundY + 4, 24, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(cx, cy);
  if (!g.onGround) ctx.rotate(Math.max(-0.25, Math.min(0.35, g.vy * 0.02)));
  if (img.complete && img.naturalWidth > 0)
    ctx.drawImage(img, -27, -27, 54, 54);
  ctx.restore();
}

// ---------- صفحه‌ی بازی ----------
function gameHTML() {
  const s = S();
  return `
    <h2 class="section-title">${s.gameTitle}</h2>
    <div class="card" style="padding:12px">
      <div class="game-hud">
        <span id="hud-score">${s.scoreWord}: ${toPersianIfFa(0)}</span>
        <span id="hud-coins">🪙 ${toPersianIfFa(0)}</span>
        <span>🏆 ${toPersianIfFa(getBest())}</span>
      </div>
      <div class="game-wrap">
        <canvas id="game-canvas" width="640" height="300" onclick="onGameTap()"></canvas>
        <div id="game-overlay" class="game-overlay" onclick="overlayTap()">
          <div id="game-overlay-content">
            <div style="font-size:40px">🐾</div>
            <p style="font-weight:700;margin-top:8px">${s.tapToStart}</p>
          </div>
        </div>
      </div>
      <p style="color:#8a8a8a;font-size:12px;margin-top:8px;text-align:center">${
        s.gameHint
      }</p>
    </div>`;
}

// پرش با کیبورد
document.addEventListener("keydown", (e) => {
  if (state.tab !== "games") return;
  if (e.code === "Space" || e.code === "ArrowUp") {
    e.preventDefault();
    const ov = $("game-overlay");
    if (ov && !ov.classList.contains("hidden")) {
      if (!(game && game.over)) beginPlay();
      return;
    }
    jump();
  }
});
