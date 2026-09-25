let lastChartData = null;

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

/* =========================
   入力値バリデーション
========================= */

function validateInputs() {
  const rules = [
    {
      id: "age",
      label: "年齢",
      min: 18,
      max: 79,
      integer: true
    },
    {
      id: "assets",
      label: "現在の資産",
      min: 0
    },
    {
      id: "monthly",
      label: "毎月の積立額",
      min: 0
    },
    {
      id: "return",
      label: "想定利回り",
      min: 0,
      max: 20
    },
    {
      id: "spend",
      label: "年間生活費",
      min: 0
    },
    {
      id: "income",
      label: "FIRE後の収入",
      min: 0
    }
  ];

  // 以前のエラー表示を削除
  const oldError = document.getElementById("validationError");

  if (oldError) {
    oldError.remove();
  }

  // 以前のエラー状態を解除
  rules.forEach((rule) => {
    const input = document.getElementById(rule.id);

    if (input) {
      input.removeAttribute("aria-invalid");
    }
  });

  // 1項目ずつチェック
  for (const rule of rules) {
    const input = document.getElementById(rule.id);

    if (!input) {
      continue;
    }

    const raw = input.value.trim();

    // 空欄
    if (raw === "") {
      showValidationError(
        `${rule.label}を入力してください。`,
        input
      );
      return false;
    }

    // 数字・小数点以外の表記を禁止
    if (!/^\d+(\.\d+)?$/.test(raw)) {
      showValidationError(
        `${rule.label}は通常の数値で入力してください。`,
        input
      );
      return false;
    }

    // 数値以外
    const value = Number(raw);

    if (!Number.isFinite(value)) {
      showValidationError(
        `${rule.label}は数値で入力してください。`,
        input
      );
      return false;
    }

    // 整数チェック
    if (
      rule.integer &&
      !Number.isInteger(value)
    ) {
      showValidationError(
        `${rule.label}は整数で入力してください。`,
        input
      );
      return false;
    }

    // 最小値
    if (
      rule.min !== undefined &&
      value < rule.min
    ) {
      showValidationError(
        `${rule.label}は${rule.min}以上で入力してください。`,
        input
      );
      return false;
    }

    // 最大値
    if (
      rule.max !== undefined &&
      value > rule.max
    ) {
      showValidationError(
        `${rule.label}は${rule.max}以下で入力してください。`,
        input
      );
      return false;
    }
  }

  return true;
}

/* =========================
   エラー表示
========================= */

function showValidationError(message, input) {
  const error = document.createElement("div");

  error.id = "validationError";
  error.textContent = message;

  error.style.background = "#fff1f2";
  error.style.border = "1px solid #fecdd3";
  error.style.borderRadius = "8px";
  error.style.padding = "12px 14px";
  error.style.marginTop = "14px";
  error.style.color = "#be123c";
  error.style.fontSize = "14px";
  error.style.lineHeight = "1.6";

  // summaryの前にエラーを表示
  const summary = document.getElementById("summary");

  if (summary) {
    summary.parentNode.insertBefore(
      error,
      summary
    );
  }

  // 入力欄をエラー状態にする
  input.setAttribute(
    "aria-invalid",
    "true"
  );

  // エラー箇所へ移動
  input.focus();
}

/* =========================
   シミュレーション
========================= */

