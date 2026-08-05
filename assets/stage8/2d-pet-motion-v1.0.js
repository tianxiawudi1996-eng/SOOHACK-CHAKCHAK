(() => {
  'use strict';

  const ASSET_ROOT = '/outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/2d-pet/v1.0/poses';
  const STATES = Object.freeze({
    IDLE_LISTEN: { pose: 'p01_idle-listen', label: '듣고 있어요', duration: 5000 },
    WELCOME: { pose: 'p02_welcome', label: '반가워요!', duration: 1000 },
    GUIDE: { pose: 'p03_guide', label: '같이 풀어봐요', duration: 1200 },
    THINK: { pose: 'p04_think', label: '생각해 볼까요?', duration: 3000 },
    PRAISE_PROGRESS: { pose: 'p05_praise-progress', label: '잘하고 있어요!', duration: 1200 },
    SEARCH: { pose: 'p06_search', label: '단서를 찾아봐요', duration: 2500 },
    CELEBRATE: { pose: 'p07_celebrate', label: '해냈어요!', duration: 1300 },
    RETRY: { pose: 'p08_retry', label: '다시 해볼까요?', duration: 1100 }
  });
  const CHARACTERS = Object.freeze(['Chakchaki', 'Gongsickyi']);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const controllers = [];

  function slug(character) {
    return character.toLowerCase();
  }

  function assetPath(character, state, format = 'webp') {
    const definition = STATES[state];
    return `${ASSET_ROOT}/${format}/${character}/${slug(character)}_${definition.pose}_v1.0.${format}`;
  }

  class PetMotionController {
    constructor(root) {
      this.root = root;
      this.character = root.dataset.petCharacter;
      this.image = root.querySelector('[data-pet-image]');
      this.caption = root.querySelector('[data-pet-caption]');
      if (!CHARACTERS.includes(this.character) || !this.image) return;
      this.image.addEventListener('error', () => {
        const fallback = this.image.dataset.pngFallback;
        if (fallback && this.image.src !== new URL(fallback, document.baseURI).href) this.image.src = fallback;
      });
      controllers.push(this);
    }

    setState(state, source = 'api') {
      if (!STATES[state]) return false;
      const definition = STATES[state];
      this.root.classList.add('is-transitioning');
      this.image.dataset.pngFallback = assetPath(this.character, state, 'png');
      this.image.src = assetPath(this.character, state, 'webp');
      this.image.alt = `${definition.label} — ${this.character}`;
      this.root.dataset.petState = state;
      if (this.caption) this.caption.textContent = definition.label;
      window.setTimeout(() => this.root.classList.remove('is-transitioning'), reducedMotion.matches ? 0 : 170);
      this.root.dispatchEvent(new CustomEvent('mathchakchak:pet-state', {
        bubbles: true,
        detail: { character: this.character, state, source, reducedMotion: reducedMotion.matches }
      }));
      return true;
    }
  }

  function setState(state, source = 'api') {
    if (!STATES[state]) return false;
    controllers.forEach((controller) => controller.setState(state, source));
    document.querySelectorAll('[data-pet-state-trigger]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.petStateTrigger === state));
    });
    const announcer = document.querySelector('[data-pet-announcer]');
    if (announcer) announcer.textContent = `캐릭터 상태: ${STATES[state].label}`;
    return true;
  }

  document.querySelectorAll('[data-pet-character]').forEach((root) => new PetMotionController(root));
  document.querySelectorAll('[data-pet-state-trigger]').forEach((button) => {
    button.addEventListener('click', () => setState(button.dataset.petStateTrigger, 'manual-control'));
  });

  CHARACTERS.forEach((character) => {
    Object.keys(STATES).forEach((state) => {
      const preload = new Image();
      preload.src = assetPath(character, state, 'webp');
    });
  });

  document.addEventListener('visibilitychange', () => {
    document.documentElement.classList.toggle('pet-motion-paused', document.hidden);
  });

  const form = document.querySelector('#diagnosisForm');
  if (form) {
    form.addEventListener('submit', () => {
      setState('CELEBRATE', 'diagnosis-submit');
      window.setTimeout(() => setState('IDLE_LISTEN', 'diagnosis-settle'), reducedMotion.matches ? 80 : 1500);
    });
  }

  window.mathChakChakPets = Object.freeze({
    states: Object.keys(STATES),
    setState,
    isReducedMotion: () => reducedMotion.matches
  });

  const initialState = document.querySelector('[data-pet-state-trigger][aria-pressed="true"]')?.dataset.petStateTrigger || 'WELCOME';
  setState(initialState, 'initialization');
})();
