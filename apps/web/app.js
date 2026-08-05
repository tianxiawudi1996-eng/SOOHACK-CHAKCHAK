const STORAGE_KEY = 'mathchackchack:v0.1:session';

const bubbleLibrary = {
  Welcome: ['착착이', '공식의 뜻부터 한 단계만 같이 볼까?'],
  Guide: ['공식이', '양쪽에 같은 행동을 하면 균형은 그대로야.'],
  Think: ['착착이', '알고 있는 것부터 하나씩 떠올려 보자.'],
  Praise: ['착착이', '좋아! 이유까지 설명해서 더 오래 기억할 수 있겠어.'],
  Retry: ['공식이', '괜찮아. 헷갈린 한 단계만 다시 확인해 보자.'],
  Listen: ['착착이', '네가 푼 이유를 한 문장으로 들려줘.'],
  Complete: ['공식이', '완료했어! 오늘 공식을 스스로 꺼내 썼어.']
};

const state = {
  unit: null,
  stepIndex: 0,
  responses: {},
  attempts: 0,
  retryCount: 0,
  characterVisible: true
};

const $ = (selector) => document.querySelector(selector);

async function loadUnit() {
  const response = await fetch('./data/unit-equation-basics.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('학습 데이터를 불러오지 못했습니다.');
  state.unit = await response.json();
  restore();
  render();
}

function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved || saved.unitId !== state.unit.id) return;
    state.stepIndex = Math.min(Math.max(saved.stepIndex || 0, 0), 4);
    state.responses = saved.responses || {};
    state.attempts = saved.attempts || 0;
    state.retryCount = saved.retryCount || 0;
    state.characterVisible = saved.characterVisible !== false;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    unitId: state.unit.id,
    stepIndex: state.stepIndex,
    responses: state.responses,
    attempts: state.attempts,
    retryCount: state.retryCount,
    characterVisible: state.characterVisible
  }));
}

function setBubble(key) {
  const [speaker, text] = bubbleLibrary[key] || bubbleLibrary.Guide;
  $('#speaker').textContent = speaker;
  $('#bubble-text').textContent = text;
}

function renderStepper() {
  const list = $('#stepper');
  list.innerHTML = state.unit.steps.map((step, index) => {
    const className = index < state.stepIndex ? 'complete' : index === state.stepIndex ? 'current' : '';
    const current = index === state.stepIndex ? ' aria-current="step"' : '';
    return `<li class="${className}"${current}>${index + 1}. ${step.title}</li>`;
  }).join('');
  $('#progress-text').textContent = `${state.stepIndex + 1} / 5`;
  $('#progress-bar').style.width = `${(state.stepIndex + 1) * 20}%`;
}

function render() {
  renderStepper();
  $('#summary-panel').hidden = true;
  $('#learning-panel').hidden = false;
  $('#character-panel').hidden = !state.characterVisible;
  $('#character-toggle').setAttribute('aria-pressed', String(state.characterVisible));
  $('#character-toggle').textContent = state.characterVisible ? '캐릭터 숨기기' : '캐릭터 보이기';
  $('#back-button').disabled = state.stepIndex === 0;
  $('#next-button').textContent = state.stepIndex === 4 ? '학습 완료' : '다음';
  $('#feedback').className = 'feedback';
  $('#feedback').textContent = '한 단계씩 진행해 보세요.';

  const step = state.unit.steps[state.stepIndex];
  setBubble(step.characterState);
  const saved = state.responses[step.id] || '';

  const views = {
    understand: `
      <h3>등식은 균형이에요</h3>
      <p>${step.prompt}</p>
      <div class="formula" aria-label="엑스 더하기 삼은 팔과 같다">x + 3 = 8</div>
      <p>왼쪽과 오른쪽이 같은 값을 나타내므로 등식이 성립합니다.</p>`,
    connect: `
      <h3>양쪽에 같은 행동을 해요</h3>
      <p>${step.prompt}</p>
      <div class="choice-grid" role="group" aria-label="등식을 유지하는 행동 선택">
        ${['양쪽에서 3 빼기','왼쪽에서만 3 빼기','오른쪽에 3 더하기','왼쪽에만 8 더하기'].map(choice => `<button class="choice" type="button" data-choice="${choice}" aria-pressed="${saved === choice}">${choice}</button>`).join('')}
      </div>`,
    recall: `
      <h3>원리를 기억해 봐요</h3>
      <p>${step.prompt}</p>
      <div class="field">
        <label for="recall-input">내가 기억한 원리</label>
        <input id="recall-input" maxlength="120" value="${escapeHtml(saved)}" placeholder="예: 양쪽에 같은 연산을 한다">
      </div>`,
    apply: `
      <h3>이제 직접 풀어 봐요</h3>
      <p>${step.prompt}</p>
      <div class="formula" aria-label="엑스 더하기 삼은 팔과 같다">x + 3 = 8</div>
      <div class="field">
        <label for="answer-input">x의 값</label>
        <input id="answer-input" inputmode="numeric" autocomplete="off" value="${escapeHtml(saved)}" placeholder="숫자를 입력하세요">
      </div>`,
    explain: `
      <h3>풀이 이유를 설명해요</h3>
      <p>${step.prompt}</p>
      <div class="field">
        <label for="explanation-input">내 설명</label>
        <textarea id="explanation-input" maxlength="500" placeholder="예: 양쪽에서 3을 빼면 x만 남고, 8-3은 5이므로 x=5이다.">${escapeHtml(saved)}</textarea>
      </div>`
  };

  $('#step-content').innerHTML = views[step.type];
  bindStepEvents(step);
}

