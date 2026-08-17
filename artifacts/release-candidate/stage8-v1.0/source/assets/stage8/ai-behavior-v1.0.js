(() => {
  'use strict';

  const MAX_LOGS = 50;
  const MOTION_STATES = Object.freeze({
    Neutral: 'IDLE_LISTEN', Welcome: 'WELCOME', Happy: 'PRAISE_PROGRESS', Listen: 'IDLE_LISTEN', Think: 'THINK',
    Curious: 'GUIDE', Guide: 'GUIDE', Search: 'SEARCH', Praise: 'PRAISE_PROGRESS', Retry: 'RETRY',
    Concern: 'RETRY', Celebrate: 'CELEBRATE', Wait: 'IDLE_LISTEN', Rest: 'IDLE_LISTEN', Error: 'RETRY'
  });

  const BUBBLES = Object.freeze({
    'BUB-GUI-01': { character: 'Gongsickyi', type: 'Guide', body: '공식의 뜻부터 같이 볼까?', cta: '뜻 보기', priority: 'High', exposure: 'persistent' },
    'BUB-HIN-01': { character: 'Gongsickyi', type: 'Hint', body: '여기부터 떠올려보자.', cta: '힌트 보기', priority: 'High', exposure: 'persistent' },
    'BUB-PRA-01': { character: 'Gongsickyi', type: 'Praise', body: '착! 정확하게 기억했어.', cta: '다음 문제', priority: 'Medium', exposure: '3.5s' },
    'BUB-RET-01': { character: 'Gongsickyi', type: 'Retry', body: '괜찮아, 한 단계만 다시 해보자.', cta: '다시 풀기', priority: 'High', exposure: 'persistent' },
    'BUB-RET-02': { character: 'Gongsickyi', type: 'Retry', body: '식의 첫 부분만 확인해볼까?', cta: '첫 단계 보기', priority: 'High', exposure: 'persistent' },
    'BUB-SRC-01': { character: 'Gongsickyi', type: 'Search', body: '관련 내용을 찾고 있어.', cta: '취소', priority: 'Low', exposure: 'loading' },
    'BUB-EMP-01': { character: 'Gongsickyi', type: 'Search', body: '조건을 바꾸면 찾을 수 있어.', cta: '필터 초기화', priority: 'Medium', exposure: 'persistent' },
    'BUB-CMP-01': { character: 'Both', type: 'Complete', body: '오늘 학습을 끝냈어!', cta: '결과 보기', priority: 'High', exposure: 'persistent' },
    'BUB-ERR-01': { character: 'Gongsickyi', type: 'Error', body: '연결을 확인하고 다시 시도해보자.', cta: '다시 시도', priority: 'Critical', exposure: 'persistent' },
    'BUB-WEL-01': { character: 'Chakchaki', type: 'Welcome', body: '오늘도 한 단계씩 해볼까?', cta: '학습 시작', priority: 'Medium', exposure: 'persistent' },
    'BUB-CHO-01': { character: 'Chakchaki', type: 'Guide', body: '어떤 학습부터 시작할까?', cta: '추천 보기', priority: 'Medium', exposure: 'persistent' },
    'BUB-PRG-01': { character: 'Chakchaki', type: 'Progress', body: '이제 한 단계만 더 하면 돼.', cta: '계속하기', priority: 'Low', exposure: '4s' },
    'BUB-RST-01': { character: 'Chakchaki', type: 'Rest', body: '잠깐 쉬었다 이어가도 좋아.', cta: '쉬기', priority: 'Low', exposure: 'persistent' }
  });

  const EVENTS = Object.freeze({
    'page.enter.home': { id: 'EVT-001', character: 'Chakchaki', state: 'Welcome', priority: 2, cooldownScope: 'session', once: true, bubble: 'BUB-WEL-01', next: 'Guide', minHoldMs: 1600 },
    'learning.start': { id: 'EVT-002', character: 'Chakchaki', state: 'Welcome', priority: 1, cooldownScope: 'learning', once: true, bubble: 'BUB-CHO-01', next: 'Listen', minHoldMs: 1400 },
    'concept.open': { id: 'EVT-003', character: 'Gongsickyi', state: 'Guide', priority: 1, cooldownScope: 'concept', once: true, bubble: 'BUB-GUI-01', next: 'Listen', minHoldMs: 1600 },
    'input.started': { id: 'EVT-004', character: 'Both', state: 'Listen', priority: 1, cooldownScope: 'input', cooldownMs: 300, bubble: null, next: 'Wait', minHoldMs: 700 },
    'idle.4s': { id: 'EVT-005', character: 'Gongsickyi', state: 'Think', priority: 4, cooldownScope: 'global', cooldownMs: 20000, bubble: null, next: 'Curious', minHoldMs: 1500, condition: 'idle4s' },
    'hint.request': { id: 'EVT-006', character: 'Gongsickyi', state: 'Curious', priority: 1, cooldownScope: 'question', once: true, bubble: 'BUB-HIN-01', next: 'Guide', minHoldMs: 1700 },
    'answer.correct': { id: 'EVT-007', character: 'Gongsickyi', state: 'Praise', priority: 1, cooldownScope: 'answer', cooldownMs: 0, bubble: 'BUB-PRA-01', next: 'Celebrate', minHoldMs: 1400, condition: 'praiseCadence' },
    'answer.wrong.first': { id: 'EVT-008', character: 'Gongsickyi', state: 'Retry', priority: 1, cooldownScope: 'question', once: true, bubble: 'BUB-RET-01', next: 'Guide', minHoldMs: 1700 },
    'answer.wrong.repeated': { id: 'EVT-009', character: 'Gongsickyi', state: 'Concern', priority: 1, cooldownScope: 'question', once: true, bubble: 'BUB-RET-02', next: 'Guide', minHoldMs: 1800, condition: 'repeatedWrong' },
    'search.loading.5s': { id: 'EVT-010', character: 'Gongsickyi', state: 'Search', priority: 3, cooldownScope: 'search', once: true, bubble: 'BUB-SRC-01', next: 'Wait', minHoldMs: 1500, condition: 'search5s' },
    'search.empty': { id: 'EVT-011', character: 'Gongsickyi', state: 'Search', priority: 2, cooldownScope: 'search', once: true, bubble: 'BUB-EMP-01', next: 'Guide', minHoldMs: 1700 },
    'diagnosis.complete': { id: 'EVT-012', character: 'Both', state: 'Celebrate', priority: 1, cooldownScope: 'completion', once: true, bubble: 'BUB-CMP-01', next: 'Neutral', minHoldMs: 1800 },
    'learning.complete': { id: 'EVT-013', character: 'Both', state: 'Celebrate', priority: 1, cooldownScope: 'completion', once: true, bubble: 'BUB-CMP-01', next: 'Rest', minHoldMs: 1800 },
    'network.error': { id: 'EVT-014', character: 'Gongsickyi', state: 'Error', priority: 0, cooldownScope: 'error', once: true, bubble: 'BUB-ERR-01', next: 'Retry', minHoldMs: 2200 },
    'idle.3m': { id: 'EVT-015', character: 'Chakchaki', state: 'Rest', priority: 5, cooldownScope: 'global', cooldownMs: 600000, bubble: 'BUB-RST-01', next: 'Neutral', minHoldMs: 2000, condition: 'idle3m' }
  });

  const SAMPLE_CONTEXT = Object.freeze({
    'page.enter.home': {}, 'learning.start': { learningId: 'sample-learning' }, 'concept.open': { conceptId: 'sample-concept' },
    'input.started': { inputId: 'sample-input' }, 'idle.4s': { idleMs: 4000 }, 'hint.request': { questionId: 'sample-question-hint' },
    'answer.correct': { correctStreak: 2, answerId: 'sample-answer' }, 'answer.wrong.first': { questionId: 'sample-question-first' },
    'answer.wrong.repeated': { questionId: 'sample-question-repeat', wrongCount: 2 }, 'search.loading.5s': { searchId: 'sample-search-loading', loadingMs: 5000 },
    'search.empty': { searchId: 'sample-search-empty' }, 'diagnosis.complete': { completionId: 'sample-diagnosis' },
    'learning.complete': { completionId: 'sample-learning-complete' }, 'network.error': { errorId: 'sample-network' }, 'idle.3m': { idleMs: 180000 }
  });

  const memory = { current: null, queue: null, inputProtected: false, lastBubbleId: null, cooldowns: new Map(), logs: [], releaseTimer: null, bubbleTimer: null };
  let eventSequence = 0;

  const now = () => Date.now();
  const publicEvent = (event) => ({ id: event.id, character: event.character, state: event.state, motionState: MOTION_STATES[event.state], priority: event.priority, bubbleId: event.bubble });

  function scopeKey(event, context) {
    const fields = { session: 'sessionId', learning: 'learningId', concept: 'conceptId', input: 'inputId', question: 'questionId', answer: 'answerId', search: 'searchId', completion: 'completionId', error: 'errorId' };
    const field = fields[event.cooldownScope];
    return `${event.id}:${field ? context[field] || 'default' : 'global'}`;
  }

  function conditionPass(event, context) {
    if (event.condition === 'idle4s') return Number(context.idleMs) >= 4000 && !memory.inputProtected;
    if (event.condition === 'idle3m') return Number(context.idleMs) >= 180000;
    if (event.condition === 'repeatedWrong') return Number(context.wrongCount) >= 2;
    if (event.condition === 'search5s') return Number(context.loadingMs) >= 5000;
    if (event.condition === 'praiseCadence') return Number(context.correctStreak) > 0 && Number(context.correctStreak) % 2 === 0;
    return true;
  }

  function cooldownPass(event, context, timestamp) {
    const key = scopeKey(event, context);
    if (!memory.cooldowns.has(key)) return true;
    if (event.once) return false;
    return timestamp - memory.cooldowns.get(key) >= Number(event.cooldownMs || 0);
  }

  function record(trigger, event, status) {
    const item = Object.freeze({ sequence: ++eventSequence, trigger, eventId: event?.id || null, status, state: event?.state || null, motionState: event ? MOTION_STATES[event.state] : null, bubbleId: event?.bubble || null });
    memory.logs.push(item);
    if (memory.logs.length > MAX_LOGS) memory.logs.splice(0, memory.logs.length - MAX_LOGS);
    updateDebug();
    document.dispatchEvent(new CustomEvent('mathchakchak:behavior', { detail: item }));
    return item;
  }

  function setRoles(character) {
    document.querySelectorAll('[data-pet-character]').forEach((root) => {
      root.dataset.aiRole = character === 'Both' || root.dataset.petCharacter === character ? 'primary' : 'support';
    });
  }

  function setMotion(state, source) {
    const motionState = MOTION_STATES[state];
    if (!motionState || !window.mathChakChakPets?.setState) return false;
    return window.mathChakChakPets.setState(motionState, source);
  }

  function hideBubble() {
    document.querySelectorAll('[data-ai-bubble]').forEach((panel) => { panel.hidden = true; });
  }

  function renderBubble(event) {
    window.clearTimeout(memory.bubbleTimer);
    if (!event.bubble) { hideBubble(); return 'NO_BUBBLE'; }
    const bubble = BUBBLES[event.bubble];
    if (!bubble) { hideBubble(); return 'BUBBLE_MISSING'; }
    if (memory.lastBubbleId === event.bubble && event.priority !== 0) return 'BUBBLE_REPEAT_SUPPRESSED';
    memory.lastBubbleId = event.bubble;
    document.querySelectorAll('[data-ai-bubble]').forEach((panel) => {
      panel.hidden = false;
      panel.dataset.tone = bubble.priority;
      panel.dataset.bubbleId = event.bubble;
      panel.setAttribute('aria-live', bubble.priority === 'Critical' ? 'assertive' : 'polite');
      const speaker = panel.querySelector('[data-ai-bubble-speaker]');
      const body = panel.querySelector('[data-ai-bubble-body]');
      const meta = panel.querySelector('[data-ai-bubble-meta]');
      const cta = panel.querySelector('[data-ai-bubble-cta]');
      if (speaker) speaker.textContent = bubble.character === 'Both' ? '착착이 · 공식이' : bubble.character === 'Chakchaki' ? '착착이' : '공식이';
      if (body) body.textContent = bubble.body;
      if (meta) meta.textContent = `${bubble.type} · ${event.bubble}`;
      if (cta) { cta.textContent = bubble.cta; cta.hidden = !bubble.cta; cta.dataset.bubbleId = event.bubble; }
    });
    const timed = /^(\d+(?:\.\d+)?)s$/.exec(bubble.exposure);
    if (timed) memory.bubbleTimer = window.setTimeout(hideBubble, Number(timed[1]) * 1000);
    return 'BUBBLE_SHOWN';
  }

  function releaseCurrent(token) {
    if (!memory.current || memory.current.token !== token) return;
    const finished = memory.current;
    memory.current = null;
    if (memory.queue) {
      const queued = memory.queue;
      memory.queue = null;
      applyEvent(queued.trigger, queued.event, queued.context, 'APPLIED_FROM_QUEUE');
    } else if (finished.event.next) {
      setMotion(finished.event.next, `behavior-next:${finished.trigger}`);
    }
    updateDebug();
  }

  function applyEvent(trigger, event, context, status = 'APPLIED') {
    const timestamp = now();
    const token = `${event.id}-${timestamp}-${eventSequence + 1}`;
    memory.cooldowns.set(scopeKey(event, context), timestamp);
    memory.current = { trigger, event, token, expiresAt: timestamp + event.minHoldMs };
    setRoles(event.character);
    setMotion(event.state, `behavior:${trigger}`);
    const bubbleStatus = renderBubble(event);
    window.clearTimeout(memory.releaseTimer);
    memory.releaseTimer = window.setTimeout(() => releaseCurrent(token), event.minHoldMs);
    return record(trigger, event, bubbleStatus === 'BUBBLE_REPEAT_SUPPRESSED' ? `${status}_BUBBLE_REPEAT_SUPPRESSED` : status);
  }

  function dispatch(trigger, context = {}) {
    const event = EVENTS[trigger];
    if (!event) return record(trigger, null, 'REJECTED_UNKNOWN_EVENT');
    const timestamp = now();
    if (memory.inputProtected && trigger !== 'input.started' && trigger !== 'network.error') return record(trigger, event, 'SUPPRESSED_INPUT_PROTECTION');
    if (!conditionPass(event, context)) return record(trigger, event, 'SUPPRESSED_CONDITION');
    if (!cooldownPass(event, context, timestamp)) return record(trigger, event, 'SUPPRESSED_COOLDOWN');

    if (memory.current && timestamp < memory.current.expiresAt) {
      if (event.priority < memory.current.event.priority) {
        window.clearTimeout(memory.releaseTimer);
        memory.current = null;
        memory.queue = null;
        return applyEvent(trigger, event, context, 'APPLIED_PREEMPTED_LOWER_PRIORITY');
      }
      if (event.priority >= 4) return record(trigger, event, 'DROPPED_LOW_PRIORITY');
      if (!memory.queue || event.priority < memory.queue.event.priority) memory.queue = { trigger, event, context };
      updateDebug();
      return record(trigger, event, 'QUEUED');
    }
    return applyEvent(trigger, event, context);
  }

  function simulate(trigger) {
    return dispatch(trigger, { ...(SAMPLE_CONTEXT[trigger] || {}) });
  }

  function reset() {
    window.clearTimeout(memory.releaseTimer);
    window.clearTimeout(memory.bubbleTimer);
    memory.current = null;
    memory.queue = null;
    memory.inputProtected = false;
    memory.lastBubbleId = null;
    memory.cooldowns.clear();
    memory.logs.splice(0);
    hideBubble();
    setRoles('Both');
    setMotion('Neutral', 'behavior-reset');
    updateDebug();
    return true;
  }

  function setMascotsHidden(hidden) {
    document.documentElement.classList.toggle('ai-mascots-hidden', Boolean(hidden));
    return document.documentElement.classList.contains('ai-mascots-hidden');
  }

  function snapshot() {
    return Object.freeze({
      current: memory.current ? publicEvent(memory.current.event) : null,
      queued: memory.queue ? publicEvent(memory.queue.event) : null,
      inputProtected: memory.inputProtected,
      lastBubbleId: memory.lastBubbleId,
      logs: memory.logs.slice()
    });
  }

  function updateDebug() {
    const current = memory.current?.event;
    document.querySelectorAll('[data-ai-current]').forEach((node) => { node.textContent = current ? `${current.id} · ${current.state}` : '대기'; });
    document.querySelectorAll('[data-ai-queue]').forEach((node) => { node.textContent = memory.queue ? memory.queue.event.id : '없음'; });
    document.querySelectorAll('[data-ai-input-protected]').forEach((node) => { node.textContent = memory.inputProtected ? 'ON' : 'OFF'; });
    document.querySelectorAll('[data-ai-last-outcome]').forEach((node) => { node.textContent = memory.logs.at(-1)?.status || '없음'; });
    document.querySelectorAll('[data-ai-log]').forEach((list) => {
      list.replaceChildren(...memory.logs.slice(-12).reverse().map((item) => {
        const row = document.createElement('li');
        row.textContent = `${item.sequence} ${item.eventId || 'UNKNOWN'} ${item.status} ${item.state || '-'}`;
        return row;
      }));
    });
  }

  document.querySelectorAll('[data-ai-event-trigger]').forEach((button) => {
    button.addEventListener('pointerdown', (event) => event.preventDefault());
    button.addEventListener('click', () => simulate(button.dataset.aiEventTrigger));
  });
  document.querySelectorAll('[data-ai-reset]').forEach((button) => button.addEventListener('click', reset));
  document.querySelectorAll('[data-ai-hide-toggle]').forEach((button) => button.addEventListener('click', () => {
    const hidden = setMascotsHidden(button.getAttribute('aria-pressed') !== 'true');
    button.setAttribute('aria-pressed', String(hidden));
    button.textContent = hidden ? '캐릭터 다시 표시' : '캐릭터 숨기기';
    record('mascot.visibility', null, hidden ? 'MASCOTS_HIDDEN' : 'MASCOTS_VISIBLE');
  }));
  document.querySelectorAll('[data-ai-bubble-cta]').forEach((button) => button.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('mathchakchak:behavior-cta', { detail: { bubbleId: button.dataset.bubbleId || null } }));
  }));

  document.addEventListener('focusin', (event) => {
    if (!event.target.matches('input,select,textarea,[contenteditable="true"]')) return;
    memory.inputProtected = true;
    dispatch('input.started', { inputId: event.target.name || event.target.id || 'input' });
  });
  document.addEventListener('focusout', () => window.setTimeout(() => {
    memory.inputProtected = Boolean(document.activeElement?.matches('input,select,textarea,[contenteditable="true"]'));
    if (!memory.inputProtected && memory.queue && !memory.current) {
      const queued = memory.queue; memory.queue = null; applyEvent(queued.trigger, queued.event, queued.context, 'APPLIED_AFTER_INPUT');
    }
    updateDebug();
  }, 0));

  document.querySelector('#diagnosisForm')?.addEventListener('submit', () => dispatch('diagnosis.complete', { completionId: 'diagnosis-form' }));
  window.addEventListener('pagehide', () => { memory.queue = null; });

  window.mathChakChakBehavior = Object.freeze({
    states: Object.keys(MOTION_STATES),
    events: Object.keys(EVENTS),
    bubbles: Object.keys(BUBBLES),
    dispatch,
    simulate,
    reset,
    setMascotsHidden,
    getSnapshot: snapshot
  });

  updateDebug();
  dispatch('page.enter.home', { sessionId: 'page-session' });
})();
