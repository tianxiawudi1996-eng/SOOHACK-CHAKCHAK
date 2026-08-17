export class IdempotencyStore {
  #records = new Map();

  execute({actorId, scope, key, requestHash, now = Date.now(), ttlMs = 86400000}, operation) {
    if (!actorId || !scope || !key || !/^[0-9a-f]{64}$/.test(requestHash)) throw new Error('INVALID_IDEMPOTENCY_INPUT');
    const compound = `${actorId}:${scope}:${key}`;
    const existing = this.#records.get(compound);
    if (existing && existing.expiresAt > now) {
      if (existing.requestHash !== requestHash) throw new Error('IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST');
      return {...existing.result, replayed: true};
    }
    const result = operation();
    this.#records.set(compound, {requestHash, result, expiresAt: now + ttlMs});
    return {...result, replayed: false};
  }
}
