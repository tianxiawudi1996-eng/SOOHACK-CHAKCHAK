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
  const TRANSITIONS = Object.freeze({
    IDLE_LISTEN: { enterX: '0px', enterY: '4px', enterRotate: '0deg', exitX: '0px', exitY: '-2px', exitRotate: '0deg' },
    WELCOME: { enterX: '-7px', enterY: '5px', enterRotate: '-1deg', exitX: '4px', exitY: '-2px', exitRotate: '.5deg' },
    GUIDE: { enterX: '7px', enterY: '1px', enterRotate: '1deg', exitX: '-4px', exitY: '0px', exitRotate: '-.5deg' },
    THINK: { enterX: '0px', enterY: '5px', enterRotate: '-.7deg', exitX: '0px', exitY: '-3px', exitRotate: '.4deg' },
    PRAISE_PROGRESS: { enterX: '0px', enterY: '7px', enterRotate: '0deg', exitX: '0px', exitY: '-5px', exitRotate: '0deg' },
    SEARCH: { enterX: '8px', enterY: '2px', enterRotate: '1deg', exitX: '-6px', exitY: '0px', exitRotate: '-.8deg' },
    CELEBRATE: { enterX: '0px', enterY: '10px', enterRotate: '0deg', exitX: '0px', exitY: '-8px', exitRotate: '0deg' },
    RETRY: { enterX: '-6px', enterY: '3px', enterRotate: '-.8deg', exitX: '5px', exitY: '-1px', exitRotate: '.7deg' }
  });
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
      this.stage = root.querySelector('[data-pet-image-stage]');
      this.caption = root.querySelector('[data-pet-caption]');
      this.transitionToken = 0;
      if (!CHARACTERS.includes(this.character) || !this.image || !this.stage) return;
      this.image.addEventListener('error', () => {
        const fallback = this.image.dataset.pngFallback;
        if (fallback && this.image.src !== new URL(fallback, document.baseURI).href) this.image.src = fallback;
      });
      controllers.push(this);
    }

    setState(state, source = 'api') {
      if (!STATES[state]) return false;
      const definition = STATES[state];
      const token = ++this.transitionToken;
      const previousState = this.root.dataset.petState;
      const webp = assetPath(this.character, state, 'webp');
      const png = assetPath(this.character, state, 'png');
      const bridge = TRANSITIONS[state];
      const commit = (nextSource) => {
        if (token !== this.transitionToken) return;
        this.stage.querySelectorAll('.pet-motion-outgoing').forEach((item) => item.remove());
        const shouldBridge = previousState && previousState !== state && !reducedMotion.matches;
        let outgoing = null;
        if (shouldBridge) {
          outgoing = this.image.cloneNode(false);
          outgoing.removeAttribute('data-pet-image');
          outgoing.removeAttribute('data-png-fallback');
          outgoing.alt = '';
          outgoing.setAttribute('aria-hidden', 'true');
          outgoing.className = 'pet-motion-outgoing';
          this.stage.appendChild(outgoing);
          this.root.style.setProperty('--pet-enter-x', bridge.enterX);
          this.root.style.setProperty('--pet-enter-y', bridge.enterY);
          this.root.style.setProperty('--pet-enter-rotate', bridge.enterRotate);
          this.root.style.setProperty('--pet-exit-x', bridge.exitX);
          this.root.style.setProperty('--pet-exit-y', bridge.exitY);
          this.root.style.setProperty('--pet-exit-rotate', bridge.exitRotate);
          this.image.classList.add('pet-motion-incoming');
        }
        this.image.dataset.pngFallback = png;
        this.image.src = nextSource;
        this.image.alt = `${definition.label} — ${this.character}`;
        this.root.dataset.petState = state;
        if (this.caption) this.caption.textContent = definition.label;
        window.setTimeout(() => {
          if (token !== this.transitionToken) return;
          this.image.classList.remove('pet-motion-incoming');
          outgoing?.remove();
        }, shouldBridge ? 340 : 0);
        this.root.dispatchEvent(new CustomEvent('mathchakchak:pet-state', {
          bubbles: true,
          detail: { character: this.character, previousState, state, source, transition: shouldBridge ? 'CROSSFADE_BRIDGE' : 'STATIC_POSE_SWAP', reducedMotion: reducedMotion.matches }
        }));
      };
      const probe = new Image();
      probe.addEventListener('load', () => commit(webp), { once: true });
      probe.addEventListener('error', () => commit(png), { once: true });
      probe.src = webp;
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
