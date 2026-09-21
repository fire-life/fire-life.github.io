function yen(n) {
  n = Math.round(n);

  if (n >= 10000) {
    const oku = Math.floor(n / 10000);
    const man = n % 10000;

    if (man === 0) {
      return oku.toLocaleString() + "億円";
    }

    return oku.toLocaleString() + "億" + man.toLocaleString() + "万円";
  }

  return n.toLocaleString() + "万円";
}
function calcTarget(spend, income, rate) {
  return Math.max(0, spend - income) / rate;
}
function simulate() {
  const age = +document.getElementById("age").value;
  let assets = +document.getElementById("assets").value;
  const monthly = +document.getElementById("monthly").value;
  const r = +document.getElementById("return").value / 100;
  const spend = +document.getElementById("spend").value;
  const income = +document.getElementById("income").value;
  const rates = [0.03, 0.035, 0.04];
  const rows = [];
  let age40 = assets;
  let series = [{ age, assets }];
  let found = {};
  for (let y = 1; y <= 80 - age; y++) {
    // 年末に積立すると仮定した簡易計算
    assets = assets * (1 + r) + monthly * 12;
    const a = age + y;
    series.push({ age: a, assets });
    rates.forEach((rate) => {
      const target = calcTarget(spend, income, rate);
      if (found[rate] === undefined && assets >= target) found[rate] = a;
    });
  }
  let html = "";
  rates.forEach((rate) => {
    const target = calcTarget(spend, income, rate);
    const fa =
      found[rate] === undefined ? "80歳までに未達" : found[rate] + "歳";
    html += `<div class="result"><div>${(rate * 100).toFixed(1)}%取り崩し</div><div class="big">${yen(target)}</div><div>到達目安：${fa}</div></div>`;
  });
  document.getElementById("summary").innerHTML = html;
  let t =
    "<table><tr><th>取り崩し率</th><th>必要資産</th><th>FIRE到達年齢</th></tr>";
  rates.forEach((rate) => {
    t += `<tr><td>${(rate * 100).toFixed(1)}%</td><td>${yen(calcTarget(spend, income, rate))}</td><td>${found[rate] === undefined ? "80歳までに未達" : found[rate] + "歳"}</td></tr>`;
  });
  t += "</table>";
  document.getElementById("table").innerHTML = t;
  draw(series, calcTarget(spend, income, 0.04), found[0.04]);
}
function draw(series, target, fireAge) {
  const c = document.getElementById("chart");
  const ctx = c.getContext("2d");

  ctx.clearRect(0, 0, c.width, c.height);

  const pad = { l: 80, r: 20, t: 30, b: 40 };
  const W = c.width - pad.l - pad.r;
  const H = c.height - pad.t - pad.b;

  // グラフの最大値
  const max = Math.max(...series.map((x) => x.assets), target) * 1.08;

  const minAge = series[0].age;
  const maxAge = series[series.length - 1].age;

  // 金額を「万円・億円」に変換
  function formatAxisMoney(value) {
    if (value >= 10000) {
      const oku = value / 10000;

      if (oku >= 10) {
        return oku.toFixed(0) + "億円";
      }

      return oku.toFixed(1).replace(".0", "") + "億円";
    }

    return Math.round(value).toLocaleString() + "万円";
  }

  // =========================
  // グリッド線・縦軸
  // =========================

  ctx.strokeStyle = "#ddd";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 5; i++) {
    const y = pad.t + (H * i) / 5;

    // 横線
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + W, y);
    ctx.stroke();

    // 金額
    const value = max * (1 - i / 5);

    ctx.fillStyle = "#555";
    ctx.font = "13px sans-serif";
    ctx.textAlign = "right";

    ctx.fillText(formatAxisMoney(value), pad.l - 10, y + 5);
  }

  // =========================
  // FIRE目標額の水平線
  // =========================

  const targetY = pad.t + H - (target / max) * H;

  ctx.beginPath();

  // 点線
  ctx.setLineDash([8, 6]);

  ctx.strokeStyle = "#777";
  ctx.lineWidth = 2;

  ctx.moveTo(pad.l, targetY);
  ctx.lineTo(pad.l + W, targetY);

  ctx.stroke();

  // 点線を解除
  ctx.setLineDash([]);

  // FIRE目標額の文字
  ctx.fillStyle = "#555";
  ctx.font = "13px sans-serif";
  ctx.textAlign = "left";

  ctx.fillText("FIRE目標 " + formatAxisMoney(target), pad.l + 10, targetY - 8);

  // =========================
  // 資産推移
  // =========================

  ctx.beginPath();

  ctx.strokeStyle = "#222";
  ctx.lineWidth = 3;

  series.forEach((p, i) => {
    const x = pad.l + ((p.age - minAge) / (maxAge - minAge)) * W;

    const y = pad.t + H - (p.assets / max) * H;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  // =========================
  // FIRE到達地点
  // =========================

  if (fireAge !== undefined) {
    const firePoint = series.find((p) => p.age === fireAge);

    if (firePoint) {
      const x = pad.l + ((firePoint.age - minAge) / (maxAge - minAge)) * W;

      const y = pad.t + H - (firePoint.assets / max) * H;

      // 到達地点の丸
      ctx.beginPath();

      ctx.arc(x, y, 6, 0, Math.PI * 2);

      ctx.fillStyle = "#222";
      ctx.fill();

      // FIRE達成ラベル
      ctx.fillStyle = "#222";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";

      ctx.fillText("FIRE達成", x, y - 15);

      // 年齢
      ctx.font = "12px sans-serif";

      ctx.fillText(fireAge + "歳", x, y - 30);
    }
  }

  // =========================
  // 軸ラベル
  // =========================

  ctx.fillStyle = "#555";
  ctx.font = "14px sans-serif";
  ctx.textAlign = "left";

  ctx.fillText("資産", 8, 18);

  // 年齢
  ctx.fillText(minAge + "歳", pad.l, pad.t + H + 25);

  ctx.fillText(maxAge + "歳", pad.l + W - 35, pad.t + H + 25);
}
simulate();
