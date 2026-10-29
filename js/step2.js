(function () {
  const { h, s } = SIM;
  const W = 640, H = 330, CX = 320, CY = 150, X0 = 220, X1 = 420, HH = 44, TURNS = 8;

  SIM.steps.push({ id: 's2', name: '전류로 전자석', render });

  function render() {
    // dir=+1: 앞쪽 도선 전류가 아래로 → 오른손 법칙으로 N극이 오른쪽
    const st = { on: true, dir: 1, I: 3, shown: 3, flipped: false };
    const svg = s('svg', { class: 'viz', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '전류가 흐르는 코일과 자기장' });
    const gField = s('g'), gCoil = s('g'), gOver = s('g'), gCompass = s('g');
    svg.append(gField, gCoil, gOver, gCompass);
    const inCoil = (x, y) => x > X0 && x < X1 && Math.abs(y - CY) < HH;

    function traceLines(nPole, sPole, n) {
      const out = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        let x = nPole.x + 10 * Math.cos(a), y = CY + 10 * Math.sin(a);
        if (inCoil(x, y)) continue;
        const pts = [[x, y]];
        for (let k = 0; k < 900; k++) {
          const f = field(x, y, st.shown * st.dir);
          const m = Math.hypot(f[0], f[1]) || 1;
          x += (f[0] / m) * 4; y += (f[1] / m) * 4;
          pts.push([x, y]);
          if (x < 4 || x > W - 4 || y < 4 || y > H - 4 || inCoil(x, y)) break;
          if (Math.hypot(x - sPole.x, y - CY) < 8) break;
        }
        out.push(pts);
      }
      return out;
    }

    // 코일 ≒ 양 끝에 ±Q 자극이 있는 막대자석 (교육용 등가 모델), Q ∝ 전류
    function field(x, y, cur) {
      const Q = Math.abs(cur) * 2000, sgn = Math.sign(cur) || 1;
      const pN = { x: sgn > 0 ? X1 + 4 : X0 - 4 }, pS = { x: sgn > 0 ? X0 - 4 : X1 + 4 };
      let bx = 0, by = 0;
      for (const [p, q] of [[pN, Q], [pS, -Q]]) {
        const dx = x - p.x, dy = y - CY, r2 = dx * dx + dy * dy + 1, r = Math.sqrt(r2);
        bx += (q * dx) / (r2 * r); by += (q * dy) / (r2 * r);
      }
      return [bx, by];
    }

    function draw() {
      const sgnDir = st.dir;
      const cur = st.shown * sgnDir; // 부호 있는 (표시용) 전류
      gField.replaceChildren(); gCoil.replaceChildren(); gOver.replaceChildren(); gCompass.replaceChildren();
      const strength = Math.abs(st.shown);
      const nRight = cur >= 0;
      const nPole = { x: nRight ? X1 + 4 : X0 - 4 }, sPole = { x: nRight ? X0 - 4 : X1 + 4 };

      if (strength > 0.03) {
        const op = Math.min(1, strength / 3) * 0.9;
        const lines = traceLines(nPole, sPole, 8 + Math.round(strength * 2));
        for (const pts of lines) {
          gField.append(s('path', { d: 'M' + pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L'), fill: 'none', stroke: 'var(--fld)', 'stroke-width': 1.5, opacity: op }));
          let acc = 0;
          for (let i = 1; i < pts.length - 2; i++) {
            acc += 4;
            if (acc >= 80) {
              acc = 0;
              const [x, y] = pts[i], [x2, y2] = pts[i + 1], u = Math.hypot(x2 - x, y2 - y) || 1;
              gField.append(SIM.arrow(x - ((x2 - x) / u) * 4, y - ((y2 - y) / u) * 4, x + ((x2 - x) / u) * 4, y + ((y2 - y) / u) * 4, 'field', { head: 7, width: 1.5, opacity: op }));
            }
          }
        }
        // 코일 내부 자기장 : S극 → N극
        const dirx = nRight ? 1 : -1;
        for (const dy of [-18, 0, 18])
          gField.append(SIM.arrow(CX - dirx * 70, CY + dy, CX + dirx * 70, CY + dy, 'field', { head: 9, width: 2 + strength * 0.3, opacity: op }));
      }

      // 코일
      const on = st.on;
      for (let i = 0; i < TURNS; i++) {
        const x = X0 + 12 + i * ((X1 - X0 - 24) / (TURNS - 1)) - 6;
        gCoil.append(s('path', { d: `M${x},${CY - HH}A12,${HH} 0 0 0 ${x},${CY + HH}`, fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2, 'stroke-dasharray': '4 4', opacity: 0.5 }));
        gCoil.append(s('path', { d: `M${x},${CY - HH}A12,${HH} 0 0 1 ${x},${CY + HH}`, fill: 'none', stroke: on ? 'var(--cur)' : 'var(--muted)', 'stroke-width': 4.5, opacity: on ? 1 : 0.6 }));
        if (on) {
          const ax = x + 12;
          const dn = st.dir > 0;
          gCoil.append(SIM.arrow(ax, dn ? CY - 14 : CY + 14, ax, dn ? CY + 14 : CY - 14, 'current', { head: 10, width: 4.5 }));
        }
      }
      gCoil.append(s('text', { x: CX, y: CY + HH + 28, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 13 },
        on ? '주황 굵은 화살표 = 전류 방향 (앞쪽 도선)' : '전류 OFF (스위치가 꺼져 있어요)'));
      // 극 표시
      if (strength > 0.03) {
        const op = Math.min(1, strength / 1.5);
        gOver.append(s('g', { opacity: op }, SIM.poleLabel(nPole.x + (nRight ? 22 : -22), CY, 1, 15), SIM.poleLabel(sPole.x + (nRight ? -22 : 22), CY, -1, 15)));
      }

      // 나침반
      const cx = 540, cy = 250;
      let bx = 0, by = -0.05; // 지구 자기장(위쪽, 약함)
      const f = field(cx, cy, st.shown * sgnDir);
      bx += f[0]; by += f[1];
      const ang = Math.atan2(by, bx);
      gCompass.append(s('circle', { cx, cy, r: 38, fill: 'var(--bg)', stroke: 'var(--ink)', 'stroke-width': 2 }));
      const ux = Math.cos(ang), uy = Math.sin(ang);
      gCompass.append(s('path', { d: `M${cx + ux * 32},${cy + uy * 32}L${cx - uy * 7},${cy + ux * 7}L${cx + uy * 7},${cy - ux * 7}Z`, fill: 'var(--n)' }));
      gCompass.append(s('path', { d: `M${cx - ux * 32},${cy - uy * 32}L${cx - uy * 7},${cy + ux * 7}L${cx + uy * 7},${cy - ux * 7}Z`, fill: 'var(--s)' }));
      gCompass.append(s('text', { x: cx, y: cy + 58, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 12 }, '나침반 (빨강=N극 쪽 바늘)'));

      ro.update({
        cur: on ? SIM.fmt(st.I, 1) + ' A' : '0 A',
        dir: on ? (st.dir > 0 ? '앞쪽 ↓ / 뒤쪽 ↑' : '앞쪽 ↑ / 뒤쪽 ↓') : '-',
        pol: strength > 0.05 ? (nRight ? '오른쪽 N · 왼쪽 S' : '왼쪽 N · 오른쪽 S') : '자성 없음',
        B: SIM.fmt((strength / 5) * 100, 0) + ' %'
      });
    }

    SIM.loop((dt) => {
      const target = st.on ? st.I : 0;
      if (Math.abs(st.shown - target) > 0.005) {
        st.shown += (target - st.shown) * Math.min(1, dt * 8);
        draw();
      }
    });

    function explain() {
      sh.why(!st.on
        ? '전류가 흐르지 않으면 코일 주변에 자기장을 만드는 원인이 없어져요. 위 모델은 <b>잔류 자기를 무시한 이상적인 코일</b>이라 자기장이 사라지고, 나침반은 지구 자기장(북쪽)을 가리켜요. (실제 철심 전자석은 전류를 꺼도 약한 자성이 남을 수 있어요.)'
        : '<b>오른손 법칙</b>: 오른손 네 손가락을 전류가 도는 방향으로 감아쥐면 엄지가 가리키는 쪽이 자기장 방향, 즉 <b>N극</b>이에요. 전류 방향이 반대가 되면 엄지가 반대를 가리켜서 N극과 S극이 바뀌어요. 전류가 세지면 자기장도 세져요.');
    }
    const update = () => { explain(); draw(); };

    const ro = SIM.readout([['cur', '전류 세기'], ['dir', '전류 방향'], ['pol', '전자석 극성'], ['B', '자기장 세기(상대)']]);
    const sw = h('button', { class: 'btn', type: 'button', 'aria-pressed': 'true', onclick: () => { st.on = !st.on; sw.textContent = st.on ? '⏻ 전류 끄기' : '⏻ 전류 켜기'; sw.setAttribute('aria-pressed', String(st.on)); update(); } }, '⏻ 전류 끄기');
    const flip = h('button', { class: 'btn', type: 'button', onclick: () => { st.dir *= -1; st.flipped = true; update(); } }, '🔁 전류 방향 바꾸기');
    const sl = SIM.slider('전류 세기', 0.5, 5, 0.5, st.I, (v) => { st.I = v; if (st.on) st.shown = v; update(); }, (v) => v.toFixed(1) + ' A');
    const pred = SIM.predict({
      question: '전류 방향을 반대로 바꾸면 전자석의 N극과 S극은 어떻게 될까요?',
      options: [['same', '그대로다'], ['swap', 'N극과 S극이 서로 바뀐다'], ['gone', '자석이 사라진다']]
    });
    const msg = h('div', { class: 'note', 'aria-live': 'polite' });
    const check = h('button', { class: 'btn alt', type: 'button', onclick: () => {
      if (!st.flipped) { msg.textContent = '먼저 “전류 방향 바꾸기”를 눌러 보세요.'; return; }
      msg.textContent = '';
      pred.compare('swap', '전류 방향이 바뀌면 오른손 법칙에 따라 N극과 S극이 서로 바뀌어요.');
    } }, '예측 확인하기');

    const ctrl = h('div', { class: 'card' },
      h('h3', null, '🧪 직접 해 보기'),
      h('p', null, SIM.term('전자석'), '은 전류가 흐를 때 자기장을 만들어 자석처럼 작용하는 장치예요. 전선을 코일처럼 감으면 자기장이 모여요.'),
      pred, h('div', { class: 'ctrl' }, sw, flip, check), msg, sl, ro,
      h('div', { class: 'legend' },
        h('span', null, h('i', { style: 'border-top:5px solid var(--cur)' }), '전류(굵은 삼각 화살표)'),
        h('span', null, h('i', { style: 'border-top:2px solid var(--fld)' }), '자기장(열린 화살표)')),
      h('div', { class: 'note warn' }, '이 실험은 잔류 자기를 무시한 이상적인 코일이에요. 자기장 선은 “코일 양 끝에 자극이 있는 막대자석”으로 단순화해 그렸고, 세기는 전류에 비례하는 상대값이에요.'));

    const sh = SIM.shell({
      id: 's2', title: '2단계 · 전류로 전자석 만들기',
      intro: h('p', null, '전선에 전류가 흐르면 주변에 ', SIM.term('자기장'), '이 만들어져요. 전선을 코일처럼 감으면 자기장이 모여 ', SIM.term('전자석'), '처럼 작용해요.'),
      goal: '전류가 자기장을 만들고, 전류 방향과 세기가 전자석의 극성과 세기를 정한다는 것을 확인해요.',
      summary: ['전류가 흐르는 코일 주변에는 자기장이 생겨 전자석이 돼요.', '전류 방향이 바뀌면 N극과 S극이 서로 바뀌어요.', '전류가 세질수록 자기장이 세지고, 전류를 끄면 (이상적으로) 자기장도 사라져요.'],
      quiz: [
        { q: '코일에 흐르는 전류의 방향을 반대로 하면?', choices: ['전자석의 N극과 S극이 바뀐다', '전자석이 더 세진다', '아무 변화가 없다'], answer: 0,
          explain: '오른손 법칙에서 전류가 반대면 엄지(자기장) 방향도 반대가 돼요.', hints: ['', '세기는 전류의 크기가 정해요. 방향만 바꾸면 세기는 그대로예요.', '자기장의 방향은 전류의 방향에 따라 정해져요.'] },
        { q: '이상적인 코일에서 전류를 끄면 자기장은?', choices: ['더 커진다', '사라진다', '반대로 바뀐다'], answer: 1,
          explain: '전자석의 자기장은 전류가 만든 것이므로 전류가 없으면 사라져요.', hints: ['전류가 없으면 자기장을 만들 원인이 없어요.', '', '방향이 바뀌려면 반대 방향 전류가 필요해요.'] }
      ]
    });
    sh.viz.replaceWith(h('div', null, svg));
    sh.ctrl.replaceWith(ctrl);
    explain(); draw();
    return sh.root;
  }
})();
