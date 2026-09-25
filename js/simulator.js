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
      yOf
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
  /*
   * ==================================================
   * グラフ操作
   *
   * ポイント
   * ・グラフ本体は再描画しない
   * ・選択表示だけ別Canvasに描画
   * ・requestAnimationFrameでiPhoneでも滑らかに追従
   * ・年齢単位でスナップ
   * ・スマホはドラッグ操作
   * ・グラフ外タップでツールチップを閉じる
   * ==================================================
   */

  const {
    pad,
    W,
    H,
    minAge,
    maxAge,
    xOf,
    yOf
  } = chart;

  const parent = canvas.parentElement;

  if (!parent) {
    return;
  }

  /*
   * --------------------------------------------------
   * すでにイベント設定済みなら、
   * 最新のグラフ情報だけ更新する
   * --------------------------------------------------
   */

  if (canvas.dataset.interactionReady === "true") {
    canvas._chartState = {
      series,
      target,
      fireAge,
      pad,
      W,
      H,
      minAge,
      maxAge,
      xOf,
      yOf
    };

    /*
     * グラフ本体が再描画された場合、
     * 現在選択中のポイントも描き直す
     */
    if (
      canvas._selectedIndex !== undefined &&
      canvas._selectedIndex !== null
    ) {
      requestAnimationFrame(() => {
        renderSelection();
      });
    }

    return;
  }

  canvas.dataset.interactionReady = "true";

  canvas._chartState = {
    series,
    target,
    fireAge,
    pad,
    W,
    H,
    minAge,
    maxAge,
    xOf,
    yOf
  };

  canvas._selectedIndex = null;

  /*
   * ==================================================
   * 親要素
   * ==================================================
   */

  const parentStyle =
    window.getComputedStyle(parent);

  if (parentStyle.position === "static") {
    parent.style.position = "relative";
  }

  /*
   * ==================================================
   * 選択表示用Canvas
   *
   * グラフ本体とは完全に分離する
   * ==================================================
   */

  let overlay =
    parent.querySelector(
      ".chart-selection-overlay"
    );

  if (!overlay) {
    overlay =
      document.createElement("canvas");

    overlay.className =
      "chart-selection-overlay";

    overlay.style.position = "absolute";
    overlay.style.left = "0";
    overlay.style.top = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";

    /*
     * タッチイベントは本体Canvasで受け取る
     */
    overlay.style.pointerEvents = "none";

    parent.appendChild(overlay);
  }

  canvas._selectionCanvas = overlay;

  /*
   * ==================================================
   * ツールチップ
   * ==================================================
   */

  let tooltip =
    parent.querySelector(
      ".chart-touch-tooltip"
    );

  if (!tooltip) {
    tooltip =
      document.createElement("div");

    tooltip.className =
      "chart-touch-tooltip";

    tooltip.style.position = "absolute";
    tooltip.style.zIndex = "20";
    tooltip.style.pointerEvents = "none";
    tooltip.style.background = "#fff";
    tooltip.style.border =
      "1px solid rgba(0,0,0,0.12)";
    tooltip.style.borderRadius = "10px";
    tooltip.style.boxShadow =
      "0 4px 16px rgba(0,0,0,0.12)";
    tooltip.style.padding = "8px 11px";
    tooltip.style.minWidth = "145px";
    tooltip.style.fontSize = "12px";
    tooltip.style.lineHeight = "1.55";
    tooltip.style.whiteSpace = "nowrap";
    tooltip.style.opacity = "0";
    tooltip.style.transition =
      "opacity 0.12s ease";

    parent.appendChild(tooltip);
  }

  canvas._chartTooltip = tooltip;

  /*
   * ==================================================
   * 選択Canvasのサイズ調整
   * ==================================================
   */

  function resizeOverlay() {
    const rect =
      canvas.getBoundingClientRect();

    const dpr =
      window.devicePixelRatio || 1;

    overlay.width =
      Math.round(rect.width * dpr);

    overlay.height =
      Math.round(rect.height * dpr);

    overlay.style.width =
      rect.width + "px";

    overlay.style.height =
      rect.height + "px";

    const ctx =
      overlay.getContext("2d");

    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );

    renderSelection();
  }

  /*
   * ==================================================
   * 選択Canvasをクリア
   * ==================================================
   */

  function clearSelection() {
    const ctx =
      overlay.getContext("2d");

    const rect =
      canvas.getBoundingClientRect();

    ctx.clearRect(
      0,
      0,
      rect.width,
      rect.height
    );
  }

  /*
   * ==================================================
   * 選択表示
   *
   * ここではグラフ本体を一切描き直さない
   * ==================================================
   */

  function renderSelection() {
    const state =
      canvas._chartState;

    if (!state) {
      return;
    }

    const index =
      canvas._selectedIndex;

    clearSelection();

    if (
      index === null ||
      index === undefined ||
      !state.series[index]
    ) {
      return;
    }

    const point =
      state.series[index];

    const x =
      state.xOf(point.age);

    const y =
      state.yOf(point.assets);

    const ctx =
      overlay.getContext("2d");

    /*
     * -----------------------------------------------
     * 縦のガイドライン
     * -----------------------------------------------
     */

    ctx.save();

    ctx.beginPath();

    ctx.moveTo(
      x,
      state.pad.t
    );

    ctx.lineTo(
      x,
      state.pad.t + state.H
    );

    ctx.strokeStyle =
      "rgba(0,0,0,0.25)";

    ctx.lineWidth = 1;

    /*
     * iPhoneで線がぼやけないように
     */
    ctx.stroke();

    /*
     * -----------------------------------------------
     * 選択ポイントの外側リング
     * -----------------------------------------------
     */

    ctx.beginPath();

    ctx.arc(
      x,
      y,
      9,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      "rgba(255,255,255,0.95)";

    ctx.fill();

    ctx.strokeStyle = "#222";

    ctx.lineWidth = 2;

    ctx.stroke();

    /*
     * -----------------------------------------------
     * 選択ポイント本体
     * -----------------------------------------------
     */

    ctx.beginPath();

    ctx.arc(
      x,
      y,
      4.5,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = "#222";

    ctx.fill();

    ctx.restore();

    /*
     * -----------------------------------------------
     * ツールチップ
     * -----------------------------------------------
     */

    updateTooltip(
      point,
      x,
      y
    );
  }

  /*
   * ==================================================
   * ツールチップ更新
   * ==================================================
   */

  function updateTooltip(
    point,
    x,
    y
  ) {
    const state =
      canvas._chartState;

    if (!state || !tooltip) {
      return;
    }

    const reached =
      state.fireAge !== undefined &&
      point.age === state.fireAge;

    tooltip.innerHTML = `
      <div style="
        font-weight:700;
        font-size:13px;
        margin-bottom:2px;
      ">
        ${point.age}歳
      </div>

      <div>
        資産：
        <strong>
          ${Math.round(point.assets).toLocaleString()}万円
        </strong>
      </div>

      <div>
        FIRE目標：
        ${Math.round(state.target).toLocaleString()}万円
      </div>

      ${
        reached
          ? `
            <div style="
              margin-top:3px;
              font-weight:700;
            ">
              🎉 FIRE達成
            </div>
          `
          : ""
      }
    `;

    /*
     * -----------------------------------------------
     * ツールチップ位置
     *
     * 指に追従させすぎず、
     * グラフ上部付近に安定表示
     * -----------------------------------------------
     */

    const parentRect =
      parent.getBoundingClientRect();

    const canvasRect =
      canvas.getBoundingClientRect();

    const tooltipWidth =
      tooltip.offsetWidth || 150;

    const tooltipHeight =
      tooltip.offsetHeight || 70;

    /*
     * グラフ上のX座標
     */
    let left =
      canvasRect.left -
      parentRect.left +
      x -
      tooltipWidth / 2;

    /*
     * 左端からはみ出さない
     */
    left = Math.max(
      6,
      left
    );

    /*
     * 右端からはみ出さない
     */
    left = Math.min(
      parentRect.width -
        tooltipWidth -
        6,
      left
    );

    /*
     * 基本はポイントより上
     */
    let top =
      canvasRect.top -
      parentRect.top +
      y -
      tooltipHeight -
      14;

    /*
     * 上にはみ出す場合は
     * ポイントの下側
     */
    if (top < 6) {
      top =
        canvasRect.top -
        parentRect.top +
        y +
        14;
    }

    tooltip.style.left =
      Math.round(left) + "px";

    tooltip.style.top =
      Math.round(top) + "px";

    tooltip.style.opacity = "1";
  }

  /*
   * ==================================================
   * ツールチップを閉じる
   * ==================================================
   */

  function hideTooltip() {
    canvas._selectedIndex = null;

    clearSelection();

    if (tooltip) {
      tooltip.style.opacity = "0";
    }
  }

  /*
   * ==================================================
   * 指のX座標 → 一番近い年齢
   * ==================================================
   */

  function getNearestIndex(clientX) {
    const state =
      canvas._chartState;

    const rect =
      canvas.getBoundingClientRect();

    let x =
      clientX - rect.left;

    /*
     * グラフの描画範囲内に限定
     */
    x = Math.max(
      state.pad.l,
      Math.min(
        state.pad.l + state.W,
        x
      )
    );

    const ratio =
      (x - state.pad.l) /
      state.W;

    const age =
      state.minAge +
      ratio *
        (state.maxAge -
          state.minAge);

    /*
     * 年齢単位でスナップ
     */
    let nearest = 0;
    let distance = Infinity;

    state.series.forEach(
      (point, index) => {
        const d =
          Math.abs(
            point.age - age
          );

        if (d < distance) {
          distance = d;
          nearest = index;
        }
      }
    );

    return nearest;
  }

  /*
   * ==================================================
   * 選択
   * ==================================================
   */

  function selectPoint(
    index,
    immediate = false
  ) {
    const state =
      canvas._chartState;

    if (!state || !state.series[index]) {
      return;
    }

    if (
      canvas._selectedIndex === index
    ) {
      return;
    }

    canvas._selectedIndex =
      index;

    /*
     * 視覚的な「カチッ」を作る
     */
    renderSelection();

    /*
     * Androidなど対応環境では
     * ごく短い振動
     *
     * iPhone Safariでは基本的に
     * 動作しません。
     */
    if (!immediate) {
      try {
        if (
          navigator.vibrate
        ) {
          navigator.vibrate(8);
        }
      } catch (e) {
        // 無視
      }
    }
  }

  /*
   * ==================================================
   * requestAnimationFrame制御
   *
   * pointermoveのたびに重い処理をせず、
   * 画面更新タイミングに合わせて描画
   * ==================================================
   */

  let pendingX = null;
  let rafId = null;

  function scheduleSelection(
    clientX
  ) {
    pendingX = clientX;

    if (rafId !== null) {
      return;
    }

    rafId =
      requestAnimationFrame(
        () => {
          rafId = null;

          if (pendingX === null) {
            return;
          }

          const x =
            pendingX;

          pendingX = null;

          const index =
            getNearestIndex(x);

          selectPoint(index);
        }
      );
  }

  /*
  * ==================================================
  * タッチ操作
  *
  * ・横方向 → グラフ操作
  * ・縦方向 → ページスクロール
  * ・横方向に確定したら、その後はグラフ操作を優先
  * ==================================================
  */

  let touchStartX = 0;
  let touchStartY = 0;

  let touchMode = null;
  // null
  // "pending"
  // "chart"
  // "scroll"

  let lastTouchX = null;


  /*
  * --------------------------------------------------
  * 指を置いた瞬間
  * --------------------------------------------------
  */

  canvas.addEventListener(
    "pointerdown",
    (event) => {

      if (
        event.pointerType !== "touch" &&
        event.pointerType !== "pen"
      ) {
        return;
      }

      touchStartX = event.clientX;
      touchStartY = event.clientY;

      lastTouchX = event.clientX;

      touchMode = "pending";

      canvas._isTouching = true;

      try {
        canvas.setPointerCapture(
          event.pointerId
        );
      } catch (e) {
        // 無視
      }

      /*
      * 最初のポイントは即座に表示
      */
      const index =
        getNearestIndex(
          event.clientX
        );

      selectPoint(
        index,
        true
      );

      /*
      * ここでは preventDefault しない
      *
      * まだ
      * 「横操作なのか縦スクロールなのか」
      * 分からないため
      */
    },
    {
      passive: false
    }
  );


  /*
   * --------------------------------------------------
   * 指を動かす
   * --------------------------------------------------
   */

  canvas.addEventListener(
    "pointermove",
    (event) => {

      if (
        event.pointerType !== "touch" &&
        event.pointerType !== "pen"
      ) {
        /*
        * PCマウス
        */
        scheduleSelection(
          event.clientX
        );

        return;
      }

      if (!canvas._isTouching) {
        return;
      }

      const dx =
        event.clientX -
        touchStartX;

      const dy =
        event.clientY -
        touchStartY;

      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      /*
      * ----------------------------------------------
      * まだ方向が決まっていない
      * ----------------------------------------------
      */

      if (touchMode === "pending") {

        /*
        * 小さな指ブレは無視
        */
        if (
          absX < 6 &&
          absY < 6
        ) {
          return;
        }

        /*
        * 横方向の動きが明らかに大きい
        */
        if (absX > absY * 1.15) {

          touchMode = "chart";

        }
        /*
        * 縦方向の動きが明らかに大きい
        */
        else if (absY > absX * 1.15) {

          touchMode = "scroll";

          /*
          * グラフ操作を終了
          */
          hideTooltip();

          return;
        }

        /*
        * まだ判定できない
        */
        else {
          return;
        }
      }


      /*
      * ----------------------------------------------
      * 縦スクロール
      * ----------------------------------------------
      */

      if (touchMode === "scroll") {
        return;
      }


      /*
      * ----------------------------------------------
      * グラフ操作
      * ----------------------------------------------
      */

      if (touchMode === "chart") {

        /*
        * Safariに
        *
        * 「これはグラフ操作です」
        *
        * と伝える
        */
        event.preventDefault();

        lastTouchX =
          event.clientX;

        scheduleSelection(
          event.clientX
        );
      }

    },
    {
      passive: false
    }
  );


  /*
   * --------------------------------------------------
   * 指を離す
   * --------------------------------------------------
   */

  canvas.addEventListener(
    "pointerup",
    (event) => {

      if (
        event.pointerType === "touch" ||
        event.pointerType === "pen"
      ) {

        canvas._isTouching = false;

        touchMode = null;

        lastTouchX = null;

        try {
          canvas.releasePointerCapture(
            event.pointerId
          );
        } catch (e) {
          // 無視
        }
      }
    }
  );


  /*
   * ==================================================
   * タッチキャンセル
   * ==================================================
   */

  canvas.addEventListener(
    "pointercancel",
    (event) => {

      canvas._isTouching = false;

      touchMode = null;

      lastTouchX = null;

      try {
        canvas.releasePointerCapture(
          event.pointerId
        );
      } catch (e) {
        // 無視
      }

      hideTooltip();
    }
  );

  /*
   * ==================================================
   * PCマウス
   * ==================================================
   */

  canvas.addEventListener(
    "pointerenter",
    (event) => {
      if (
        event.pointerType === "mouse"
      ) {
        canvas._isMouseOver = true;
      }
    }
  );

  canvas.addEventListener(
    "pointerleave",
    (event) => {
      if (
        event.pointerType === "mouse"
      ) {
        canvas._isMouseOver = false;
        hideTooltip();
      }
    }
  );

  /*
   * ==================================================
   * グラフ外をタップ
   *
   * これで
   *
   * 「グラフ外をタップしたのに
   *  ツールチップが残る」
   *
   * を防ぐ
   * ==================================================
   */

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (
        event.pointerType !== "touch" &&
        event.pointerType !== "pen"
      ) {
        return;
      }

      if (
        event.target === canvas ||
        canvas.contains(event.target) ||
        event.target === overlay ||
        overlay.contains(event.target) ||
        event.target === tooltip ||
        tooltip.contains(event.target)
      ) {
        return;
      }

      hideTooltip();
    },
    { passive: true }
  );

  /*
   * ==================================================
   * 初期化
   * ==================================================
   */

  resizeOverlay();

  /*
   * Canvasサイズ変更時
   */
  if (!canvas._resizeObserver) {
    canvas._resizeObserver =
      new ResizeObserver(() => {
        resizeOverlay();
      });

    canvas._resizeObserver.observe(
      canvas
    );
  }
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