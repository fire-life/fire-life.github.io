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

  // ==================================================
  // キャンバスを実際の表示サイズに合わせる
  // ==================================================
  const rect = c.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  c.width = Math.round(rect.width * dpr);
  c.height = Math.round(rect.height * dpr);

  // 高解像度ディスプレイでも文字・線をくっきり表示
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const width = rect.width;
  const height = rect.height;

  // ==================================================
  // グラフの余白
  // スマホでは左右の余白を少し狭くする
  // ==================================================
  const pad = {
    l: width < 500 ? 62 : 76,
    r: width < 500 ? 18 : 24,
    t: 32,
    b: 46
  };

  const W = Math.max(100, width - pad.l - pad.r);
  const H = Math.max(120, height - pad.t - pad.b);

  // ==================================================
  // 最大値
  // ==================================================
  const max = Math.max(
    ...series.map((x) => x.assets),
    target
  ) * 1.10;

  const minAge = series[0].age;
  const maxAge = series[series.length - 1].age;

  // ==================================================
  // 金額表示
  // ==================================================
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

  // ==================================================
  // X座標
  // ==================================================
  function xOf(age) {
    if (maxAge === minAge) {
      return pad.l;
    }

    return pad.l +
      ((age - minAge) / (maxAge - minAge)) * W;
  }

  // ==================================================
  // Y座標
  // ==================================================
  function yOf(value) {
    return pad.t + H - (value / max) * H;
  }

  // ==================================================
  // グリッド線・Y軸
  // ==================================================
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 5; i++) {
    const y = pad.t + (H * i) / 5;

    // 横線
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + W, y);
    ctx.stroke();

    // 金額ラベル
    ctx.fillStyle = "#666";
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    ctx.fillText(
      formatAxisMoney(max * (1 - i / 5)),
      pad.l - 9,
      y
    );
  }

  // ==================================================
  // FIRE目標ライン
  // ==================================================
  const targetY = yOf(target);

  ctx.save();

  // 点線
  ctx.setLineDash([7, 5]);
  ctx.strokeStyle = "#777";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(pad.l, targetY);
  ctx.lineTo(pad.l + W, targetY);
  ctx.stroke();

  ctx.restore();

  // ==================================================
  // FIRE目標ラベル
  // 線の上に白背景を付ける
  // ==================================================
  const targetText =
    "FIRE目標 " + formatAxisMoney(target);

  ctx.font = "bold 12px system-ui, sans-serif";

  const targetTextWidth =
    ctx.measureText(targetText).width;

  const labelWidth = targetTextWidth + 14;
  const labelHeight = 24;

  let labelX = pad.l + 8;
  let labelY = targetY - labelHeight - 3;

  // 上にはみ出す場合は線の下へ
  if (labelY < pad.t) {
    labelY = targetY + 5;
  }

  // 白背景
  ctx.fillStyle = "rgba(255,255,255,0.94)";

  ctx.beginPath();
  ctx.roundRect(
    labelX,
    labelY,
    labelWidth,
    labelHeight,
    6
  );
  ctx.fill();

  // 文字
  ctx.fillStyle = "#444";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  ctx.fillText(
    targetText,
    labelX + 7,
    labelY + labelHeight / 2
  );

  // ==================================================
  // 資産推移
  // ==================================================
  ctx.beginPath();

  ctx.strokeStyle = "#222";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  series.forEach((p, i) => {
    const x = xOf(p.age);
    const y = yOf(p.assets);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  // ==================================================
  // 現在地点
  // ==================================================
  const first = series[0];

  ctx.beginPath();

  ctx.arc(
    xOf(first.age),
    yOf(first.assets),
    4,
    0,
    Math.PI * 2
  );

  ctx.fillStyle = "#222";
  ctx.fill();

  // ==================================================
  // FIRE達成地点
  // ==================================================
  if (fireAge !== undefined) {
    const firePoint = series.find(
      (p) => p.age === fireAge
    );

    if (firePoint) {
      const x = xOf(firePoint.age);
      const y = yOf(firePoint.assets);

      // 達成地点の丸
      ctx.beginPath();

      ctx.arc(
        x,
        y,
        6,
        0,
        Math.PI * 2
      );

      ctx.fillStyle = "#222";
      ctx.fill();

      // ------------------------------
      // ラベル
      // ------------------------------
      const fireText =
        "FIRE達成 " + fireAge + "歳";

      ctx.font = "bold 12px system-ui, sans-serif";

      const fireTextWidth =
        ctx.measureText(fireText).width;

      const fireLabelWidth =
        fireTextWidth + 12;

      const fireLabelHeight = 22;

      // 基本位置
      let textX = x;
      let textAlign = "center";

      // 左端に近い場合
      if (
        x <
        pad.l + fireLabelWidth / 2
      ) {
        textX = x + 8;
        textAlign = "left";
      }

      // 右端に近い場合
      else if (
        x >
        pad.l + W - fireLabelWidth / 2
      ) {
        textX = x - 8;
        textAlign = "right";
      }

      let textY = y - 18;

      // 上にはみ出す場合は下側へ
      if (textY < pad.t + 12) {
        textY = y + 20;
      }

      // 背景のX座標
      let bgX;

      if (textAlign === "center") {
        bgX =
          textX -
          fireLabelWidth / 2;
      } else if (textAlign === "left") {
        bgX = textX - 4;
      } else {
        bgX =
          textX -
          fireLabelWidth +
          4;
      }

      // 白背景
      ctx.fillStyle = "rgba(255,255,255,0.94)";

      ctx.beginPath();

      ctx.roundRect(
        bgX,
        textY - 11,
        fireLabelWidth,
        fireLabelHeight,
        6
      );

      ctx.fill();

      // 文字
      ctx.fillStyle = "#222";
      ctx.textAlign = textAlign;
      ctx.textBaseline = "middle";

      ctx.fillText(
        fireText,
        textX,
        textY
      );
    }
  }

  // ==================================================
  // 軸タイトル
  // ==================================================
  ctx.fillStyle = "#555";
  ctx.font = "12px system-ui, sans-serif";
  ctx.textBaseline = "top";

  ctx.textAlign = "left";
  ctx.fillText(
    "資産（万円）",
    8,
    8
  );

  // ==================================================
  // X軸（年齢）
  // スマホでは3点表示
  // ==================================================
  ctx.textAlign = "center";

  if (width < 500) {
    const middleAge =
      Math.round((minAge + maxAge) / 2);

    ctx.fillText(
      minAge + "歳",
      xOf(minAge),
      pad.t + H + 13
    );

    ctx.fillText(
      middleAge + "歳",
      xOf(middleAge),
      pad.t + H + 13
    );

    ctx.fillText(
      maxAge + "歳",
      xOf(maxAge),
      pad.t + H + 13
    );
  } else {
    ctx.fillText(
      minAge + "歳",
      xOf(minAge),
      pad.t + H + 13
    );

    ctx.fillText(
      maxAge + "歳",
      xOf(maxAge),
      pad.t + H + 13
    );
  }
}

// ==================================================
// 画面サイズ変更時に再描画
// ==================================================
window.addEventListener("resize", () => {
  simulate();
});
simulate();
