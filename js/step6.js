(function () {
  const { h, s, rad } = SIM;
  // 교육용 예시값 (표면부착형 PMSM 단순 모델: Ld = Lq, 저항 무시)
  const M = { p: 4, psi0: 0.12, L: 0.0004, Imax: 250, Vdc: 400 };
  M.Vlim = M.Vdc / Math.sqrt(3);
  const W = 640, H = 330, MAXRPM = 16000, EMAX = 360;
  const RPM2W = (2 * Math.PI) / 60;

  SIM.steps.push({ id: 's6', name: '역기전력과 고속 제어', render });

  // 주어진 속도(rpm)와 d축 전류 id(≤0)에서의 값
  function at(rpm, id) {
    const we = M.p * rpm * RPM2W;
    const psi = M.psi0 + M.L * id; // 유효 자속
    const E = we * Math.abs(psi);
    const iqCur = Math.sqrt(Math.max(0, M.Imax * M.Imax - id * id));
    const iqVolt = we > 0 ? Math.sqrt(Math.max(0, M.Vlim * M.Vlim - E * E)) / (we * M.L) : Infinity;
    const iq = Math.min(iqCur, iqVolt);
    const T = E >= M.Vlim ? 0 : 1.5 * M.p * M.psi0 * iq; // 표면부착형(Ld=Lq): 토크는 영구자석 자속 × q축 전류
    return { we, psi, E, iq, T: Math.max(0, T), id, ok: E < M.Vlim && T > 0.05 };
  }
  // 약계자 제어 OFF: id = 0 / ON: 토크가 가장 큰 id(≤0)를 선택(전압·전류 한계 안에서)
  function model(rpm, fw) {
    if (!fw) return at(rpm, 0);
    let best = at(rpm, 0);
    for (let id = -1; id >= -M.Imax; id -= 1) { const r = at(rpm, id); if (r.T > best.T + 1e-9) best = r; }
    return best;
  }
  SIM.pmModel = { model, M };

  function render() {
    const st = { rpm: 2000, fw: false, ang: 0, seenHigh: false };
    const svg = s('svg', { class: 'viz', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '영구자석의 자속, 유효 자속, 역기전력과 전압 한계' });
    const g = s('g'); svg.append(g);
    const cvE = h('canvas', { class: 'graph', width: 640, height: 220, role: 'img', 'aria-label': '속도에 따른 역기전력 그래프' });
    const cvT = h('canvas', { class: 'graph', width: 640, height: 220, role: 'img', 'aria-label': '속도에 따른 낼 수 있는 최대 회전력 그래프' });
    const cssv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

    let rotG = null, txtN = null, txtS = null;
    function spin() {
      const a = st.ang;
      rotG.setAttribute('transform', `rotate(${-a} 95 92)`);
      txtN.setAttribute('transform', `rotate(${a} 123 92)`);
      txtS.setAttribute('transform', `rotate(${a} 67 92)`);
    }
    function draw() {
      const on = model(st.rpm, st.fw), off = model(st.rpm, false), onFw = model(st.rpm, true);
      g.replaceChildren();
      // (1) 회전자 + 영구자석 (극은 항상 그대로)
      const RX = 95, RY = 92;
      const rg = s('g', { transform: `rotate(${-st.ang} ${RX} ${RY})` });
      rg.append(s('circle', { cx: RX, cy: RY, r: 58, fill: 'var(--card)', stroke: 'var(--ink)', 'stroke-width': 2 }));
      rg.append(s('path', { d: `M${RX},${RY - 26}H${RX + 52}V${RY + 26}H${RX}Z`, fill: 'var(--n)' }));
      rg.append(s('path', { d: `M${RX},${RY - 26}H${RX - 52}V${RY + 26}H${RX}Z`, fill: 'var(--s)' }));
      g.append(rg);
      rotG = rg;
      const tN = s('text', { x: RX + 28, y: RY + 5, 'text-anchor': 'middle', fill: '#fff', 'font-size': 15, 'font-weight': 800 }, 'N');
      const tS = s('text', { x: RX - 28, y: RY + 5, 'text-anchor': 'middle', fill: '#fff', 'font-size': 15, 'font-weight': 800 }, 'S');
      rg.append(tN, tS);
      txtN = tN; txtS = tS; spin();
      g.append(s('text', { x: RX, y: 168, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--muted)' }, '회전자 (N·S극은 그대로)'));
      g.append(s('text', { x: RX, y: 184, 'text-anchor': 'middle', 'font-size': 12, fill: 'var(--muted)' }, `${Math.round(st.rpm)} rpm (슬로모션)`));

      // (2) 자속 벡터: 영구자석 자속 − (d축 전류가 만드는 자속) = 유효 자속
      const X0 = 230, Y0 = 70, SC = 440; // 1 Wb ≈ 440 px
      const lenPM = M.psi0 * SC, lenFw = -M.L * on.id * SC;
      g.append(s('text', { x: X0, y: 24, 'font-size': 13, 'font-weight': 700, fill: 'var(--ink)' }, '자속(자기장의 양) 비교'));
      g.append(SIM.arrow(X0, Y0, X0 + lenPM, Y0, 'field', { color: 'var(--fld)', width: 6, head: 14 }));
      g.append(s('text', { x: X0 + lenPM + 8, y: Y0 + 5, 'font-size': 12, fill: 'var(--fld)' }, '영구자석 자속'));
      if (lenFw > 0.5) {
        g.append(SIM.arrow(X0 + lenPM, Y0 + 34, X0 + lenPM - lenFw, Y0 + 34, 'field', { color: 'var(--cur)', width: 6, head: 14 }));
        g.append(s('text', { x: X0 + lenPM + 8, y: Y0 + 39, 'font-size': 12, fill: 'var(--cur)' }, `d축 전류 −${SIM.fmt(-on.id, 0)}A 가 만드는 반대 방향 자속`));
      } else g.append(s('text', { x: X0 + 4, y: Y0 + 39, 'font-size': 12, fill: 'var(--muted)' }, 'd축 전류 0 → 자속을 줄이지 않음'));
      g.append(SIM.arrow(X0, Y0 + 70, X0 + Math.max(0, on.psi) * SC, Y0 + 70, 'field', { color: 'var(--accent)', width: 6, head: 14 }));
      g.append(s('text', { x: X0 + Math.max(0, on.psi) * SC + 8, y: Y0 + 75, 'font-size': 12, fill: 'var(--accent)' }, `유효 자속 ${SIM.fmt((on.psi / M.psi0) * 100, 0)}%`));

      // (3) 역기전력 vs 전압 한계 막대
      const BX = 20, BY = 252, BW = 600, sx = (v) => BX + (Math.min(v, EMAX) / EMAX) * BW;
      g.append(s('text', { x: BX, y: BY - 28, 'font-size': 13, 'font-weight': 700, fill: 'var(--ink)' }, '역기전력 vs 배터리가 낼 수 있는 전압(한계)'));
      g.append(s('rect', { x: BX, y: BY - 18, width: BW, height: 22, rx: 6, fill: 'var(--bg)', stroke: 'var(--line)' }));
      const over = on.E >= M.Vlim * 0.999;
      if (st.fw) g.append(s('rect', { x: BX, y: BY - 18, width: sx(off.E) - BX, height: 22, rx: 6, fill: 'var(--muted)', opacity: 0.25 }));
      g.append(s('rect', { x: BX, y: BY - 18, width: Math.max(2, sx(on.E) - BX), height: 22, rx: 6, fill: over ? 'var(--bad)' : on.E > M.Vlim * 0.8 ? 'var(--cur)' : 'var(--accent)' }));
      g.append(s('line', { x1: sx(M.Vlim), y1: BY - 26, x2: sx(M.Vlim), y2: BY + 10, stroke: 'var(--bad)', 'stroke-width': 3, 'stroke-dasharray': '4 3' }));
      g.append(s('text', { x: sx(M.Vlim) + 6, y: BY + 24, 'font-size': 12, fill: 'var(--bad)' }, `전압 한계 ${SIM.fmt(M.Vlim, 0)} V`));
      g.append(s('text', { x: BX + 4, y: BY + 24, 'font-size': 12, fill: 'var(--ink)' }, `역기전력 ${SIM.fmt(on.E, 0)} V` + (st.fw ? `  (약계자 OFF였다면 ${SIM.fmt(off.E, 0)} V, 회색 막대)` : '')));

      const E_limit = SIM.fmt(Math.min(100, (on.E / M.Vlim) * 100), 0);
      const status = !on.ok
        ? (st.fw ? '⚠ 이 속도는 전압·전류 한계 때문에 낼 수 없어요' : '⚠ 역기전력이 전압 한계에 도달 → 전류가 흐르기 어려워 이 속도를 낼 수 없어요')
        : on.id < -0.5 ? '약계자 제어 작동 중 (d축 전류로 유효 자속을 줄임)' : on.E > M.Vlim * 0.8 ? '전압 한계에 가까워지는 중' : '여유 있음';
      ro.update({
        rpm: Math.round(st.rpm) + ' rpm', V: SIM.fmt(M.Vlim, 0) + ' V (배터리 ' + M.Vdc + ' V 기준)',
        E: SIM.fmt(on.E, 0) + ' V', pct: E_limit + ' % ' + (+E_limit >= 100 ? '(도달)' : ''),
        fw: st.fw ? 'ON' : 'OFF', id: SIM.fmt(on.id, 0) + ' A', psi: SIM.fmt((on.psi / M.psi0) * 100, 0) + ' %',
        T: SIM.fmt(on.T, 1) + ' N·m', Toff: SIM.fmt(off.T, 1) + ' N·m', stt: status
      });
      cmp.textContent = `같은 ${Math.round(st.rpm)} rpm에서 비교 — 약계자 OFF: 유효 자속 100%, 역기전력 ${SIM.fmt(off.E, 0)} V, 낼 수 있는 최대 회전력 ${SIM.fmt(off.T, 1)} N·m  /  약계자 ON: 유효 자속 ${SIM.fmt(onFw.psi / M.psi0 * 100, 0)}%, 역기전력 ${SIM.fmt(onFw.E, 0)} V, 최대 회전력 ${SIM.fmt(onFw.T, 1)} N·m`;
      sw.classList.toggle('on', st.fw);
      if (st.rpm >= 4000) st.seenHigh = true;
      drawGraphs();
      explain(on, off);
    }

    const cache = {};
    function series(fw) {
      const k = fw ? 'on' : 'off';
      if (!cache[k]) { cache[k] = []; for (let x = 0; x <= 590; x += 4) cache[k].push(model((x / 590) * MAXRPM, fw)); }
      return cache[k];
    }
    function curve(c, w, hh, fw, prop, maxY, col) {
      c.strokeStyle = col; c.lineWidth = 2.5; c.beginPath();
      series(fw).forEach((r, i) => {
        const x = i * 4, v = Math.min(r[prop], maxY * 1.05);
        const px = 46 + x, py = hh - 26 - (v / maxY) * (hh - 44);
        i ? c.lineTo(px, py) : c.moveTo(px, py);
      });
      c.stroke();
    }
    function frame(c, w, hh, maxY, unit, title) {
      c.clearRect(0, 0, w, hh);
      c.strokeStyle = cssv('--line'); c.fillStyle = cssv('--muted'); c.font = '12px sans-serif'; c.lineWidth = 1;
      for (let k = 0; k <= 4; k++) {
        const y = hh - 26 - (k / 4) * (hh - 44);
        c.beginPath(); c.moveTo(46, y); c.lineTo(w, y); c.stroke();
        c.fillText(Math.round((k / 4) * maxY) + '', 4, y + 4);
      }
      for (let k = 0; k <= 4; k++) c.fillText(Math.round((k / 4) * MAXRPM) + '', 46 + (k / 4) * (w - 50) - 14, hh - 8);
      c.fillStyle = cssv('--ink'); c.font = 'bold 12px sans-serif'; c.fillText(title + ' (' + unit + ')   가로축: 회전 속도(rpm)', 50, 14);
    }
    function drawGraphs() {
      let c = cvE.getContext('2d'), w = cvE.width, hh = cvE.height;
      frame(c, w, hh, EMAX, 'V', '역기전력');
      const yV = hh - 26 - (M.Vlim / EMAX) * (hh - 44);
      c.strokeStyle = cssv('--bad'); c.setLineDash([6, 4]); c.lineWidth = 2; c.beginPath(); c.moveTo(46, yV); c.lineTo(w, yV); c.stroke(); c.setLineDash([]);
      c.fillStyle = cssv('--bad'); c.fillText('전압 한계', w - 70, yV - 5);
      curve(c, w, hh, false, 'E', EMAX, cssv('--muted'));
      curve(c, w, hh, true, 'E', EMAX, cssv('--accent'));
      c.fillStyle = cssv('--muted'); c.fillText('━ 약계자 OFF', 56, 34); c.fillStyle = cssv('--accent'); c.fillText('━ 약계자 ON(필요할 때만 작동)', 140, 34);
      cursor(c, w, hh);
      c = cvT.getContext('2d'); w = cvT.width; hh = cvT.height;
      frame(c, w, hh, 200, 'N·m', '낼 수 있는 최대 회전력');
      curve(c, w, hh, false, 'T', 200, cssv('--muted'));
      curve(c, w, hh, true, 'T', 200, cssv('--accent'));
      cursor(c, w, hh);
    }
    function cursor(c, w, hh) {
      const x = 46 + (st.rpm / MAXRPM) * (w - 50);
      c.strokeStyle = cssv('--ink'); c.lineWidth = 2; c.beginPath(); c.moveTo(x, 20); c.lineTo(x, hh - 26); c.stroke();
    }

    let lastKey = '';
    function explain(on, off) {
      const key = [st.fw, on.ok, on.id < -0.5, off.ok, st.rpm > 2900].join();
      if (key === lastKey) return; lastKey = key;
      sh.why(
        '<b>역기전력</b>은 회전하는 영구자석의 자기장이 코일에 만드는 전압으로, <b>회전 속도 × 자속</b>에 비례해요. 그래서 빨리 돌수록 커지고, 배터리 전압 한계에 가까워지면 전류가 흐르기 어려워져 속도가 제한돼요. ' +
        (st.fw ? '<br><b>약계자 제어</b>는 고정자에 <b>d축 전류</b>를 흘려 영구자석 자속을 상쇄함으로써 <b>유효 자속</b>(실제로 작용하는 자속)을 줄여요. 영구자석의 N·S극이 바뀌는 것이 아니라, 자기장 에너지가 서로 상쇄되는 것이에요. 그 결과 같은 속도에서도 역기전력이 줄어요.'
          : '<br>오른쪽 스위치로 <b>약계자 제어</b>를 켜서 같은 속도에서 역기전력이 어떻게 달라지는지 비교해 보세요.') +
        '<br><b>주의</b>: 약계자 제어가 언제나 속도나 회전력을 높이는 것은 아니에요. 낮은 속도에서는 필요가 없고, 높은 속도에서는 속도 범위를 넓혀 주지만 낼 수 있는 최대 회전력은 속도가 높아질수록 줄어요. 전류의 일부(d축)를 자속 줄이는 데 쓰고, 남은 전압 여유 안에서만 회전력을 만드는 q축 전류를 흘릴 수 있기 때문이에요. 실제 운전 범위는 전압·전류·모터 특성에 따라 달라요.');
    }

    let drawnKey = '';
    SIM.loop((dt) => {
      st.ang = (st.ang + st.rpm * 0.06 * dt) % 360;
      const key = st.rpm + '|' + st.fw;
      if (key !== drawnKey) { drawnKey = key; draw(); } else spin();
    });

    const ro = SIM.readout([['rpm', '회전 속도'], ['V', '전압 한계'], ['E', '역기전력'], ['pct', '전압 한계 도달률'], ['fw', '약계자 제어'], ['id', 'd축 전류'], ['psi', '유효 자속(영구자석 대비)'], ['T', '낼 수 있는 최대 회전력'], ['Toff', '(약계자 OFF일 때)'], ['stt', '상태']]);
    const cmp = h('div', { class: 'note', 'aria-live': 'polite' });
    const sl = SIM.slider('회전 속도', 0, MAXRPM, 100, st.rpm, (v) => { st.rpm = v; }, (v) => v + ' rpm');
    const sw = h('button', { class: 'badge', type: 'button', style: 'min-height:44px;padding:8px 16px;cursor:pointer;font:inherit;font-size:.95rem', 'aria-pressed': 'false', onclick: () => { st.fw = !st.fw; sw.setAttribute('aria-pressed', String(st.fw)); sw.textContent = st.fw ? '약계자 제어: 켜짐 (끄려면 누르세요)' : '약계자 제어: 꺼짐 (켜려면 누르세요)'; } }, '약계자 제어: 꺼짐 (켜려면 누르세요)');
    const pred = SIM.predict({
      question: '회전 속도를 높이면 역기전력은 어떻게 될까요?',
      options: [['up', '커진다'], ['down', '작아진다'], ['same', '변하지 않는다']]
    });
    const msg = h('div', { class: 'note', 'aria-live': 'polite' });
    const check = h('button', { class: 'btn alt', type: 'button', onclick: () => {
      if (!st.seenHigh) { msg.textContent = '먼저 회전 속도를 4000 rpm 이상으로 올려 보세요.'; return; }
      msg.textContent = '';
      pred.compare('up', '역기전력은 (회전 속도 × 유효 자속)에 비례해서 빨리 돌수록 커져요.');
    } }, '예측 확인하기');
    const ctrl = h('div', { class: 'card' },
      h('h3', null, '🧪 직접 해 보기'),
      h('p', null, SIM.term('역기전력'), '은 전동기가 회전할 때 전류를 방해하는 방향으로 생기는 전압이에요. ', SIM.term('약계자 제어'), '는 고속에서 유효 자속을 줄여 이 전압을 낮추는 방법이에요.'),
      pred, h('div', { class: 'ctrl' }, sw, check), msg, sl, ro, cmp,
      h('div', { class: 'note warn' }, '교육용 단순 모델: 표면부착형 PMSM, d·q축 인덕턴스 같음, 저항·철손 무시, 극쌍 4개, 영구자석 자속 0.12 Wb, 인덕턴스 0.4 mH, 전류 한도 250 A, 배터리 400 V(상전압 한계 = 400/√3 ≈ 231 V). 값들은 모두 예시이며 실제 PMSM의 복잡한 제어(MTPA, 전압 타원 최적화, 열 한계 등)를 모두 구현한 것은 아니에요. 약계자 ON은 “한도 안에서 최대 회전력을 내는 d축 전류를 자동 선택”하는 단순화된 제어예요.'));

    const sh = SIM.shell({
      id: 's6', title: '6단계 · 역기전력과 고속 회전 제어 알아보기',
      intro: h('p', null, '전동기가 빨라지면 코일에는 전류를 공급하는 전압을 방해하는 전압이 생겨요. 이것이 ', SIM.term('역기전력'), '이에요. 이 단계는 조금 어려우니 그림과 숫자를 비교하며 천천히 살펴보세요.'),
      goal: '회전 속도가 높아지면 역기전력이 커지고, 약계자 제어가 유효 자속을 줄여 이를 낮춘다는 것을 이해해요.',
      summary: ['빨리 돌수록 역기전력이 커져서, 배터리 전압 한계에 가까워지면 전류가 흐르기 어려워져요.', '약계자 제어는 d축 전류로 영구자석 자속을 상쇄해 유효 자속을 줄여요. 영구자석의 극이 바뀌는 것이 아니에요.', '약계자 제어는 고속 운전 범위를 넓히지만, 속도가 높아질수록 낼 수 있는 최대 회전력은 줄어들고 한계는 여전히 있어요.'],
      quiz: [
        { q: '약계자 제어에서 영구자석에는 어떤 일이 일어날까요?', choices: ['N극과 S극이 서로 바뀐다', '극은 그대로이고 유효 자속이 줄어든다', '자석이 더 강해진다'], answer: 1,
          explain: '고정자의 d축 전류가 만드는 자기장이 영구자석 자기장을 상쇄해 유효 자속이 줄어요. 자석 자체의 극은 그대로예요.', hints: ['영구자석의 극은 뒤집히지 않아요. 전류가 만드는 자기장이 상쇄시키는 거예요.', '', '약계자는 “계자(자기장)를 약하게” 한다는 뜻이에요.'] },
        { q: '약계자 제어에 대한 설명으로 옳은 것은?', choices: ['언제나 회전력을 크게 한다', '고속 운전 범위를 넓히지만 낼 수 있는 최대 회전력은 줄 수 있다', '역기전력을 늘린다'], answer: 1,
          explain: '고속에서 역기전력을 낮춰 속도 범위를 넓히지만, 전압·전류 한계 때문에 낼 수 있는 최대 회전력은 속도가 높아질수록 줄어요.', hints: ['그래프에서 ON의 최대 회전력도 속도가 높아질수록 줄어요.', '', '약계자 제어는 역기전력을 낮추는 것이 목적이에요.'] }
      ]
    });
    sh.viz.replaceWith(h('div', null, svg, h('div', { style: 'height:8px' }), cvE, h('div', { style: 'height:8px' }), cvT));
    sh.ctrl.replaceWith(ctrl);
    draw();
    return sh.root;
  }
})();
