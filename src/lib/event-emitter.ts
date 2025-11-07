type Listener<T = unknown> = (data: T) => void;

export class EventEmitter<
  Events extends Record<string, unknown> = Record<string, unknown>,
> {
  private listeners: { [K in keyof Events]?: Listener<Events[K]>[] } = {};

  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]?.push(listener);
  }

  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    if (!this.listeners[event]) {
      return;
    }
    this.listeners[event] = this.listeners[event]?.filter(
      (l) => l !== listener
    );
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    this.listeners[event]?.forEach((listener) => {
      try {
        listener(data);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`Error in event listener for ${String(event)}`, e);
      }
    });
  }

  once<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void {
    const onceListener: Listener<Events[K]> = (data) => {
      this.off(event, onceListener);
      listener(data);
    };
    this.on(event, onceListener);
  }
}