function bindStepEvents(step) {
  document.querySelectorAll('[data-choice]').forEach(button => {
    button.addEventListener('click', () => {
      state.responses[step.id] = button.dataset.choice;
      document.querySelectorAll('[data-choice]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      persist();
    });
  });
  const input = $('#recall-input') || $('#answer-input') || $('#explanation-input');
  if (input) input.addEventListener('input', event => {
    state.responses[step.id] = event.target.value;
    persist();
  });
}

function validateCurrentStep() {
  const step = state.unit.steps[state.stepIndex];
  const value = String(state.responses[step.id] || '').trim();
  state.attempts += 1;

  if (step.type === 'connect' && value !== '양쪽에서 3 빼기') return retry('등식의 양쪽에 같은 행동을 해야 균형이 유지돼요.');
  if (step.type === 'recall' && value.length < 5) return retry('“양쪽”과 “같은 연산”을 떠올려 한 문장으로 적어 보세요.');
  if (step.type === 'apply' && value !== step.answer) return retry('x 옆의 +3을 없애려면 양쪽에서 3을 빼 보세요.');
  if (step.type === 'explain' && value.length < 12) return retry('어떤 연산을 양쪽에 했는지와 계산 결과를 함께 설명해 보세요.');

  $('#feedback').className = 'feedback success';
  $('#feedback').textContent = state.stepIndex === 4 ? '설명까지 완료했습니다.' : '좋아요. 다음 단계로 갈 수 있어요.';
  setBubble(state.stepIndex >= 3 ? 'Praise' : 'Guide');
  persist();
  return true;
}

function retry(message) {
  state.retryCount += 1;
  $('#feedback').className = 'feedback retry';
  $('#feedback').textContent = message;
  setBubble('Retry');
  persist();
  return false;
}

function complete() {
  $('#learning-panel').hidden = true;
  $('#summary-panel').hidden = false;
  $('#summary-content').innerHTML = `
    <p>오늘은 등식의 양쪽에 같은 연산을 적용해 한 단계 방정식을 해결했습니다.</p>
    <div class="summary-grid">
      <div class="summary-item"><strong>5 / 5</strong><span>완료 단계</span></div>
      <div class="summary-item"><strong>${state.retryCount}</strong><span>재시도 횟수</span></div>
      <div class="summary-item"><strong>x = ${escapeHtml(state.responses.apply || '—')}</strong><span>적용 답</span></div>
    </div>
    <h3>학습자의 설명</h3>
    <p>${escapeHtml(state.responses.explain || '')}</p>
    <p><strong>다음 권장:</strong> x - 4 = 7처럼 뺄셈이 포함된 한 단계 방정식으로 확장합니다.</p>`;
  setBubble('Complete');
  persist();
  $('#summary-panel').focus?.();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
}

$('#back-button').addEventListener('click', () => {
  if (state.stepIndex > 0) state.stepIndex -= 1;
  persist();
  render();
});

$('#next-button').addEventListener('click', () => {
  if (!validateCurrentStep()) return;
  if (state.stepIndex === 4) return complete();
  state.stepIndex += 1;
  persist();
  render();
});

$('#character-toggle').addEventListener('click', () => {
  state.characterVisible = !state.characterVisible;
  persist();
  render();
});

$('#restart-button').addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  state.stepIndex = 0;
  state.responses = {};
  state.attempts = 0;
  state.retryCount = 0;
  render();
});

loadUnit().catch(error => {
  $('#feedback').className = 'feedback retry';
  $('#feedback').textContent = error.message;
});
