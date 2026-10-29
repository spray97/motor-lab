(function () {
  const { h, s, rad } = SIM;
  const W = 640, H = 400, MX = 420, MY = 200, R_ROT = 60, R_IN = 90, R_OUT = 150;
  const AXES = [0, 120, 240]; // U, V, W 상의 전기각 축
  const NAMES = ['U', 'V', 'W'], VARS = ['--u', '--v', '--w'];
  const DELTA = 30; // 회전자가 자기장보다 뒤처지는 전기각(동기전동기, 교육용 고정값)

  SIM.steps.push({ id: 's4', name: '회전하는 자기장', render });

  // 합성 자기장 = 각 상의 (전류 × 축 방향 단위벡터)의 합
  function fieldVec(i) {
    let x = 0, y = 0;
    for (let k = 0; k < 3; k++) { x += i[k] * Math.cos(rad(AXES[k])); y += i[k] * Math.sin(rad(AXES[k])); }
    return [x, y];
  }
  SIM.threePhase = (thetaE, Ipk, reversed) => {
    const off = reversed ? [0, 240, 120] : [0, 120, 240];
    return off.map((o) => Ipk * Math.cos(rad(thetaE - o)));
  };
  SIM.fieldVec = fieldVec;

  function render() {
    const st = { play: true, rev: false, f: 10, I: 3, ts: 0.05, p: 1, thE: 0, t: 0, seen: 0 };
    const svg = s('svg', { class: 'viz', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '3상 전류가 만드는 회전 자기장과 회전자' });
    const gStat = s('g'), gRot = s('g'), gVec = s('g');
    svg.append(gStat, gRot, gVec);
    const cv = h('canvas', { class: 'graph', width: 640, height: 200, role: 'img', 'aria-label': '3상 전류 그래프' });

    const P = (cx, cy, r, deg) => [cx + r * Math.cos(rad(deg)), cy - r * Math.sin(rad(deg))];
    const cssv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

    function draw() {
      const i = SIM.threePhase(st.thE, st.I, st.rev);
      const [bx, by] = fieldVec(i);
      const thF = (Math.atan2(by, bx) * 180) / Math.PI; // 합성 자기장의 전기각
      const mag = Math.hypot(bx, by);
      const thFm = thF / st.p; // 기계각(N극 하나의 위치)
      const thR = thFm - (st.rev ? -1 : 1) * (DELTA / st.p); // 회전 방향 기준으로 항상 뒤처짐
      gStat.replaceChildren(); gRot.replaceChildren(); gVec.replaceChildren();

      gStat.append(s('circle', { cx: MX, cy: MY, r: R_OUT, fill: 'var(--bg)', stroke: 'var(--ink)', 'stroke-width': 2 }));
      gStat.append(s('circle', { cx: MX, cy: MY, r: R_IN, fill: 'var(--card)', stroke: 'var(--ink)', 'stroke-width': 2 }));
      gStat.append(s('text', { x: MX, y: 24, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 13 }, '고정자 · 코일 U, V, W (위치는 단순화)'));
      for (let k = 0; k < 3; k++) {
        for (let j = 0; j < 2 * st.p; j++) { // 2p극 권선: 같은 상의 극성은 180°/p마다 번갈아 바뀜
          const a2 = AXES[k] / st.p + (j * 180) / st.p;
          const [x, y] = P(MX, MY, (R_IN + R_OUT) / 2, a2);
          const act = Math.abs(i[k]) / Math.max(st.I, 0.01);
          gStat.append(s('circle', { cx: x, cy: y, r: 17, fill: cssv(VARS[k]), opacity: 0.18 + 0.7 * act }));
          gStat.append(s('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 800, fill: 'var(--ink)' }, NAMES[k] + (j % 2 === 0 ? '+' : '−')));
        }
      }
      // 회전자: 2p개의 극
      const rg = s('g', { transform: `rotate(${-thR} ${MX} ${MY})` });
      rg.append(s('circle', { cx: MX, cy: MY, r: R_ROT, fill: 'var(--card)', stroke: 'var(--ink)', 'stroke-width': 2 }));
      const span = 180 / st.p;
      for (let q = 0; q < 2 * st.p; q++) {
        const a0 = q * span - span / 2, a1 = a0 + span, n = q % 2 === 0;
        const [x0, y0] = P(MX, MY, R_ROT - 3, a0), [x1, y1] = P(MX, MY, R_ROT - 3, a1);
        rg.append(s('path', { d: `M${MX},${MY}L${x0},${y0}A${R_ROT - 3},${R_ROT - 3} 0 0 0 ${x1},${y1}Z`, fill: n ? 'var(--n)' : 'var(--s)', opacity: 0.92 }));
        const [lx, ly] = P(MX, MY, R_ROT * 0.62, (a0 + a1) / 2);
        rg.append(s('text', { x: lx, y: ly + 5, 'text-anchor': 'middle', fill: '#fff', 'font-size': 14, 'font-weight': 800, transform: `rotate(${thR} ${lx} ${ly})` }, n ? 'N' : 'S'));
      }
      gRot.append(rg, s('circle', { cx: MX, cy: MY, r: 4, fill: 'var(--ink)' }));

      // 합성 자기장(굵은 화살표): N극 방향
      const L = 20 + mag * 14;
      for (let q = 0; q < st.p; q++) {
        const a = thFm + (q * 360) / st.p;
        const [ex, ey] = P(MX, MY, Math.min(R_IN - 6, L + R_ROT * 0.2), a);
        gVec.append(SIM.arrow(MX, MY, ex, ey, 'field', { width: 6, head: 16, color: 'var(--fld)' }));
      }
      gVec.append(s('text', { x: MX, y: MY + R_OUT + 24, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--muted)' }, '굵은 청록 화살표 = 합성 자기장(고정자 N극 방향)'));

      // 전기각 벡터도 (왼쪽 위)
      const VX = 105, VY = 120, VR = 78;
      gVec.append(s('circle', { cx: VX, cy: VY, r: VR, fill: 'none', stroke: 'var(--line)', 'stroke-dasharray': '3 4' }));
      gVec.append(s('text', { x: VX, y: 18, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--muted)' }, '전기각 벡터도 (상별 자기장 → 합)'));
      let ax = VX, ay = VY;
      for (let k = 0; k < 3; k++) {
        const len = (i[k] / Math.max(st.I, 0.01)) * 36;
        const dx = Math.cos(rad(AXES[k])) * len, dy = -Math.sin(rad(AXES[k])) * len;
        gVec.append(s('line', { x1: VX, y1: VY, x2: VX + Math.cos(rad(AXES[k])) * 60, y2: VY - Math.sin(rad(AXES[k])) * 60, stroke: cssv(VARS[k]), 'stroke-width': 1, opacity: 0.35 }));
        gVec.append(SIM.arrow(ax, ay, ax + dx, ay + dy, 'field', { color: cssv(VARS[k]), width: 3, head: 8 }));
        ax += dx; ay += dy;
        const [lx, ly] = P(VX, VY, 68, AXES[k]);
        gVec.append(s('text', { x: lx, y: ly + 4, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 800, fill: cssv(VARS[k]) }, NAMES[k]));
      }
      gVec.append(SIM.arrow(VX, VY, ax, ay, 'field', { color: 'var(--fld)', width: 5, head: 13 }));
      gVec.append(s('text', { x: VX, y: VY + VR + 22, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--fld)' }, '굵은 화살표 = 합성 자기장'));

      drawGraph();
      const wm = (60 * st.f) / st.p;
      ro.update({
        iu: SIM.fmt(i[0], 2) + ' A', iv: SIM.fmt(i[1], 2) + ' A', iw: SIM.fmt(i[2], 2) + ' A',
        mag: SIM.fmt(mag, 2) + ' (= 1.5 × ' + st.I.toFixed(1) + ')',
        ang: SIM.fmt(((thF % 360) + 360) % 360, 0) + '°',
        fe: st.f + ' Hz', rpm: SIM.fmt(wm, 0) + ' rpm'
      });
      why();
    }

    function drawGraph() {
      const c = cv.getContext('2d'), w = cv.width, hh = cv.height;
      c.clearRect(0, 0, w, hh);
      c.strokeStyle = cssv('--line'); c.lineWidth = 1;
      c.beginPath(); c.moveTo(0, hh / 2); c.lineTo(w, hh / 2); c.stroke();
      const amp = hh / 2 - 22;
      for (let k = 0; k < 3; k++) {
        c.strokeStyle = cssv(VARS[k]); c.lineWidth = 2.5; c.beginPath();
        for (let x = 0; x <= w; x++) {
          const th = (x / w) * 720;
          const v = SIM.threePhase(th, 1, st.rev)[k];
          const y = hh / 2 - v * amp;
          x ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.stroke();
        c.fillStyle = cssv(VARS[k]); c.font = 'bold 14px sans-serif';
        c.fillText(NAMES[k], 6 + k * 24, 16);
      }
      c.fillStyle = cssv('--muted'); c.font = '12px sans-serif';
      c.fillText('가로축: 전기각 0°~720° (두 주기) / 세로축: 전류', 90, 16);
      const cx = ((st.thE % 720 + 720) % 720 / 720) * w;
      c.strokeStyle = cssv('--ink'); c.lineWidth = 2;
      c.beginPath(); c.moveTo(cx, 22); c.lineTo(cx, hh - 6); c.stroke();
    }

    function why() {
      sh.why('세 코일은 서로 <b>120°씩 다른 방향</b>에 있고, 전류도 시간차(120°)를 두고 변해요. 한 코일의 자기장이 약해질 때 다음 코일의 자기장이 강해지면서 <b>합친 자기장(합성 자기장)의 방향이 한 바퀴씩 돌아요</b>. 합성 자기장의 크기는 항상 일정(1.5×전류)해요. 코일은 움직이지 않는데도 N극이 도는 효과가 나는 것이 핵심이에요. <br><b>전기적 주파수</b>는 전류가 1초에 몇 번 반복되는지이고, 회전자의 <b>기계적 회전 속도</b>는 <b>60×f ÷ 극쌍 수</b>(rpm)라서 같은 개념이 아니에요. 극쌍 수가 2이면 같은 주파수에서 절반 속도로 돌아요.');
    }

    SIM.loop((dt) => {
      if (!st.play) return;
      st.thE += 360 * st.f * st.ts * dt;
      st.t += dt; st.seen += dt;
      draw();
    });

    const ro = SIM.readout([['iu', '전류 U'], ['iv', '전류 V'], ['iw', '전류 W'], ['mag', '합성 자기장 세기'], ['ang', '합성 자기장 방향(전기각)'], ['fe', '전기적 주파수'], ['rpm', '자기장·회전자 속도']]);
    const btnPlay = h('button', { class: 'btn', type: 'button', onclick: () => { st.play = !st.play; btnPlay.textContent = st.play ? '⏸ 일시 정지' : '▶ 재생'; } }, '⏸ 일시 정지');
    const btnRev = h('button', { class: 'btn', type: 'button', onclick: () => { st.rev = !st.rev; draw(); } }, '🔁 회전 방향 바꾸기');
    const btnReset = h('button', { class: 'btn ghost', type: 'button', onclick: () => { st.thE = 0; st.seen = 0; draw(); } }, '↺ 처음으로');
    const slF = SIM.slider('전류 주파수', 1, 60, 1, st.f, (v) => { st.f = v; draw(); }, (v) => v + ' Hz');
    const slI = SIM.slider('전류 세기', 0.5, 5, 0.5, st.I, (v) => { st.I = v; draw(); }, (v) => v.toFixed(1) + ' A');
    const slT = SIM.slider('애니메이션 속도', 0.01, 0.2, 0.01, st.ts, (v) => { st.ts = v; }, (v) => '×' + v.toFixed(2));
    const pBtns = [1, 2, 3].map((n) => h('button', { class: 'btn alt', type: 'button', 'aria-pressed': String(n === 1), onclick: () => { st.p = n; pBtns.forEach((b, j) => b.setAttribute('aria-pressed', String(j + 1 === n))); draw(); } }, `극쌍 ${n}개`));
    const pred = SIM.predict({
      question: '세 코일에 시간차를 두고 전류를 보내면 합성 자기장은 어떻게 될까요?',
      options: [['fixed', '한 방향으로 고정된다'], ['rotate', '방향이 회전한다'], ['vanish', '서로 상쇄되어 사라진다']]
    });
    const msg = h('div', { class: 'note', 'aria-live': 'polite' });
    const check = h('button', { class: 'btn alt', type: 'button', onclick: () => {
      if (st.seen < 2) { msg.textContent = '먼저 재생 상태로 2~3초 동안 관찰해 보세요.'; return; }
      msg.textContent = '';
      pred.compare('rotate', '합성 자기장의 크기는 일정하고 방향만 회전해요. (크기 1.5×전류 일정)');
    } }, '예측 확인하기');

    const ctrl = h('div', { class: 'card' },
      h('h3', null, '🧪 직접 해 보기'),
      h('p', null, SIM.term('3상 교류'), '는 서로 시간차를 두고 변하는 세 개의 ', SIM.term('교류'), ' 전류예요. 이 전류가 만드는 ', SIM.term('회전 자기장'), '을 관찰해 보세요.'),
      pred, h('div', { class: 'ctrl' }, btnPlay, btnRev, btnReset, check), msg,
      slF, slI, slT,
      h('div', { class: 'ctrl' }, h('span', { class: 'note' }, SIM.term('극쌍 수'), ' 선택:'), ...pBtns),
      ro,
      h('div', { class: 'note warn' }, '회전자는 (회전 방향 기준) 합성 자기장보다 전기각 30° 뒤에서 동기(같은 속도)로 따라간다고 단순화했어요. 실제 전동기의 부하·가속 반응은 5단계에서 계산해요. 애니메이션 속도는 화면에서 보기 쉽게 시간을 늦춘 배율이고, 수치(주파수·rpm)는 실제 값 기준이에요.'));

    const sh = SIM.shell({
      id: 's4', title: '4단계 · 회전하는 자기장 관찰하기',
      intro: h('p', null, '고정자에는 여러 코일이 있어요. 각 코일에 전류를 순서대로 다르게 공급하면 코일은 움직이지 않아도 자기장의 방향이 회전하는 것처럼 바뀌고, 회전자는 이 자기장을 따라 돌아요.'),
      goal: '3상 교류가 합성 자기장을 만들어 회전시키는 과정과 전기적 주파수·회전 속도의 관계를 확인해요.',
      summary: ['U·V·W 세 코일에 120° 시간차의 교류를 주면 합성 자기장이 일정한 크기로 회전해요.', '회전 방향은 전류의 순서(V와 W를 바꾸기)로 바꿀 수 있어요.', '회전 속도(rpm)는 60 × 주파수 ÷ 극쌍 수라서, 전기적 주파수와 기계적 속도는 같은 개념이 아니에요.'],
      quiz: [
        { q: '3상 교류에서 세 전류의 위상차는?', choices: ['0° (동시에 변함)', '120°', '360°'], answer: 1,
          explain: 'U·V·W는 한 주기(360°)를 3등분한 120°씩 시간차를 두고 변해요.', hints: ['동시에 변하면 합성 자기장이 회전하지 않고 제자리에서 커졌다 작아지기만 해요.', '', '360°는 한 주기라서 처음과 같은 상태예요.'] },
        { q: '극쌍 수가 2이고 주파수가 60Hz일 때 자기장의 회전 속도는?', choices: ['3600 rpm', '1800 rpm', '120 rpm'], answer: 1,
          explain: '60 × 60 ÷ 2 = 1800 rpm. 극쌍 수가 늘면 같은 주파수에서 더 천천히 돌아요.', hints: ['극쌍이 1개일 때의 값이에요. 극쌍 수로 나눠야 해요.', '', '60을 한 번 더 곱해야 해요: 60×f.'] }
      ]
    });
    sh.viz.replaceWith(h('div', null, svg, h('div', { style: 'height:8px' }), cv));
    sh.ctrl.replaceWith(ctrl);
    draw();
    return sh.root;
  }
})();
