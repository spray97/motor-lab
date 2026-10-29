(function () {
  const { h } = SIM;

  SIM.steps.push({ id: 's7', name: '정리와 퀴즈', render });

  const GOALS = [
    ['s2', '① 전류가 흐르는 코일 주변에 자기장이 생긴다.'],
    ['s2', '② 전류 방향이 바뀌면 전자석의 N극과 S극도 바뀐다.'],
    ['s1', '③ 같은 극끼리는 밀어내고 다른 극끼리는 끌어당긴다.'],
    ['s3', '④ 전동기는 전자석과 영구자석의 상호작용으로 회전력을 만든다.'],
    ['s4', '⑤ 전류를 순차적으로 바꾸면 회전 자기장을 만들 수 있다.'],
    ['s6', '⑥ 속도가 높아지면 역기전력도 커지고, 이를 다루는 방법 중 하나가 약계자 제어다.'],
    ['s5', '⑦ 속도와 회전력을 조절하려면 전류와 자기장을 적절히 제어해야 한다.']
  ];
  const FLOW = [
    ['전류', '배터리 → 교류로 변환'],
    ['자기장', '고정자 코일 주변에 생김'],
    ['전자석', '고정자 표면에 N·S극'],
    ['회전 자기장', '3상 전류의 시간차'],
    ['회전력', '영구자석과 인력·척력'],
    ['역기전력', '고속일수록 커짐'],
    ['약계자 제어', 'd축 전류로 유효 자속 감소']
  ];

  function render() {
    const checklist = h('ul', { style: 'list-style:none;padding:0;margin:0' });
    const paint = () => checklist.replaceChildren(...GOALS.map(([id, t]) =>
      h('li', { style: 'padding:4px 0' }, SIM.progress[id] ? '✅ ' : '⬜ ', t, SIM.progress[id] ? '' : h('span', { class: 'note', style: 'display:inline;border:0;padding-left:6px' }, '(해당 단계 퀴즈를 풀면 체크돼요)'))));
    paint();
    const onProg = () => paint();
    document.addEventListener('simprogress', onProg);
    SIM.onLeave(() => document.removeEventListener('simprogress', onProg));

    const flow = h('div', { class: 'card' },
      h('h3', null, '🔗 전체 원리 한눈에 보기'),
      h('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;align-items:stretch' },
        FLOW.flatMap(([a, b], i) => [
          h('div', { style: 'flex:1 1 120px;background:var(--accent-soft);border-radius:12px;padding:8px 10px;min-width:120px' }, h('b', null, `${i + 1}. ${a}`), h('div', { class: 'note', style: 'border:0;padding:0;margin:2px 0 0' }, b)),
          i < FLOW.length - 1 ? h('div', { style: 'align-self:center;color:var(--accent);font-weight:800' }, '→') : null
        ])));
    const goals = h('div', { class: 'card' }, h('h3', null, '🎯 학습 목표 체크'), checklist,
      h('div', { class: 'note' }, '전문 용어가 헷갈리면 오른쪽 위 “📖 용어 사전”을 열어 보세요.'));

    const sh = SIM.shell({
      id: 's7', title: '7단계 · 전체 원리 정리 및 학습 퀴즈',
      intro: h('p', null, '지금까지 배운 내용을 하나의 흐름으로 이어 보고, 종합 퀴즈로 확인해요.'),
      goal: '전류 → 자기장 → 전자석 → 회전 자기장 → 회전력 → 역기전력 → 약계자 제어로 이어지는 전체 흐름을 설명할 수 있어요.',
      summary: ['전류가 자기장을 만들고, 고정자의 회전 자기장이 영구자석(회전자)을 끌고 밀어 회전력을 만들어요.', '속도가 높아지면 역기전력이 커져 전압 한계에 가까워지고, 약계자 제어로 유효 자속을 줄여 고속 운전 범위를 넓혀요.', '전동기의 속도와 회전력은 전류의 세기·방향·시간차를 제어해서 조절해요.'],
      quiz: [
        { q: '전동기가 회전력을 얻는 기본 원리는?', choices: ['전자석과 영구자석 사이의 인력과 척력', '영구자석끼리의 마찰', '배터리의 열'], answer: 0,
          explain: '고정자 전자석과 회전자 영구자석이 서로 끌고 밀며 회전력을 만들어요.', hints: ['', '마찰은 오히려 회전을 방해해요.', '열은 회전력의 원인이 아니에요.'] },
        { q: '회전 자기장을 만드는 방법은?', choices: ['한 코일에 일정한 전류를 계속 흘린다', '여러 코일에 시간차를 두고 전류를 흘린다', '자석을 고정자에 붙인다'], answer: 1,
          explain: '3상 교류가 120°씩 시간차를 두고 변하면서 합성 자기장이 회전해요.', hints: ['일정한 전류는 방향이 고정된 자기장만 만들어요.', '', '고정자에는 전류로 만드는 전자석이 필요해요.'] },
        { q: '전류 방향을 반대로 하면 코일 전자석에서 일어나는 일은?', choices: ['세기만 변한다', 'N극과 S극이 서로 바뀐다', '자석이 사라진다'], answer: 1,
          explain: '오른손 법칙에 따라 전류 방향이 반대면 자기장 방향도 반대예요.', hints: ['세기는 전류의 크기가 정해요.', '', '전류가 흐르는 한 자기장은 생겨요.'] },
        { q: '역기전력이 전압 한계에 가까워지면 일어나는 일은?', choices: ['전류가 더 잘 흐른다', '전류가 흐르기 어려워져 회전 속도가 제한된다', '자석의 극이 바뀐다'], answer: 1,
          explain: '역기전력이 전류를 공급하는 전압을 상쇄하기 때문이에요.', hints: ['오히려 반대예요. 방해하는 전압이에요.', '', '자석의 극은 바뀌지 않아요.'] },
        { q: '약계자 제어에 대한 설명으로 옳은 것은?', choices: ['영구자석의 N·S극을 서로 바꾼다', 'd축 전류로 유효 자속을 줄여 역기전력을 낮춘다', '언제나 토크를 증가시킨다'], answer: 1,
          explain: '자석 자체는 그대로이고, 전류가 만든 자기장이 일부를 상쇄해요. 최대 회전력은 오히려 줄 수 있어요.', hints: ['극은 바뀌지 않아요.', '', '고속 운전을 가능하게 하지만 토크가 언제나 늘지는 않아요.'] },
        { q: '부하가 전동기가 낼 수 있는 최대 회전력을 넘으면?', choices: ['더 빨리 돈다', '자기장을 따라가지 못해 속도가 크게 떨어진다(탈조)', '부하가 저절로 사라진다'], answer: 1,
          explain: '동기가 깨져 평균 회전력이 크게 줄어요.', hints: ['부하는 회전을 방해해요.', '', '부하는 사라지지 않아요.'] }
      ]
    });
    sh.viz.replaceWith(flow);
    sh.ctrl.replaceWith(goals);
    sh.why('<b>왜 이 순서일까요?</b> 전류가 자기장을 만들고(1·2단계), 극끼리의 힘이 회전력을 만들며(3단계), 전류를 순서대로 바꾸어 자기장을 돌리면 계속 회전해요(4단계). 부하와 속도가 달라지면 필요한 회전력도 달라지고(5단계), 고속에서는 역기전력이 한계가 되어 약계자 제어가 필요해요(6단계).');
    return sh.root;
  }
})();
