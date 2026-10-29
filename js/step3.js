(function () {
  const { h, s, rad } = SIM;
  const W = 640, H = 380, CX = 320, CY = 190, R_ROT = 62, R_IN = 92, R_OUT = 160, R_POLE = 44;
  const K = 28; // 토크 표시용 상대 계수 (교육용)

  SIM.steps.push({ id: 's3', name: '자석 사이의 힘과 회전력', render });

  const P = (r, deg) => [CX + r * Math.cos(rad(deg)), CY - r * Math.sin(rad(deg))]; // 수학 각도(반시계 +)

  function render() {
    const st = { pol: 1, I: 3, th: 90, th0: 90, w: 0, free: false, moved: false };
    const svg = s('svg', { class: 'viz', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '고정자 전자석과 회전자 영구자석 사이의 힘과 회전력' });
    const gBase = s('g'), gRot = s('g'), gArr = s('g');
    svg.append(gBase, gRot, gArr);

    // 정적 부분: 고정자(링 + 슬롯)
    gBase.append(s('circle', { cx: CX, cy: CY, r: R_OUT, fill: 'var(--bg)', stroke: 'var(--ink)', 'stroke-width': 2 }));
    gBase.append(s('circle', { cx: CX, cy: CY, r: R_IN, fill: 'var(--card)', stroke: 'var(--ink)', 'stroke-width': 2 }));
    for (let i = 0; i < 12; i++) {
      const [x1, y1] = P(R_IN + 4, i * 30 + 15), [x2, y2] = P(R_IN + 34, i * 30 + 15);
      gBase.append(s('line', { x1, y1, x2, y2, stroke: 'var(--muted)', 'stroke-width': 10, opacity: 0.35, 'stroke-linecap': 'round' }));
    }
    gBase.append(s('text', { x: CX, y: 22, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 13 }, '고정자 (바깥, 움직이지 않음)'));
    gBase.append(s('text', { x: CX, y: CY + R_ROT + 18, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 12 }, '회전자'));

    const stator = () => ({ nAng: st.pol > 0 ? 0 : 180 }); // 고정자 N극 패드 위치
    const phi = () => (st.pol > 0 ? 180 : 0); // 회전자 쪽 자기장 방향(고정자 N→S)

    function draw() {
      gRot.replaceChildren(); gArr.replaceChildren();
      const sa = stator().nAng;
      // 고정자 전자석 패드
      for (const [ang, pol] of [[sa, 1], [sa + 180, -1]]) {
        const [x, y] = P(R_IN + 2, ang);
        gRot.append(s('circle', { cx: x, cy: y, r: 22, fill: pol > 0 ? 'var(--n)' : 'var(--s)', opacity: st.I > 0 ? 0.25 + st.I / 8 : 0.12 }));
        const [lx, ly] = P(R_IN + 24, ang);
        gRot.append(SIM.poleLabel(lx, ly, pol, 14));
      }
      gRot.append(s('text', { x: CX, y: H - 10, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-size': 12 }, '고정자 전자석(코일 전류로 만들어진 N·S극)과 회전자 영구자석'));

      // 회전자
      const rg = s('g', { transform: `rotate(${-st.th} ${CX} ${CY})` });
      rg.append(s('circle', { cx: CX, cy: CY, r: R_ROT, fill: 'var(--card)', stroke: 'var(--ink)', 'stroke-width': 2 }));
      rg.append(s('path', { d: `M${CX},${CY - 30}H${CX + R_POLE + 10}V${CY + 30}H${CX}Z`, fill: 'var(--n)', opacity: 0.92 }));
      rg.append(s('path', { d: `M${CX},${CY - 30}H${CX - R_POLE - 10}V${CY + 30}H${CX}Z`, fill: 'var(--s)', opacity: 0.92 }));
      gRot.append(rg);
      for (const [d, pol] of [[st.th, 1], [st.th + 180, -1]]) {
        const [x, y] = P(R_POLE - 8, d);
        gRot.append(SIM.poleLabel(x, y, pol, 13));
      }
      gRot.append(s('circle', { cx: CX, cy: CY, r: 5, fill: 'var(--ink)' }));

      // 힘 (회전자 극이 받는 힘): N극은 자기장 방향, S극은 반대 방향
      const f = st.on === false ? 0 : st.I;
      const Fl = f * 15;
      const u = [Math.cos(rad(phi())), -Math.sin(rad(phi()))]; // 화면 좌표 단위벡터
      let tau = 0;
      if (Fl > 1) {
        for (const [d, sign, nm] of [[st.th, 1, 'N극'], [st.th + 180, -1, 'S극']]) {
          const [px, py] = P(R_POLE + 16, d);
          const fx = u[0] * sign * Fl, fy = u[1] * sign * Fl;
          // 인력/척력 라벨: 가까운 고정자 극과의 관계
          gArr.append(SIM.arrow(px, py, px + fx, py + fy, 'force', { label: '', head: 13 }));
        }
        // 팔 길이(회전축에서 힘의 작용선까지 수직 거리) 표시
        const [nx, ny] = P(R_POLE + 16, st.th);
        const dot = (nx - CX) * u[0] + (ny - CY) * u[1];
        const fx0 = nx - CX - dot * u[0], fy0 = ny - CY - dot * u[1];
        if (Math.hypot(fx0, fy0) > 3) {
          gArr.append(s('line', { x1: CX, y1: CY, x2: CX + fx0, y2: CY + fy0, stroke: 'var(--ink)', 'stroke-dasharray': '4 4', 'stroke-width': 1.5 }));
          gArr.append(s('text', { x: CX + fx0 / 2 + 8, y: CY + fy0 / 2 + 4, fill: 'var(--ink)', 'font-size': 12, 'font-weight': 700 }, '팔'));
        }
      }
      tau = K * f * Math.sin(rad(phi() - st.th));
      st.tau = tau;
      const span = Math.min(100, Math.abs(tau) * 1.1);
      if (span > 6) {
        const sgn = Math.sign(tau); // 화면각 = -수학각
        gArr.append(SIM.curvedArrow(CX, CY, R_ROT + 15, -(st.th + 90 - sgn * span / 2), -(st.th + 90 + sgn * span / 2), 'torque', { width: 5 }));
      }

      const line = Math.abs(Math.sin(rad(phi() - st.th))) < 0.03;
      const stable = Math.cos(rad(phi() - st.th)) > 0; // 회전자 N극이 고정자 S극(자기장 방향)을 향함
      const aligned = line && stable;
      const kind = (() => {
        const dn = ((phi() - st.th) % 360 + 360) % 360; // N극에서 전자석 S극 방향 각 차이
        return Math.abs(dn) < 90 || Math.abs(dn - 360) < 90 ? '회전자 N극이 고정자 S극 쪽으로 끌려가요' : '회전자 N극이 고정자 N극에 밀려나요';
      })();
      ro.update({
        th: SIM.fmt(((st.th % 360) + 360) % 360, 0) + '°',
        tau: SIM.fmt(Math.abs(tau), 1) + (tau > 0.5 ? ' (↺ 반시계)' : tau < -0.5 ? ' (↻ 시계)' : ''),
        st: f <= 0 ? '전류 0 → 힘 없음' : aligned ? '정렬됨(안정) → 토크 0' : line ? '같은 극끼리 마주 봄(불안정) → 토크 0, 살짝만 밀려도 돌아 나와요' : kind
      });
      st.aligned = aligned; st.line = line;
      explain(aligned, f);
    }

    function explain(aligned, f) {
      sh.why(f <= 0
        ? '전류가 0이면 전자석이 만들어지지 않아서, 영구자석이 받는 힘도 없어요.'
        : aligned
          ? '두 자석의 극이 일직선으로 정렬되면 힘은 있지만 <b>회전축에서 힘의 작용선까지의 수직 거리(팔)가 0</b>이라서 회전력이 0이에요. <b>인력이나 척력이 있다고 해서 항상 회전하는 것은 아니에요.</b> 힘의 방향이 회전축과 어긋나 있어야 돌리는 효과(토크)가 생겨요.'
          : '회전자의 N극은 고정자 S극 쪽으로 <b>끌리고(인력)</b> 고정자 N극에서는 <b>밀려나요(척력)</b>. 두 힘이 같은 방향의 회전 효과를 만들어서 회전자가 돌아요. 힘의 방향이 회전축에서 멀수록(팔이 길수록) 회전력이 커져요. 토크는 약 <b>세기 × sin(각도 차이)</b>로 나타나요.');
    }

    // 놓았을 때 운동 (감쇠 진동)
    SIM.loop((dt) => {
      if (!st.free) return;
      const f = st.I;
      for (let k = 0; k < 4; k++) {
        const h2 = dt / 4;
        const a = 480 * f * Math.sin(rad(phi() - st.th)) - 3 * st.w; // 각가속도(°/s²) = 토크 − 감쇠
        st.w += a * h2; st.th += st.w * h2;
      }
      slTh.set(Math.round(((st.th % 360) + 360) % 360));
      draw();
    });

    const ro = SIM.readout([['th', '회전자 각도'], ['tau', '회전력(토크, 상대값)'], ['st', '상태']]);
    const slI = SIM.slider('전류 세기', 0, 5, 0.5, st.I, (v) => { st.I = v; draw(); }, (v) => v.toFixed(1) + ' A');
    const slTh = SIM.slider('회전자 각도', 0, 359, 1, st.th, (v) => { st.th = v; st.th0 = v; st.w = 0; st.free = false; btnFree.textContent = '▶ 놓아 보기'; draw(); }, (v) => v + '°');
    const btnPol = h('button', { class: 'btn', type: 'button', onclick: () => { st.pol *= -1; draw(); } }, '🔁 전자석 극성 바꾸기');
    const btnFree = h('button', { class: 'btn alt', type: 'button', onclick: () => {
      st.free = !st.free;
      if (st.free) { st.w = 0; st.th += 0.3; }
      btnFree.textContent = st.free ? '⏸ 붙잡기' : '▶ 놓아 보기';
    } }, '▶ 놓아 보기');
    const btnReset = h('button', { class: 'btn ghost', type: 'button', onclick: () => { st.free = false; st.th = st.th0; st.w = 0; btnFree.textContent = '▶ 놓아 보기'; slTh.set(st.th); draw(); } }, '↺ 처음 각도로');

    const pred = SIM.predict({
      question: '회전자의 N극이 전자석의 S극과 일직선으로 마주 보면(처음 극성에서는 각도 180°) 회전력은 어떻게 될까요?',
      options: [['max', '가장 크다'], ['zero', '0이 된다'], ['mid', '중간 크기다']]
    });
    const msg = h('div', { class: 'note', 'aria-live': 'polite' });
    const check = h('button', { class: 'btn alt', type: 'button', onclick: () => {
      if (!st.aligned || st.I <= 0) { msg.textContent = `회전자 N극이 전자석 S극을 정면으로 향하도록 각도를 ${phi()}°로 맞추고 전류를 켜 보세요.`; return; }
      msg.textContent = '';
      pred.compare('zero', '정렬되면 힘은 있어도 회전을 일으키는 팔 길이가 0이라 회전력이 0이에요.');
    } }, '예측 확인하기');

    const ctrl = h('div', { class: 'card' },
      h('h3', null, '🧪 직접 해 보기'),
      h('p', null, SIM.term('영구자석'), '이 붙은 ', SIM.term('회전자'), '는 가운데, 전자석이 되는 ', SIM.term('고정자'), '는 바깥에 있어요.'),
      pred, h('div', { class: 'ctrl' }, btnPol, btnFree, btnReset, check), msg, slI, slTh, ro,
      h('div', { class: 'legend' },
        h('span', null, h('i', { style: 'border-top:4px solid var(--ink)' }), '힘(굵은 화살표)'),
        h('span', null, h('i', { style: 'border-top:4px dotted var(--trq)' }), '토크(곡선 화살표)'),
        h('span', null, h('i', { style: 'border-top:2px dashed var(--ink)' }), '팔(회전축에서 힘의 선까지 수직 거리)')),
      h('div', { class: 'note warn' }, '고정자 전자석은 회전자 위치에서 균일한 자기장(N→S)을 만든다고 단순화한 교육용 모델이에요. 움직임에는 마찰 같은 감쇠를 넣었어요.'));

    const sh = SIM.shell({
      id: 's3', title: '3단계 · 자석 사이의 힘과 회전력 이해하기',
      intro: h('p', null, '전동기 안에서 전자석과 영구자석은 서로 밀거나 당겨요. 이 힘이 회전축을 중심으로 돌리려는 효과를 만들면 ', SIM.term('토크', '회전력(토크)'), '가 발생해요.'),
      goal: '자석 사이의 힘이 있어도 방향과 회전축의 위치에 따라 회전 효과가 달라진다는 것을 확인해요.',
      summary: ['회전자의 영구자석과 고정자의 전자석 사이에 인력과 척력이 작용해요.', '이 힘이 회전축에서 떨어진 방향으로 작용할 때 회전력(토크)이 생겨요.', '극이 일직선으로 정렬되면 힘이 있어도 토크는 0이고, 전자석을 고정해 두면 회전자는 멈춰 서요.'],
      quiz: [
        { q: '회전자의 N극이 고정자 전자석의 S극과 정확히 일직선일 때 토크는?', choices: ['최대', '0', '음수가 되어 반대로 돈다'], answer: 1,
          explain: '힘의 작용선이 회전축을 지나면 팔 길이가 0이라서 돌리는 효과가 없어요.', hints: ['토크가 최대인 건 두 극이 직각 방향일 때예요.', '', '일직선이면 어느 쪽으로도 돌리지 않아요.'] },
        { q: '고정된 전자석 하나만 있을 때 회전자는 어떻게 될까요?', choices: ['계속 같은 방향으로 돈다', '정렬되는 각도 근처에서 멈춘다', '점점 빨라진다'], answer: 1,
          explain: '전자석의 극이 고정되어 있으면 회전자가 정렬 각도에 도달한 뒤 멈춰요. 계속 돌리려면 자기장을 회전시켜야 해요(4단계).', hints: ['고정된 극으로는 계속 돌릴 수 없어요.', '', '마찰이 있으면 오히려 안정된 각도에서 멈춰요.'] }
      ]
    });
    sh.viz.replaceWith(h('div', null, svg));
    sh.ctrl.replaceWith(ctrl);
    draw();
    return sh.root;
  }
})();