function simulate(userAction = false) {

  // 入力値チェック
  if (!validateInputs()) {
    return;
  }

  // GA4：ユーザーが実際にシミュレーションを実行した
  if (userAction && typeof gtag === "function") {
    gtag("event", "simulation_run");
  }

  const age =
    +document.getElementById("age").value;

  let assets =
    +document.getElementById("assets").value;

  const monthly =
    +document.getElementById("monthly").value;

  const r =
    +document.getElementById("return").value / 100;

  const spend =
    +document.getElementById("spend").value;

  const income =
    +document.getElementById("income").value;

  const rates = [
    0.03,
    0.035,
    0.04
  ];

  const rows = [];
  let age40 = assets;

  let series = [
    {
      age,
      assets
    }
  ];

  let found = {};

  for (
    let y = 1;
    y <= 80 - age;
    y++
  ) {

    // 年末に積立すると仮定した簡易計算
    assets =
      assets * (1 + r) +
      monthly * 12;

    const a = age + y;

    series.push({
      age: a,
      assets
    });

    rates.forEach((rate) => {

      const target =
        calcTarget(
          spend,
          income,
          rate
        );

      if (
        found[rate] === undefined &&
        assets >= target
      ) {
        found[rate] = a;
      }
    });
  }
  let html = "";
  rates.forEach((rate) => {

    const target =
      calcTarget(
        spend,
        income,
        rate
      );

    const fa =
      found[rate] === undefined
        ? "80歳までに未達"
        : found[rate] + "歳";

    html += `
      <div class="result">
        <div>${(rate * 100).toFixed(1)}%取り崩し</div>
        <div class="big">${yen(target)}</div>
        <div>到達目安：${fa}</div>
      </div>
    `;
  });

  document.getElementById(
    "summary"
  ).innerHTML = html;

  let t =
    "<table>" +
    "<tr>" +
    "<th>取り崩し率</th>" +
    "<th>必要資産</th>" +
    "<th>FIRE到達年齢</th>" +
    "</tr>";

  rates.forEach((rate) => {

    t += `
      <tr>
        <td>${(rate * 100).toFixed(1)}%</td>
        <td>${yen(
          calcTarget(
            spend,
            income,
            rate
          )
        )}</td>
        <td>${
          found[rate] === undefined
            ? "80歳までに未達"
            : found[rate] + "歳"
        }</td>
      </tr>
    `;
  });
  t += "</table>";

  document.getElementById(
    "table"
  ).innerHTML = t;

  const chartTarget = calcTarget(spend, income, 0.04);
  const chartFireAge = found[0.04];

  lastChartData = {
    series,
    target: chartTarget,
    fireAge: chartFireAge
  };

  draw(
    series,
    chartTarget,
    chartFireAge
  );

  // スマホでは計算後に結果へ移動
  if (
    userAction &&
    window.innerWidth <= 650
  ) {
    const conditionPanel =
      document.getElementById("conditionPanel");

    if (conditionPanel) {
      conditionPanel.open = false;
    }

    const results =
      document.getElementById("results");

    if (results) {
      setTimeout(() => {
        results.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 100);
    }
  }
}

/* =========================
   グラフ
========================= */

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

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  const width = rect.width;
  const height = rect.height;

  // ==================================================
  // グラフの余白
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
    if (max === 0) {
      return pad.t + H;
    }

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
  // ラベルは常時表示しない
  // ==================================================
  const targetY = yOf(target);

  ctx.save();

  ctx.setLineDash([7, 5]);
  ctx.strokeStyle = "#777";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(pad.l, targetY);
  ctx.lineTo(pad.l + W, targetY);
  ctx.stroke();

  ctx.restore();

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
  // ラベルは常時表示しない
  // ==================================================
  if (fireAge !== undefined) {
    const firePoint = series.find(
      (p) => p.age === fireAge
    );

    if (firePoint) {
      const x = xOf(firePoint.age);
      const y = yOf(firePoint.assets);

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

    // 同じ年齢が重複する場合は表示しない
    if (
      middleAge !== minAge &&
      middleAge !== maxAge
    ) {
      ctx.fillText(
        middleAge + "歳",
        xOf(middleAge),
        pad.t + H + 13
      );
    }

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

  // ==================================================
  // グラフ操作をセットアップ
  // ==================================================
  setupChartInteraction(
    c,
    series,
    target,
    fireAge,
    {
      pad,
      W,
      H,
      minAge,
      maxAge,
      xOf,
      yOf,
      formatAxisMoney
    }
  );
}

/* =========================
   グラフ操作・ツールチップ
========================= */

function setupChartInteraction(
  canvas,
  series,
  target,
  fireAge,
  chart
) {
  // ==================================================
  // すでにイベント登録済みなら
  // 最新データだけ更新
  // ==================================================
  if (canvas.dataset.interactionReady === "true") {
    canvas._chartState = {
      series,
      target,
      fireAge,
      chart
    };

    return;
  }

  canvas.dataset.interactionReady = "true";

  canvas._chartState = {
    series,
    target,
    fireAge,
    chart
  };

  // ==================================================
  // スマホでページスクロールさせず
  // グラフ操作を優先
  // ==================================================
  canvas.style.touchAction = "none";
  canvas.style.cursor = "crosshair";

  // ==================================================
  // ツールチップ
  // ==================================================
  const wrapper = canvas.parentElement;

  wrapper.style.position = "relative";

  const tooltip = document.createElement("div");

  tooltip.style.position = "absolute";
  tooltip.style.display = "none";
  tooltip.style.zIndex = "20";
  tooltip.style.pointerEvents = "none";

  tooltip.style.background =
    "rgba(255,255,255,0.97)";

  tooltip.style.border =
    "1px solid #ddd";

  tooltip.style.borderRadius = "10px";

  tooltip.style.padding =
    "10px 12px";

  tooltip.style.boxShadow =
    "0 4px 14px rgba(0,0,0,0.12)";

  tooltip.style.fontSize = "13px";
  tooltip.style.lineHeight = "1.5";
  tooltip.style.color = "#222";

  tooltip.style.minWidth = "145px";

  wrapper.appendChild(tooltip);

  // ==================================================
  // 現在選択されているポイント
  // ==================================================
  let selectedIndex = null;

  // ==================================================
  // タッチ操作中か
  // ==================================================
  let isTouching = false;

  // ==================================================
  // PCのマウス操作中か
  // ==================================================
  let isMouseOver = false;

  // ==================================================
  // 最後に選択したポイント
  // ==================================================
  let lastSelectedIndex = null;

  // ==================================================
  // ツールチップ表示
  // ==================================================
  function showTooltip(
    point,
    screenX,
    screenY
  ) {
    const state = canvas._chartState;

    if (!state) {
      return;
    }

    const targetValue = state.target;
    const fireAgeValue = state.fireAge;

    const reached =
      fireAgeValue !== undefined &&
      point.age >= fireAgeValue &&
      point.assets >= targetValue;

    let html = "";

    html += `
      <div style="
        font-weight:700;
        font-size:15px;
        margin-bottom:4px;
      ">
        ${point.age}歳
      </div>
    `;

    html += `
      <div>
        資産：
        <strong>
          ${Math.round(point.assets).toLocaleString()}万円
        </strong>
      </div>
    `;

    html += `
      <div>
        FIRE目標：
        <strong>
          ${Math.round(targetValue).toLocaleString()}万円
        </strong>
      </div>
    `;

    if (reached) {
      html += `
        <div style="
          margin-top:4px;
          font-weight:700;
        ">
          🎉 FIRE達成
        </div>
      `;
    }

    tooltip.innerHTML = html;

    // 一旦表示
    tooltip.style.display = "block";

    const wrapperRect =
      wrapper.getBoundingClientRect();

    const tooltipWidth =
      tooltip.offsetWidth;

    const tooltipHeight =
      tooltip.offsetHeight;

    // ==================================================
    // 基本位置
    // ==================================================
    let left =
      screenX -
      wrapperRect.left -
      tooltipWidth / 2;

    let top =
      screenY -
      wrapperRect.top -
      tooltipHeight -
      14;

    const margin = 8;

    // ==================================================
    // 左右にはみ出さない
    // ==================================================
    left = Math.max(
      margin,
      Math.min(
        left,
        wrapperRect.width -
          tooltipWidth -
          margin
      )
    );

    // ==================================================
    // 上にはみ出した場合は下へ
    // ==================================================
    if (top < margin) {
      top =
        screenY -
        wrapperRect.top +
        14;
    }

    // ==================================================
    // 下にもはみ出さない
    // ==================================================
    top = Math.min(
      top,
      wrapperRect.height -
        tooltipHeight -
        margin
    );

    tooltip.style.left =
      Math.round(left) + "px";

    tooltip.style.top =
      Math.round(top) + "px";
  }

  // ==================================================
  // ツールチップを消す
  // ==================================================
  function hideTooltip() {
    tooltip.style.display = "none";

    selectedIndex = null;
    lastSelectedIndex = null;
  }

  // ==================================================
  // 指・マウスの位置から最も近いデータを取得
  // ==================================================
  function getNearestIndex(clientX) {
    const state = canvas._chartState;

    const rect =
      canvas.getBoundingClientRect();

    const chartX =
      clientX - rect.left;

    const {
      pad,
      W,
      minAge,
      maxAge
    } = state.chart;

    // ==================================================
    // グラフ領域内に制限
    // ==================================================
    const clampedX =
      Math.max(
        pad.l,
        Math.min(
          chartX,
          pad.l + W
        )
      );

    const ratio =
      (clampedX - pad.l) / W;

    const age =
      minAge +
      ratio *
        (maxAge - minAge);

    // ==================================================
    // 最も近い年齢を探す
    // ==================================================
    let nearestIndex = 0;

    let minDistance =
      Math.abs(
        series[0].age - age
      );

    series.forEach(
      (point, index) => {
        const distance =
          Math.abs(
            point.age - age
          );

        if (
          distance <
          minDistance
        ) {
          minDistance = distance;
          nearestIndex = index;
        }
      }
    );

    return nearestIndex;
  }

  // ==================================================
  // 選択ポイントを描画
  // ==================================================
  function drawSelectedPoint(index) {
    const state = canvas._chartState;

    if (!state) {
      return;
    }

    // 元のグラフを再描画
    draw(
      state.series,
      state.target,
      state.fireAge
    );

    const point =
      state.series[index];

    if (!point) {
      return;
    }

    const currentChart =
      canvas._chartState.chart;

    const x =
      currentChart.xOf(point.age);

    const y =
      currentChart.yOf(point.assets);

    const ctx =
      canvas.getContext("2d");

    // ==================================================
    // 選択ポイントの外側のリング
    // ==================================================
    ctx.beginPath();

    ctx.arc(
      x,
      y,
      10,
      0,
      Math.PI * 2
    );

    ctx.strokeStyle =
      "rgba(34,34,34,0.35)";

    ctx.lineWidth = 2;

    ctx.stroke();

    // ==================================================
    // 選択ポイント
    // ==================================================
    ctx.beginPath();

    ctx.arc(
      x,
      y,
      5,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = "#222";

    ctx.fill();

    // ==================================================
    // FIRE達成地点なら少し強調
    // ==================================================
    if (
      state.fireAge !== undefined &&
      point.age === state.fireAge
    ) {
      ctx.beginPath();

      ctx.arc(
        x,
        y,
        13,
        0,
        Math.PI * 2
      );

      ctx.strokeStyle =
        "rgba(34,34,34,0.18)";

      ctx.lineWidth = 2;

      ctx.stroke();
    }
  }

  // ==================================================
  // 振動
  //
  // iPhone Safariでは対応していないため
  // Android等の対応環境のみ実行
  // ==================================================
  function hapticFeedback() {
    if (
      typeof navigator.vibrate ===
      "function"
    ) {
      navigator.vibrate(8);
    }
  }

  // ==================================================
  // ポイントを選択
  // ==================================================
  function selectPoint(
    index,
    clientX,
    clientY,
    shouldVibrate = false
  ) {
    const state =
      canvas._chartState;

    if (!state) {
      return;
    }

    const point =
      state.series[index];

    if (!point) {
      return;
    }

    selectedIndex = index;

    // ==================================================
    // 年齢が変わったときだけ軽い振動
    // ==================================================
    if (
      shouldVibrate &&
      lastSelectedIndex !== index
    ) {
      hapticFeedback();
    }

    lastSelectedIndex = index;

    // ==================================================
    // ポイントを描画
    // ==================================================
    drawSelectedPoint(index);

    // ==================================================
    // ツールチップ
    // ==================================================
    showTooltip(
      point,
      clientX,
      clientY
    );
  }

  // ==================================================
  // スマホ：指を置いた瞬間
  // ==================================================
  canvas.addEventListener(
    "pointerdown",
    function (event) {
      if (
        event.pointerType !== "touch"
      ) {
        return;
      }

      isTouching = true;

      canvas.setPointerCapture(
        event.pointerId
      );

      const index =
        getNearestIndex(
          event.clientX
        );

      selectPoint(
        index,
        event.clientX,
        event.clientY,
        true
      );
    }
  );

  // ==================================================
  // スマホ：指を左右にスライド
  // ==================================================
  canvas.addEventListener(
    "pointermove",
    function (event) {
      if (
        event.pointerType !== "touch" ||
        !isTouching
      ) {
        return;
      }

      const index =
        getNearestIndex(
          event.clientX
        );

      // 年齢が変わった場合だけ更新
      if (
        index !== selectedIndex
      ) {
        selectPoint(
          index,
          event.clientX,
          event.clientY,
          true
        );
      } else {
        // 同じ年齢なら
        // ツールチップ位置だけ追従
        const point =
          canvas._chartState.series[index];

        showTooltip(
          point,
          event.clientX,
          event.clientY
        );
      }
    }
  );

  // ==================================================
  // スマホ：指を離す
  // ==================================================
  canvas.addEventListener(
    "pointerup",
    function (event) {
      if (
        event.pointerType !== "touch"
      ) {
        return;
      }

      isTouching = false;

      try {
        canvas.releasePointerCapture(
          event.pointerId
        );
      } catch (e) {
        // 何もしない
      }
    }
  );

  // ==================================================
  // スマホ：操作キャンセル
  // ==================================================
  canvas.addEventListener(
    "pointercancel",
    function (event) {
      if (
        event.pointerType !== "touch"
      ) {
        return;
      }

      isTouching = false;

      try {
        canvas.releasePointerCapture(
          event.pointerId
        );
      } catch (e) {
        // 何もしない
      }
    }
  );

  // ==================================================
  // PC：マウスを乗せる
  // ==================================================
  canvas.addEventListener(
    "pointerenter",
    function (event) {
      if (
        event.pointerType !== "mouse"
      ) {
        return;
      }

      isMouseOver = true;
    }
  );

  // ==================================================
  // PC：マウス移動
  // ==================================================
  canvas.addEventListener(
    "pointermove",
    function (event) {
      if (
        event.pointerType !== "mouse"
      ) {
        return;
      }

      isMouseOver = true;

      const index =
        getNearestIndex(
          event.clientX
        );

      selectPoint(
        index,
        event.clientX,
        event.clientY,
        false
      );
    }
  );

  // ==================================================
  // PC：マウスがグラフから出る
  // ==================================================
  canvas.addEventListener(
    "pointerleave",
    function (event) {
      if (
        event.pointerType !== "mouse"
      ) {
        return;
      }

      isMouseOver = false;

      hideTooltip();

      const state =
        canvas._chartState;

      draw(
        state.series,
        state.target,
        state.fireAge
      );
    }
  );

  // ==================================================
  // グラフ外をタップしたら閉じる
  // ★今回の重要修正
  // ==================================================
  document.addEventListener(
    "pointerdown",
    function (event) {
      // グラフそのものをタップ
      if (
        event.target === canvas
      ) {
        return;
      }

      // ツールチップはpointer-events:noneなので
      // 基本的にはここには来ないが念のため
      if (
        event.target === tooltip
      ) {
        return;
      }

      // スマホでグラフ外をタップ
      if (
        event.pointerType === "touch"
      ) {
        hideTooltip();

        const state =
          canvas._chartState;

        if (state) {
          draw(
            state.series,
            state.target,
            state.fireAge
          );
        }
      }
    }
  );
}

// ==================================================
// 画面サイズ変更時に再描画
// ==================================================
window.addEventListener("resize", () => {
  if (lastChartData) {
    draw(
      lastChartData.series,
      lastChartData.target,
      lastChartData.fireAge
    );
  }
});

// =========================
// 数値入力で e / E / + / - を禁止
// =========================

const numberInputs = document.querySelectorAll(
  'input[type="number"]'
);

numberInputs.forEach((input) => {
  input.addEventListener("keydown", (e) => {
    if (
      e.key === "e" ||
      e.key === "E" ||
      e.key === "+" ||
      e.key === "-"
    ) {
      e.preventDefault();
    }
  });
});

simulate();