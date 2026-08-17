(() => {
  'use strict';

  const ASSET_ROOT = '/outputs/019fcaf2-285c-7dc3-897a-3c9a2903aac4/2d-pet/v1.0/poses';
  const PREPARE_MS = 120;
  const BRIDGE_MS = 320;
  const SETTLE_MS = 240;
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
    IDLE_LISTEN: { prepareX: '0px', prepareY: '2px', prepareRotate: '0deg', enterX: '0px', enterY: '5px', enterRotate: '0deg', exitX: '0px', exitY: '-2px', exitRotate: '0deg', settleX: '0px', settleY: '-2px', settleRotate: '.2deg', settleScale: '1.008' },
    WELCOME: { prepareX: '2px', prepareY: '2px', prepareRotate: '.4deg', enterX: '-8px', enterY: '6px', enterRotate: '-1.2deg', exitX: '5px', exitY: '-3px', exitRotate: '.7deg', settleX: '2px', settleY: '-4px', settleRotate: '.5deg', settleScale: '1.018' },
    GUIDE: { prepareX: '-2px', prepareY: '1px', prepareRotate: '-.4deg', enterX: '9px', enterY: '2px', enterRotate: '1.2deg', exitX: '-5px', exitY: '0px', exitRotate: '-.7deg', settleX: '-2px', settleY: '-1px', settleRotate: '-.4deg', settleScale: '1.012' },
    THINK: { prepareX: '1px', prepareY: '2px', prepareRotate: '.3deg', enterX: '-3px', enterY: '6px', enterRotate: '-.9deg', exitX: '3px', exitY: '-3px', exitRotate: '.5deg', settleX: '-1px', settleY: '-2px', settleRotate: '-.4deg', settleScale: '1.006' },
    PRAISE_PROGRESS: { prepareX: '0px', prepareY: '4px', prepareRotate: '0deg', enterX: '0px', enterY: '8px', enterRotate: '0deg', exitX: '0px', exitY: '-6px', exitRotate: '0deg', settleX: '0px', settleY: '-5px', settleRotate: '0deg', settleScale: '1.024' },
    SEARCH: { prepareX: '-3px', prepareY: '1px', prepareRotate: '-.5deg', enterX: '10px', enterY: '3px', enterRotate: '1.2deg', exitX: '-7px', exitY: '0px', exitRotate: '-1deg', settleX: '-3px', settleY: '-1px', settleRotate: '-.5deg', settleScale: '1.01' },
    CELEBRATE: { prepareX: '0px', prepareY: '5px', prepareRotate: '0deg', enterX: '0px', enterY: '12px', enterRotate: '0deg', exitX: '0px', exitY: '-10px', exitRotate: '0deg', settleX: '0px', settleY: '-7px', settleRotate: '0deg', settleScale: '1.03' },
    RETRY: { prepareX: '3px', prepareY: '2px', prepareRotate: '.5deg', enterX: '-8px', enterY: '4px', enterRotate: '-1deg', exitX: '6px', exitY: '-2px', exitRotate: '.9deg', settleX: '2px', settleY: '-2px', settleRotate: '.4deg', settleScale: '1.012' }
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
      this.timers = new Set();
      if (!CHARACTERS.includes(this.character) || !this.image || !this.stage) return;
      this.image.addEventListener('error', () => {
        const fallback = this.image.dataset.pngFallback;
        if (fallback && this.image.src !== new URL(fallback, document.baseURI).href) this.image.src = fallback;
      });
      controllers.push(this);
    }

    schedule(callback, delay) {
      const timer = window.setTimeout(() => {
        this.timers.delete(timer);
        callback();
      }, delay);
      this.timers.add(timer);
    }

    resetTransition() {
      this.timers.forEach((timer) => window.clearTimeout(timer));
      this.timers.clear();
      this.stage.querySelectorAll('.pet-motion-outgoing').forEach((item) => item.remove());
      this.image.classList.remove('pet-motion-preparing', 'pet-motion-incoming', 'pet-motion-settling');
      this.root.classList.remove('is-pet-transitioning');
      this.root.dataset.petPhase = 'steady';
    }

    applyProfile(profile) {
      Object.entries(profile).forEach(([name, value]) => {
        const cssName = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
        this.root.style.setProperty(`--pet-${cssName}`, value);
      });
    }

    announce(state, previousState, source, transition) {
      this.root.dispatchEvent(new CustomEvent('mathchakchak:pet-state', {
        bubbles: true,
        detail: {
          character: this.character,
          previousState,
          state,
          source,
          transition,
          phases: transition === 'NATURAL_CHOREOGRAPHY' ? ['prepare', 'bridge', 'settle', 'steady'] : ['steady'],
          totalDurationMs: transition === 'NATURAL_CHOREOGRAPHY' ? PREPARE_MS + BRIDGE_MS + SETTLE_MS : 0,
          reducedMotion: reducedMotion.matches
        }
      }));
    }

    commitStatic(state, previousState, definition, source, nextSource, png) {
      this.resetTransition();
      this.image.dataset.pngFallback = png;
      this.image.src = nextSource;
      this.image.alt = `${definition.label} — ${this.character}`;
      this.root.dataset.petState = state;
      if (this.caption) this.caption.textContent = definition.label;
      this.announce(state, previousState, source, 'STATIC_POSE_SWAP');
    }

    beginChoreography(state, previousState, definition, source, nextSource, png, token) {
      if (token !== this.transitionToken) return;
      const profile = TRANSITIONS[state];
      this.resetTransition();
      this.applyProfile(profile);
      this.root.classList.add('is-pet-transitioning');
      this.root.dataset.petPhase = 'prepare';
      this.image.classList.add('pet-motion-preparing');

      this.schedule(() => {
        if (token !== this.transitionToken) return;
        const outgoing = this.image.cloneNode(false);
        outgoing.removeAttribute('data-pet-image');
        outgoing.removeAttribute('data-png-fallback');
        outgoing.alt = '';
        outgoing.setAttribute('aria-hidden', 'true');
        outgoing.className = 'pet-motion-outgoing';
        this.stage.appendChild(outgoing);

        this.image.classList.remove('pet-motion-preparing');
        this.image.classList.add('pet-motion-incoming');
        this.image.dataset.pngFallback = png;
        this.image.src = nextSource;
        this.image.alt = `${definition.label} — ${this.character}`;
        this.root.dataset.petState = state;
        this.root.dataset.petPhase = 'bridge';
        if (this.caption) this.caption.textContent = definition.label;

        this.schedule(() => {
          if (token !== this.transitionToken) return;
          outgoing.remove();
          this.image.classList.remove('pet-motion-incoming');
          this.image.classList.add('pet-motion-settling');
          this.root.dataset.petPhase = 'settle';

          this.schedule(() => {
            if (token !== this.transitionToken) return;
            this.image.classList.remove('pet-motion-settling');
            this.root.classList.remove('is-pet-transitioning');
            this.root.dataset.petPhase = 'steady';
            this.announce(state, previousState, source, 'NATURAL_CHOREOGRAPHY');
          }, SETTLE_MS);
        }, BRIDGE_MS);
      }, PREPARE_MS);
    }

    setState(state, source = 'api') {
      if (!STATES[state]) return false;
      const definition = STATES[state];
      const token = ++this.transitionToken;
      const previousState = this.root.dataset.petState;
      if (this.root.classList.contains('is-pet-transitioning')) this.resetTransition();
      const webp = assetPath(this.character, state, 'webp');
      const png = assetPath(this.character, state, 'png');
      const commit = (nextSource) => {
        if (token !== this.transitionToken) return;
        const shouldAnimate = previousState && previousState !== state && !reducedMotion.matches;
        if (shouldAnimate) {
          this.beginChoreography(state, previousState, definition, source, nextSource, png, token);
        } else {
          this.commitStatic(state, previousState, definition, source, nextSource, png);
        }
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

  document.addEventListener('visibilitychange', () => {
    document.documentElement.classList.toggle('pet-motion-paused', document.hidden);
  });

  const form = document.querySelector('#diagnosisForm');
  if (form) {
    form.addEventListener('submit', () => {
      setState('CELEBRATE', 'diagnosis-submit');
      window.setTimeout(() => setState('IDLE_LISTEN', 'diagnosis-settle'), reducedMotion.matches ? 80 : 1800);
    });
  }

  window.mathChakChakPets = Object.freeze({
    states: Object.keys(STATES),
    setState,
    choreography: Object.freeze({ prepareMs: PREPARE_MS, bridgeMs: BRIDGE_MS, settleMs: SETTLE_MS }),
    isReducedMotion: () => reducedMotion.matches
  });

  const initialState = document.querySelector('[data-pet-state-trigger][aria-pressed="true"]')?.dataset.petStateTrigger || 'WELCOME';
  setState(initialState, 'initialization');
})();
