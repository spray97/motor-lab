(function () {
  const { h, s, rad } = SIM;
  const W = 640, H = 340, CX = 320, CY = 170, R_ROT = 62;
  const P_PAIRS = 2, KT = 8, J = 0.5, WINDOW = 20; // 극쌍 2, 토크상수 8 N·m/A, 관성 0.5 kg·m², 그래프 20초
  const RAMP = 120; // 자기장 가속 한도 (rpm/s)
  const RPM = 60 / (2 * Math.PI);

  SIM.steps.push({ id: 's5', name: '속도와 부하 실험', render });

  function render() {
    const st = { I: 3, f: 20, L: 0, speed: 1, thF: 0, wF: 0, thR: 0, wR: 0, t: 0, lost: false, hist: [], acc: 0, touched: false };
    const svg = s('svg', { class: 'viz', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '회전자의 회전력과 부하' });
    const gM = s('g'), gA = s('g');
    svg.append(gM, gA);
    const cv = h('canvas', { class: 'graph', width: 640, height: 240, role: 'img', 'aria-label': '회전 속도 그래프' });
    const cssv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const tauMax = () => KT * st.I;
    const delta = () => P_PAIRS * (st.thF - st.thR); // 부하각(전기 라디안)

    function physics(dt) {
      const wT = (2 * Math.PI * st.f) / P_PAIRS; // 목표 자기장 각속도(기계 rad/s)
      const maxStep = (RAMP / RPM) * dt;
      st.wF += Math.max(-maxStep, Math.min(maxStep, wT - st.wF));
      const d = delta();
      const dl = Math.min(6, 0.25 * tauMax()); // 교육용 감쇠(진동 가라앉힘): 낼 수 있는 토크의 25% 이내, 탈조 후에는 없음
      const damp = st.lost ? 0 : Math.max(-dl, Math.min(dl, 2 * (st.wF - st.wR)));
      const tmag = tauMax() * Math.sin(d); // 표시하는 모터 회전력(자기력에 의한 토크)
      const tm = tmag + damp;
      const tl = st.L * (st.wR > 0.5 ? 1 : st.wR < -0.5 ? -1 : 0) * 1 + 0.02 * st.wR;
      let net = tm - tl;
      if (Math.abs(st.wR) <= 0.5) { // 정지 상태: 정지 마찰(부하)이 구동 토크보다 크면 그대로 정지
        if (Math.abs(tm) > st.L) net = tm - Math.sign(tm) * st.L;
        else { net = 0; st.wR = 0; }
      }
      st.wR += (net / J) * dt;
      st.thF += st.wF * dt;
      st.thR += st.wR * dt;
      st.tm = tmag;
      if (Math.abs(d) > Math.PI * 1.02 && st.wF > 1) st.lost = true;
    }

    function drawMotor() {
      gM.replaceChildren(); gA.replaceChildren();
      gM.append(s('circle', { cx: CX, cy: CY, r: 150, fill: 'var(--bg)', stroke: 'var(--ink)', 'stroke-width': 2 }));
      gM.append(s('circle', { cx: CX, cy: CY, r: 92, fill: 'var(--card)', stroke: 'var(--ink)', 'stroke-width': 2 }));
      const rg = s('g', { transform: `rotate(${(-st.thR * 180) / Math.PI} ${CX} ${CY})` });
      rg.append(s('circle', { cx: CX, cy: CY, r: R_ROT, fill: 'var(--card)', stroke: 'var(--ink)', 'stroke-width': 2 }));
      const span = 180 / P_PAIRS;
      for (let q = 0; q < 2 * P_PAIRS; q++) {
        const a0 = q * span - span / 2, a1 = a0 + span, n = q % 2 === 0;
        const pt = (a) => [CX + (R_ROT - 3) * Math.cos(rad(a)), CY - (R_ROT - 3) * Math.sin(rad(a))];
        const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
        rg.append(s('path', { d: `M${CX},${CY}L${x0},${y0}A${R_ROT - 3},${R_ROT - 3} 0 0 0 ${x1},${y1}Z`, fill: n ? 'var(--n)' : 'var(--s)', opacity: 0.92 }));
        const lx = CX + R_ROT * 0.62 * Math.cos(rad((a0 + a1) / 2)), ly = CY - R_ROT * 0.62 * Math.sin(rad((a0 + a1) / 2));
        rg.append(s('text', { x: lx, y: ly + 5, 'text-anchor': 'middle', fill: '#fff', 'font-size': 13, 'font-weight': 800, transform: `rotate(${(st.thR * 180) / Math.PI} ${lx} ${ly})` }, n ? 'N' : 'S'));
      }
      gM.append(rg, s('circle', { cx: CX, cy: CY, r: 4, fill: 'var(--ink)' }));
      // 고정자 자기장(회전하는 N극 방향)
      const thFd = (st.thF * 180) / Math.PI;
      for (let q = 0; q < P_PAIRS; q++) {
        const a = thFd + (q * 360) / P_PAIRS, ex = CX + 84 * Math.cos(rad(a)), ey = CY - 84 * Math.sin(rad(a));
        gA.append(SIM.arrow(CX + 20 * Math.cos(rad(a)), CY - 20 * Math.sin(rad(a)), ex, ey, 'field', { width: 5, head: 14 }));
      }
      // 회전력(보라, 반시계) vs 부하(회색, 시계)
      const tspan = Math.min(110, Math.abs(st.tm || 0) * 3.2);
      const lspan = Math.min(110, st.L * 3.2);
      if (tspan > 8) gA.append(st.tm > 0
        ? SIM.curvedArrow(CX, CY, 112, -20, -20 - tspan, 'torque', { label: '회전력', lx: 40, ly: -6 })
        : SIM.curvedArrow(CX, CY, 112, -20 - tspan, -20, 'torque', { label: '회전력(반대)', lx: 40, ly: -6 }));
      if (lspan > 8) gA.append(SIM.curvedArrow(CX, CY, 128, -200 - lspan, -200, 'torque', { color: 'var(--ink)', label: '부하', lx: -30, ly: 20 }));
      gA.append(s('text', { x: CX, y: 22, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 13 }, '청록 굵은 화살표 = 고정자 회전 자기장 / 보라 곡선 = 회전력 / 검정 곡선 = 부하'));
      gA.append(s('text', { x: CX, y: H - 10, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 12 }, '(회전자는 4극 = 극쌍 2개)'));
    }

    function drawGraph() {
      const c = cv.getContext('2d'), w = cv.width, hh = cv.height;
      c.clearRect(0, 0, w, hh);
      const maxRpm = Math.max(300, (2 * Math.PI * 60 / P_PAIRS) * RPM);
      c.strokeStyle = cssv('--line'); c.fillStyle = cssv('--muted'); c.font = '12px sans-serif'; c.lineWidth = 1;
      for (let k = 0; k <= 4; k++) {
        const y = hh - 24 - (k / 4) * (hh - 40);
        c.beginPath(); c.moveTo(48, y); c.lineTo(w, y); c.stroke();
        c.fillText(Math.round((k / 4) * maxRpm) + '', 6, y + 4);
      }
      const t1 = Math.max(WINDOW, st.t), t0 = t1 - WINDOW;
      const X = (t) => 48 + ((t - t0) / WINDOW) * (w - 52);
      const Y = (rpm) => hh - 24 - (Math.max(0, Math.min(maxRpm, rpm)) / maxRpm) * (hh - 40);
      for (const [key, col, dash] of [['f', cssv('--fld'), [6, 4]], ['r', cssv('--accent'), []]]) {
        c.strokeStyle = col; c.setLineDash(dash); c.lineWidth = 2.5; c.beginPath();
        let first = true;
        for (const p of st.hist) { if (p.t < t0) continue; const x = X(p.t), y = Y(key === 'f' ? p.f : p.r); first ? c.moveTo(x, y) : c.lineTo(x, y); first = false; }
        c.stroke();
      }
      c.setLineDash([]);
      c.fillStyle = cssv('--accent'); c.fillText('━ 회전자 실제 속도(rpm)', 56, 14);
      c.fillStyle = cssv('--fld'); c.fillText('┅ 회전 자기장 속도', 220, 14);
      c.fillStyle = cssv('--muted'); c.fillText('시간(초) →  (최근 20초)', w - 150, hh - 6);
    }

    function updateReadout() {
      const d = delta();
      const dd = Math.abs((((d * 180) / Math.PI + 180) % 360 + 360) % 360 - 180);
      const syn = Math.abs(st.wF - st.wR) < 1.5 && !st.lost;
      const status = st.lost ? '⚠ 탈조(동기 이탈) — 초기화로 다시 시작' : st.f <= 0 ? '정지' : syn ? (Math.abs(st.wF - (2 * Math.PI * st.f) / P_PAIRS) < 0.5 ? '동기 운전 중' : '가속 중') : '가속/조정 중';
      ro.update({
        rpm: SIM.fmt(Math.max(0, st.wR) * RPM, 0) + ' rpm',
        frpm: SIM.fmt(st.wF * RPM, 0) + ' rpm',
        tm: SIM.fmt(st.tm || 0, 1) + ' N·m',
        L: SIM.fmt(st.L, 1) + ' N·m',
        tmax: SIM.fmt(tauMax(), 1) + ' N·m',
        dl: SIM.fmt(dd, 0) + '° (90°에서 최대 토크)',
        stt: status
      });
      cond.textContent = `현재 조건: 전류 ${st.I.toFixed(1)} A(최대 토크 ${tauMax().toFixed(0)} N·m), 전기적 주파수 ${st.f} Hz → 목표 자기장 속도 ${Math.round((60 * st.f) / P_PAIRS)} rpm(극쌍 ${P_PAIRS}), 자기장 가속 ${RAMP} rpm/s, 위치 피드백 없는 단순 제어`;
      return { syn, status };
    }

    function why(res) {
      sh.why(st.lost
        ? '부하가 <b>모터가 낼 수 있는 최대 토크(전류 × 토크 상수)</b>를 넘으면 회전자가 자기장을 따라가지 못해요. 부하각이 한계(180°)를 넘으면 <b>탈조</b>(동기 이탈)가 일어나 회전 속도가 크게 떨어져요. 전류를 키우면 최대 토크가 커지지만, 실제 전동기는 전류 한도(발열)가 있어요.'
        : '부하가 커지면 회전자는 자기장보다 조금 더 <b>뒤처지며</b>(부하각 증가) 더 큰 회전력을 만들어 부하와 균형을 맞춰요. 그래서 한계 이내에서는 <b>속도는 거의 그대로</b>이고 <b>회전자와 자기장 사이의 각도가 커져요</b>. 부하가 최대 토크에 가까워질수록 여유가 줄어요. (이 결과는 위의 “현재 조건”에서의 모델이에요.)');
    }

    function frame(dt) {
      let rem = dt * st.speed;
      while (rem > 0) { const step = Math.min(0.002, rem); physics(step); rem -= step; st.t += step; }
      st.acc += dt * st.speed;
      if (st.acc > 0.05) { st.acc = 0; st.hist.push({ t: st.t, r: Math.max(0, st.wR) * RPM, f: st.wF * RPM }); if (st.hist.length > 1500) st.hist.shift(); }
      drawMotor(); drawGraph();
      const r = updateReadout(); why(r);
    }
    SIM.loop(frame);

    function reset() { Object.assign(st, { thF: 0, wF: 0, thR: 0, wR: 0, t: 0, lost: false, hist: [], acc: 0, tm: 0 }); msg.textContent = ''; }

    const ro = SIM.readout([['rpm', '회전자 실제 속도'], ['frpm', '회전 자기장 속도'], ['tm', '모터 회전력'], ['L', '부하'], ['tmax', '낼 수 있는 최대 회전력'], ['dl', '부하각(자기장과 회전자의 어긋남)'], ['stt', '상태']]);
    const cond = h('div', { class: 'note warn' });
    const slL = SIM.slider('부하(오르막 정도)', 0, 40, 1, st.L, (v) => { st.L = v; st.touched = true; }, (v) => v + ' N·m');
    const slI = SIM.slider('전류 세기', 0.5, 5, 0.5, st.I, (v) => { st.I = v; }, (v) => v.toFixed(1) + ' A');
    const slF = SIM.slider('전기적 주파수', 5, 60, 1, st.f, (v) => { st.f = v; }, (v) => v + ' Hz');
    const slS = SIM.slider('시뮬레이션 속도', 0.5, 4, 0.5, st.speed, (v) => { st.speed = v; }, (v) => '×' + v);
    const bUp = h('button', { class: 'btn', type: 'button', onclick: () => { st.L = Math.min(40, st.L + 5); slL.set(st.L); st.touched = true; } }, '⬆ 부하 +5');
    const bDn = h('button', { class: 'btn', type: 'button', onclick: () => { st.L = Math.max(0, st.L - 5); slL.set(st.L); } }, '⬇ 부하 −5');
    const bReset = h('button', { class: 'btn ghost', type: 'button', onclick: reset }, '↺ 실험 초기화');
    const pred = SIM.predict({
      question: '모터가 일정 속도로 돌고 있을 때 부하를 조금 키우면(한계 이내) 회전 속도는 어떻게 될까요?',
      options: [['slow', '크게 느려진다'], ['same', '거의 그대로(대신 다른 값이 변한다)'], ['fast', '빨라진다']]
    });
    const msg = h('div', { class: 'note', 'aria-live': 'polite' });
    const check = h('button', { class: 'btn alt', type: 'button', onclick: () => {
      if (!st.touched || st.t < 5) { msg.textContent = '먼저 모터를 돌리고(몇 초 기다리기) 부하를 올려 보세요.'; return; }
      msg.textContent = '';
      if (st.lost) pred.compare('slow', '이번에는 부하가 최대 토크를 넘어 탈조가 일어났어요. 한계 이내에서는 속도가 유지되지만, 한계를 넘으면 크게 느려져요.');
      else pred.compare('same', '한계 이내에서는 회전 속도(동기 속도)는 그대로이고, 대신 부하각(어긋남)이 커져 더 큰 회전력을 만들어요.');
    } }, '예측 확인하기');

    const ctrl = h('div', { class: 'card' },
      h('h3', null, '🧪 직접 해 보기'),
      h('p', null, '자동차가 언덕을 오르면 더 큰 힘이 필요해요. 전동기에서는 이처럼 회전을 방해하는 ', SIM.term('부하'), '가 작용해요. (평지 약 5 / 오르막 약 20 / 급경사 약 30 N·m, 교육용 예시값)'),
      pred, h('div', { class: 'ctrl' }, bUp, bDn, bReset, check), msg, slL, slI, slF, slS, ro, cond);

    const sh = SIM.shell({
      id: 's5', title: '5단계 · 전동기의 회전 속도와 부하 실험하기',
      intro: h('p', null, '전동기의 회전 속도는 공급하는 전류와 ', SIM.term('회전 자기장'), '의 속도, 그리고 이겨 내야 하는 ', SIM.term('부하'), '에 영향을 받아요.'),
      goal: '부하가 커질 때 회전 속도·회전력·부하각이 어떻게 달라지는지 직접 실험하고 예측과 비교해요.',
      summary: ['동기전동기의 회전자는 한계 이내에서 회전 자기장과 같은 속도로 돌아요.', '부하가 커지면 회전자가 조금 더 뒤처지며 더 큰 회전력을 내요.', '부하가 낼 수 있는 최대 회전력(전류에 비례)을 넘으면 탈조가 일어나 속도가 크게 떨어져요.'],
      quiz: [
        { q: '부하가 커지고 최대 토크 이내일 때 회전자의 속도는?', choices: ['자기장과 같은 속도로 유지된다', '부하에 비례해 느려진다', '자기장보다 빨라진다'], answer: 0,
          explain: '동기전동기는 한계 이내에서 속도는 같고, 부하각이 커져 더 큰 회전력을 만들어요.', hints: ['한계 이내에서는 오히려 속도가 유지돼요. 비례해서 느려지는 것은 아니에요.', '', '회전자는 자기장을 앞지를 수 없어요.'] },
        { q: '부하를 낼 수 있는 최대 토크보다 크게 하면?', choices: ['더 빨리 돈다', '탈조가 일어나 속도가 떨어진다', '아무 변화가 없다'], answer: 1,
          explain: '자기장을 따라가지 못해 동기가 깨지고(탈조) 평균 회전력이 크게 줄어요.', hints: ['부하는 회전을 방해하는 힘이에요.', '', '한계를 넘으면 반드시 변화가 생겨요.'] }
      ]
    });
    sh.viz.replaceWith(h('div', null, svg, h('div', { style: 'height:8px' }), cv));
    sh.ctrl.replaceWith(ctrl);
    frame(0);
    return sh.root;
  }
})();
