(function () {
  const { h, s } = SIM;
  const W = 640, H = 300, CY = 165, LEN = 120, HT = 44, POLE = 52;
  const PX_CM = 10; // 화면 10px = 1cm (교육용 눈금)

  SIM.steps.push({ id: 's1', name: '자석의 성질', render });

  function render() {
    const st = { fa: 1, fb: 1, xb: 440 }; // fa/fb: +1이면 N극이 오른쪽
    const XA = 190;

    const svg = s('svg', { class: 'viz', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '막대자석 두 개의 힘과 자기력선' });
    const gLines = s('g'), gMag = s('g'), gForce = s('g');
    svg.append(gLines, gMag, gForce);

    const poles = () => [
      { x: XA + st.fa * POLE, m: 'A', pol: st.fa },
      { x: XA - st.fa * POLE, m: 'A', pol: -st.fa },
      { x: st.xb + st.fb * POLE, m: 'B', pol: st.fb },
      { x: st.xb - st.fb * POLE, m: 'B', pol: -st.fb }
    ].map((p) => ({ ...p, q: p.pol > 0 ? 1 : -1, y: CY }));

    function fieldAt(x, y, ps) {
      let bx = 0, by = 0;
      for (const p of ps) {
        const dx = x - p.x, dy = y - p.y, r2 = dx * dx + dy * dy + 1, r = Math.sqrt(r2);
        bx += (p.q * dx) / (r2 * r); by += (p.q * dy) / (r2 * r);
      }
      return [bx, by];
    }
    const inMagnet = (x, y) =>
      (Math.abs(x - XA) < LEN / 2 && Math.abs(y - CY) < HT / 2) || (Math.abs(x - st.xb) < LEN / 2 && Math.abs(y - CY) < HT / 2);

    function traceLines(ps) {
      const out = [];
      for (const p of ps.filter((q) => q.q > 0)) {
        const cxm = p.m === 'A' ? XA : st.xb, dirN = p.pol > 0 ? 1 : -1, seeds = [];
        for (let k = -2; k <= 2; k++) seeds.push([cxm + dirN * (LEN / 2 + 2), CY + k * 9]); // N극 끝면
        for (let k = 1; k <= 3; k++) { const x0 = cxm + dirN * (k * 15); seeds.push([x0, CY - HT / 2 - 2], [x0, CY + HT / 2 + 2]); } // N쪽 위·아래 옆면
        for (const [sx, sy] of seeds) {
          let x = sx, y = sy;
          const pts = [[x, y]];
          for (let k = 0; k < 700; k++) {
            const [bx, by] = fieldAt(x, y, ps), m = Math.hypot(bx, by) || 1;
            x += (bx / m) * 4; y += (by / m) * 4;
            pts.push([x, y]);
            if (x < 4 || x > W - 4 || y < 4 || y > H - 4 || inMagnet(x, y)) break;
            if (ps.some((q) => q.q < 0 && Math.hypot(x - q.x, y - q.y) < 8)) break;
          }
          if (pts.length > 6) out.push(pts);
        }
      }
      return out;
    }

    function draw() {
      const ps = poles();
      gLines.replaceChildren(); gMag.replaceChildren(); gForce.replaceChildren();
      for (const pts of traceLines(ps)) {
        gLines.append(s('path', { d: 'M' + pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L'), fill: 'none', stroke: 'var(--fld)', 'stroke-width': 1.6, opacity: 0.8 }));
        let acc = 0;
        for (let i = 1; i < pts.length; i++) {
          acc += 4;
          if (acc >= 70 && i < pts.length - 2) {
            acc = 0;
            const [x, y] = pts[i], [x2, y2] = pts[i + 1], u = Math.hypot(x2 - x, y2 - y) || 1, ux = (x2 - x) / u, uy = (y2 - y) / u;
            gLines.append(SIM.arrow(x - ux * 4, y - uy * 4, x + ux * 4, y + uy * 4, 'field', { head: 7, width: 1.6 }));
          }
        }
      }
      // 자석 내부: S→N (자석 안에서는 S극에서 N극 방향)
      for (const [cx, f] of [[XA, st.fa], [st.xb, st.fb]]) {
        gMag.append(s('rect', { x: cx - LEN / 2, y: CY - HT / 2, width: LEN, height: HT, rx: 6, fill: 'var(--card)', stroke: 'var(--ink)', 'stroke-width': 2 }));
        gMag.append(s('rect', { x: f > 0 ? cx : cx - LEN / 2, y: CY - HT / 2, width: LEN / 2, height: HT, rx: 6, fill: 'var(--n)', opacity: 0.9 }));
        gMag.append(s('rect', { x: f > 0 ? cx - LEN / 2 : cx, y: CY - HT / 2, width: LEN / 2, height: HT, rx: 6, fill: 'var(--s)', opacity: 0.9 }));
        gMag.append(SIM.poleLabel(cx + f * POLE, CY, 1, 14), SIM.poleLabel(cx - f * POLE, CY, -1, 14));
        gMag.append(SIM.arrow(cx - f * 22, CY + 0, cx + f * 22, CY, 'field', { color: '#fff', head: 8, width: 2 }));
      }
      gMag.append(s('text', { x: XA, y: CY - 36, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 13 }, '자석 A (고정)'));
      const tb = s('text', { x: st.xb, y: CY - 36, 'text-anchor': 'middle', fill: 'var(--accent)', 'font-size': 13, 'font-weight': 700 }, '자석 B (끌어서 이동 ↔)');
      gMag.append(tb);

      // 자석 B가 받는 힘 (자극 모델: 같은 부호 반발, 다른 부호 인력)
      let Fb = 0;
      for (const pb of ps.filter((p) => p.m === 'B'))
        for (const pa of ps.filter((p) => p.m === 'A')) {
          const dx = (pb.x - pa.x) / PX_CM, r = Math.abs(dx) || 0.1;
          Fb += (200 * pa.q * pb.q * Math.sign(dx)) / (r * r);
        }
      const L = Math.min(110, 22 * Math.sqrt(Math.abs(Fb)));
      const dirB = Math.sign(Fb);
      if (L > 3) {
        const fy = CY + 62;
        gForce.append(SIM.arrow(st.xb, fy, st.xb + dirB * L, fy, 'force', { label: 'B가 받는 힘', ly: 20 }));
        gForce.append(SIM.arrow(XA, fy, XA - dirB * L, fy, 'force', { label: 'A가 받는 힘', ly: 20 }));
      }
      const facingA = st.fa > 0 ? 'N' : 'S', facingB = st.fb > 0 ? 'S' : 'N';
      const same = facingA === facingB;
      gForce.append(s('text', { x: W / 2, y: H - 14, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: same ? 'var(--bad)' : 'var(--ok)' },
        `마주 보는 극: ${facingA} — ${facingB}  →  ${same ? '서로 밀어내요 (척력)' : '서로 끌어당겨요 (인력)'}`));

      ro.update({
        facing: `${facingA} — ${facingB}`,
        kind: same ? '척력(밀어냄)' : '인력(끌어당김)',
        dist: SIM.fmt((st.xb - XA) / PX_CM, 1) + ' cm',
        force: SIM.fmt(Math.abs(Fb), 2)
      });
      st.same = same; st.Fb = Fb;
      why();
    }

    function why() {
      sh.why(st.same
        ? '<b>같은 극</b>끼리 마주 보면 두 자기장이 서로 부딪혀 그 사이에 자기장 에너지가 높아져요. 자기력은 에너지를 낮추려고 작용하기 때문에 자석은 <b>서로 멀어지려는 힘(척력)</b>을 받아요. 위 그림에서 자기력선도 서로 밀어내듯 휘어져 있어요.'
        : '<b>다른 극</b>끼리 마주 보면 자기력선이 한 자석의 N극에서 나와 다른 자석의 S극으로 <b>이어져요</b>. 자기장이 이어지며 에너지가 낮아지는 쪽, 즉 <b>서로 가까워지는 힘(인력)</b>이 작용해요.');
    }

    const ro = SIM.readout([['facing', '마주 보는 극'], ['kind', '힘의 종류'], ['dist', '두 자석 중심 거리'], ['force', '힘의 크기(상대값)']]);

    // 드래그
    let drag = false;
    const toX = (e) => { const r = svg.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * W; };
    const setX = (x) => { st.xb = Math.max(XA + LEN + 10, Math.min(W - LEN / 2 - 8, x)); sl.set(((st.xb - XA) / PX_CM).toFixed(0)); draw(); };
    svg.addEventListener('pointerdown', (e) => { const x = toX(e); if (Math.abs(x - st.xb) < LEN / 2 + 10) { drag = true; svg.setPointerCapture(e.pointerId); } });
    svg.addEventListener('pointermove', (e) => { if (drag) setX(toX(e)); });
    svg.addEventListener('pointerup', () => { drag = false; });
    svg.addEventListener('pointercancel', () => { drag = false; });

    const sl = SIM.slider('B의 위치', 13, 38, 1, (st.xb - XA) / PX_CM, (v) => setX(XA + v * PX_CM), (v) => v + ' cm');
    const pred = SIM.predict({
      question: '두 자석의 같은 극(예: N과 N)이 마주 보면 어떻게 될까요?',
      options: [['repel', '서로 밀어낸다'], ['attract', '서로 끌어당긴다'], ['none', '아무 힘도 없다']]
    });
    const msg = h('div', { class: 'note', 'aria-live': 'polite' });
    const check = h('button', { class: 'btn', type: 'button', onclick: () => {
      if (!st.same) { msg.textContent = '먼저 두 자석의 같은 극이 마주 보도록 뒤집어 보세요.'; return; }
      msg.textContent = '';
      pred.compare('repel', '같은 극끼리 마주 보면 척력(밀어내는 힘)이 작용해요.');
    } }, '예측 확인하기');

    const ctrl = h('div', { class: 'card' },
      h('h3', null, '🧪 직접 해 보기'),
      h('p', null, '자석 B를 끌어서 움직이고, 버튼으로 자석을 뒤집어 보세요.'),
      pred,
      h('div', { class: 'ctrl' },
        h('button', { class: 'btn', type: 'button', onclick: () => { st.fa *= -1; draw(); } }, '🔄 A 뒤집기'),
        h('button', { class: 'btn', type: 'button', onclick: () => { st.fb *= -1; draw(); } }, '🔄 B 뒤집기'),
        check),
      msg, sl, ro,
      h('div', { class: 'legend' },
        h('span', null, h('i', { style: 'border-top:2px solid var(--fld)' }), '자기력선(화살표=방향)'),
        h('span', null, h('i', { style: 'border-top:4px solid var(--ink)' }), '힘 (굵은 화살표)')),
      h('div', { class: 'note warn' }, '이 힘은 “자극(N·S)이 점처럼 있다”고 단순화한 교육용 모델로 계산한 상대값이에요. 실제 자석의 힘은 모양·재질에 따라 달라요.'));

    const sh = SIM.shell({
      id: 's1', title: '1단계 · 자석의 성질 알아보기',
      intro: h('p', null, '자석에는 N극과 S극이 있어요. ', SIM.term('자기장'), '은 자석 주변에서 힘이 작용하는 공간이고, ', SIM.term('자기력선'), '은 그 방향을 나타내는 선이에요. 같은 극끼리는 서로 밀어내고, 다른 극끼리는 서로 끌어당겨요.'),
      goal: '자석의 같은 극은 밀어내고 다른 극은 끌어당기며, 자기력선이 N극에서 나와 S극으로 들어간다는 것을 확인해요.',
      summary: ['자석에는 N극과 S극이 있고, 자기력선은 자석 바깥에서 N극 → S극으로 향해요.', '같은 극끼리는 밀어내고(척력) 다른 극끼리는 끌어당겨요(인력).', '자기력선은 서로 겹치거나 끊어지지 않아요.'],
      quiz: [
        { q: 'N극과 S극이 마주 보고 있을 때 두 자석 사이에는 어떤 힘이 작용할까요?', choices: ['밀어내는 힘', '끌어당기는 힘', '아무 힘도 없다'], answer: 1,
          explain: '다른 극끼리는 자기력선이 이어지며 서로 당겨요.', hints: ['밀어내는 건 같은 극끼리일 때예요.', '', '자석은 가까이 두면 반드시 힘을 주고받아요.'] },
        { q: '자석 바깥에서 자기력선의 방향은?', choices: ['S극에서 N극', 'N극에서 S극', '방향이 없다'], answer: 1,
          explain: '바깥에서는 N → S, 자석 내부에서는 S → N으로 이어져 닫힌 곡선이 돼요.', hints: ['그건 자석 내부 방향이에요.', '', '자기력선은 방향을 나타내는 선이에요.'] }
      ]
    });
    sh.viz.replaceWith(h('div', null, svg));
    sh.ctrl.replaceWith(ctrl);
    draw();
    return sh.root;
  }
})();
