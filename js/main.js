(function () {
  const { h } = SIM;
  const nav = document.getElementById('stepNav');
  const stage = document.getElementById('stage');
  let cur = 0;

  function renderNav() {
    nav.replaceChildren(...SIM.steps.map((st, i) =>
      h('button', { type: 'button', 'aria-current': i === cur ? 'step' : null, onclick: () => go(i) },
        `${i + 1}단계 ${st.name}`, SIM.progress[st.id] ? h('span', { class: 'done' }, '✔') : null)));
  }

  function go(i) {
    SIM.leave();
    cur = i;
    stage.replaceChildren();
    const st = SIM.steps[i];
    const page = st.render();
    const pager = h('div', { class: 'pager' },
      h('button', { class: 'btn alt', type: 'button', disabled: i === 0, onclick: () => go(i - 1) }, '← 이전 단계'),
      h('button', { class: 'btn', type: 'button', disabled: i === SIM.steps.length - 1, onclick: () => go(i + 1) }, '다음 단계 →'));
    stage.append(page, pager);
    renderNav();
    history.replaceState(null, '', '#' + (i + 1));
    window.scrollTo(0, 0);
    stage.focus({ preventScroll: true });
  }

  function renderGlossary() {
    const dl = h('dl');
    for (const [k, v] of Object.entries(SIM.GLOSSARY)) dl.append(h('dt', null, k), h('dd', null, v[0]), h('dd', { class: 'gap' }, v[1]));
    document.getElementById('glossaryList').replaceChildren(dl);
  }

  document.getElementById('glossaryBtn').addEventListener('click', () => document.getElementById('glossaryDlg').showModal());
  document.addEventListener('simprogress', renderNav);
  renderGlossary();
  const start = Math.min(SIM.steps.length - 1, Math.max(0, (parseInt(location.hash.slice(1), 10) || 1) - 1));
  go(start);
})();
