(function () {
  const SIM = (window.SIM = { steps: [], progress: {}, leaveFns: [] });
  const SVGNS = 'http://www.w3.org/2000/svg';

  function build(el, attrs, kids) {
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(9)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
    return el;
  }
  SIM.h = (tag, attrs, ...kids) => build(document.createElement(tag), attrs, kids);
  SIM.s = (tag, attrs, ...kids) => build(document.createElementNS(SVGNS, tag), attrs, kids);
  const h = SIM.h, s = SIM.s;

  SIM.onLeave = (fn) => SIM.leaveFns.push(fn);
  SIM.leave = () => { SIM.leaveFns.splice(0).forEach((f) => f()); };

  SIM.loop = (fn) => {
    let id = 0, last = performance.now(), on = true;
    const tick = (t) => {
      if (!on) return;
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      fn(dt);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    const stop = () => { on = false; cancelAnimationFrame(id); };
    SIM.onLeave(stop);
    return stop;
  };

  SIM.GLOSSARY = {
    '영구자석': ['전류가 흐르지 않아도 자성을 유지하는 자석이에요.', '전동기에서는 회전자 안에 붙어 있어요.'],
    '전자석': ['전류가 흐를 때 자기장을 만들어 자석처럼 작용하는 장치예요.', '전류를 끄면 (이상적인 경우) 자성도 사라져요.'],
    '자기장': ['자석이나 전류 주변에서 자기력이 작용하는 공간이에요.', '눈에는 보이지 않지만 나침반으로 방향을 알 수 있어요.'],
    '자기력선': ['자기장의 방향을 선으로 나타낸 거예요.', '자석 바깥에서는 N극에서 S극으로, 안에서는 S극에서 N극으로 향하고 서로 끊기거나 겹치지 않아요.'],
    '고정자': ['전동기에서 움직이지 않는 부분이에요.', '안쪽에 전선이 감긴 슬롯이 있어 전자석 역할을 해요.'],
    '회전자': ['전동기에서 회전하는 부분이에요.', '영구자석이 붙어 있고 바퀴와 연결된 축에 결합돼요.'],
    '전류': ['전하(전기를 띤 입자)가 도선을 따라 흐르는 것이에요.', '방향과 세기가 있어요.'],
    '교류': ['방향과 세기가 주기적으로 바뀌는 전류예요.', '배터리는 직류라서 제어 시스템이 교류로 바꿔서 보내요.'],
    '3상 교류': ['서로 시간차를 두고 변하는 세 개의 교류 전류를 쓰는 방식이에요.', '이 시뮬레이터에서는 U·V·W 세 상이 120°(전기각)씩 차이 나요.'],
    '회전 자기장': ['방향이 시간에 따라 회전하는 것처럼 변하는 자기장이에요.', '코일 자체는 움직이지 않아요. 전류를 순서대로 바꿔서 만들어요.'],
    '토크': ['물체를 회전시키려는 효과예요. 회전력이라고도 해요.', '힘 × (회전축에서 힘이 작용하는 지점까지의 수직 거리)로 정해져요.'],
    '역기전력': ['전동기가 회전할 때 유도되어, 전류를 공급하는 전압을 방해하는 방향으로 작용하는 전압이에요.', '빨리 돌수록 커질 수 있어요.'],
    '약계자 제어': ['고속으로 회전할 수 있도록 전류를 조절해 유효 자속(실제로 작용하는 자기장의 양)을 줄이는 제어 방법이에요.', '영구자석의 N극·S극이 바뀌는 것이 아니에요.'],
    '주파수': ['전류의 변화가 1초에 몇 번 반복되는지를 나타내는 값이에요.', '단위는 Hz(헤르츠)예요.'],
    '극쌍 수': ['회전자에 있는 N극·S극 한 쌍이 몇 개인지를 나타내는 수예요.', '극쌍 수가 많으면 같은 주파수에서 더 천천히 돌아요.'],
    '부하': ['전동기가 이겨 내야 하는, 회전을 방해하는 힘(저항)이에요.', '예: 언덕길, 무거운 짐.']
  };

  SIM.tip = (title, text) => {
    document.getElementById('tipTitle').textContent = title;
    const body = document.getElementById('tipBody');
    body.replaceChildren(...(Array.isArray(text) ? text : [text]).map((t) => h('p', null, t)));
    document.getElementById('tipDlg').showModal();
  };
  SIM.term = (name, label) => {
    const g = SIM.GLOSSARY[name];
    return h('span', null,
      h('span', { class: 'term' }, label || name),
      h('button', { class: 'q', type: 'button', 'aria-label': name + ' 쉬운 설명 보기', onclick: () => SIM.tip(name, g || '') }, '?'));
  };

  const COL = { current: 'var(--cur)', field: 'var(--fld)', force: 'var(--ink)', torque: 'var(--trq)' };
  const head = (x2, y2, ux, uy, size, kind, c) => {
    const nx = -uy, ny = ux;
    const bx = x2 - ux * size, by = y2 - uy * size;
    if (kind === 'field') {
      return s('path', { d: `M${bx + nx * size * 0.6},${by + ny * size * 0.6}L${x2},${y2}L${bx - nx * size * 0.6},${by - ny * size * 0.6}`, fill: 'none', stroke: c, 'stroke-width': 2, 'stroke-linecap': 'round' });
    }
    if (kind === 'force') {
      return s('path', { d: `M${x2},${y2}L${bx + nx * size * 0.7},${by + ny * size * 0.7}L${bx - ux * size * 0.3},${by - uy * size * 0.3}L${bx - nx * size * 0.7},${by - ny * size * 0.7}Z`, fill: c });
    }
    return s('path', { d: `M${x2},${y2}L${bx + nx * size * 0.6},${by + ny * size * 0.6}L${bx - nx * size * 0.6},${by - ny * size * 0.6}Z`, fill: c });
  };
  SIM.arrow = (x1, y1, x2, y2, kind = 'field', opt = {}) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 2) return s('g');
    const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    const c = opt.color || COL[kind];
    const w = opt.width || { current: 4.5, field: 2, force: 4, torque: 4 }[kind];
    const hs = Math.min(len * 0.6, opt.head || { current: 12, field: 9, force: 13, torque: 12 }[kind]);
    const g = s('g', { opacity: opt.opacity ?? 1 });
    g.append(s('line', { x1, y1, x2: x2 - ux * hs * 0.7, y2: y2 - uy * hs * 0.7, stroke: c, 'stroke-width': w, 'stroke-linecap': kind === 'current' ? 'butt' : 'round', 'stroke-dasharray': opt.dash || (kind === 'force' ? '' : '') }));
    g.append(head(x2, y2, ux, uy, hs, kind, c));
    if (opt.label) g.append(s('text', { x: (x1 + x2) / 2 + (opt.lx || 0), y: (y1 + y2) / 2 + (opt.ly ?? -8), fill: c, 'font-size': opt.fs || 13, 'font-weight': 700, 'text-anchor': 'middle' }, opt.label));
    return g;
  };
  SIM.curvedArrow = (cx, cy, r, a0, a1, kind = 'torque', opt = {}) => {
    const rad = (d) => (d * Math.PI) / 180;
    const c = opt.color || COL[kind];
    const p = (a) => [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    const sweep = a1 > a0 ? 1 : 0;
    const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    const g = s('g');
    g.append(s('path', { d: `M${x0},${y0}A${r},${r} 0 ${large} ${sweep} ${x1},${y1}`, fill: 'none', stroke: c, 'stroke-width': opt.width || 4, 'stroke-linecap': 'round', 'stroke-dasharray': '2 6' }));
    const dir = sweep ? 1 : -1;
    const tx = -Math.sin(rad(a1)) * dir, ty = Math.cos(rad(a1)) * dir;
    g.append(head(x1, y1, tx, ty, 12, 'torque', c));
    if (opt.label) { const [lx, ly] = p((a0 + a1) / 2); g.append(s('text', { x: lx + (opt.lx || 0), y: ly + (opt.ly || 0), fill: c, 'font-size': 13, 'font-weight': 700, 'text-anchor': 'middle' }, opt.label)); }
    return g;
  };

  SIM.poleLabel = (x, y, pol, r = 14) =>
    s('g', null,
      s('circle', { cx: x, cy: y, r, fill: pol > 0 ? 'var(--n)' : 'var(--s)' }),
      s('text', { x, y: y + 5, fill: '#fff', 'font-size': r, 'font-weight': 800, 'text-anchor': 'middle' }, pol > 0 ? 'N' : 'S'));

  SIM.slider = (label, min, max, step, value, onInput, fmt = (v) => v) => {
    const out = h('b', { style: 'min-width:4.2em;text-align:right;color:var(--ink)' }, fmt(value));
    const inp = h('input', { type: 'range', min, max, step, value, 'aria-label': label });
    inp.addEventListener('input', () => { const v = +inp.value; out.textContent = fmt(v); onInput(v); });
    const el = h('label', { class: 'sl' }, h('span', { style: 'min-width:6.2em' }, label), inp, out);
    el.set = (v) => { inp.value = v; out.textContent = fmt(+v); };
    return el;
  };

  SIM.readout = (items) => {
    const el = h('div', { class: 'readout' });
    const bs = {};
    for (const [k, label] of items) { bs[k] = h('b', null, '-'); el.append(h('div', null, label, bs[k])); }
    el.update = (obj) => { for (const k in obj) if (bs[k]) bs[k].textContent = obj[k]; };
    return el;
  };

  SIM.predict = ({ question, options }) => {
    let chosen = null;
    const res = h('div', { class: 'result', hidden: true });
    const btns = options.map(([k, label]) => h('button', { type: 'button', 'aria-pressed': 'false', onclick: () => {
      chosen = k; btns.forEach((b) => b.setAttribute('aria-pressed', String(b === btns[options.findIndex((o) => o[0] === k)])));
    } }, label));
    const el = h('div', { class: 'predict' }, h('b', null, '🔮 예측하기: '), question, h('div', { class: 'opts' }, btns), res);
    el.compare = (actualKey, text) => {
      res.hidden = false;
      const ok = chosen === actualKey;
      res.className = 'result ' + (chosen == null ? '' : ok ? 'ok' : 'bad');
      res.textContent = (chosen == null ? '예측을 선택하지 않았어요. 결과: ' : ok ? '✅ 예측이 맞았어요! ' : '🔁 예측과 달랐어요. ') + text;
    };
    el.reset = () => { chosen = null; btns.forEach((b) => b.setAttribute('aria-pressed', 'false')); res.hidden = true; };
    return el;
  };

  SIM.quiz = (stepId, items) => {
    let solved = 0;
    const wrap = h('div', { class: 'card quiz' }, h('h3', null, '📝 이해도 확인'));
    items.forEach((it, qi) => {
      const fb = h('div', { class: 'fb', 'aria-live': 'polite' });
      let done = false;
      const btns = it.choices.map((c, ci) => h('button', { type: 'button', class: 'choice', onclick: () => {
        if (done) return;
        if (ci === it.answer) {
          done = true; btns[ci].classList.add('right'); fb.textContent = '✅ 정답! ' + it.explain;
          if (++solved === items.length) { SIM.progress[stepId] = true; document.dispatchEvent(new Event('simprogress')); }
        } else { btns[ci].classList.add('wrong'); fb.textContent = '🤔 ' + it.hints[ci] + ' 다시 골라 보세요.'; }
      } }, c));
      wrap.append(h('div', { style: 'margin-top:10px' }, h('b', null, `${qi + 1}. ${it.q}`), btns, fb));
    });
    return wrap;
  };

  SIM.shell = ({ id, title, goal, intro, summary, quiz }) => {
    const viz = h('div'), ctrl = h('div');
    const whyBody = h('div', null, '실험을 해 보면 여기에 이유가 나타나요.');
    const why = h('details', { class: 'why' }, h('summary', null, '🤔 왜 그럴까요?'), whyBody);
    const root = h('div', null,
      h('div', { class: 'card' }, h('h2', null, title), intro),
      h('div', { class: 'goal' }, h('b', null, '학습 목표 '), goal),
      h('div', { class: 'grid' }, viz, ctrl),
      h('div', { class: 'card' }, why),
      h('div', { class: 'card summary' }, h('h3', null, '📌 핵심 정리'), h('ol', null, summary.map((t) => h('li', null, t)))),
      SIM.quiz(id, quiz));
    let lastWhy = '';
    return { root, viz, ctrl, why: (html) => { if (html !== lastWhy) { lastWhy = html; whyBody.innerHTML = html; } } };
  };

  SIM.fmt = (v, d = 1) => (Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v).toFixed(d);
  SIM.rad = (d) => (d * Math.PI) / 180;
})();
