class EventBus {
  constructor() {
    this._listeners = new Set();
  }

  subscribe(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  emit(event) {
    this._listeners.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.error('[EventBus] Listener error:', err);
      }
    });
  }
}

export const gdEventBus = new EventBus();
