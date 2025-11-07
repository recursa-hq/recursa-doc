type Listener<T = unknown> = (data: T) => void;

// Define a generic type for the emitter's event map
export type EventMap = Record<string, unknown>;

// Define the type for the emitter object returned by the HOF
export type Emitter<Events extends EventMap = EventMap> = {
  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void;
  off<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void;
  emit<K extends keyof Events>(event: K, data: Events[K]): void;
  once<K extends keyof Events>(event: K, listener: Listener<Events[K]>): void;
};

/**
 * Creates a new event emitter instance.
 * This is a Higher-Order Function that encapsulates the listeners
 * in a closure, adhering to a functional programming style.
 *
 * @returns An Emitter object.
 */
export const createEmitter = <
  Events extends EventMap = EventMap,
>(): Emitter<Events> => {
  // Listeners are stored in a Map within the closure
  const listeners = new Map<keyof Events, Listener<any>[]>();

  const on = <K extends keyof Events>(
    event: K,
    listener: Listener<Events[K]>
  ): void => {
    if (!listeners.has(event)) {
      listeners.set(event, []);
    }
    listeners.get(event)?.push(listener);
  };

  const off = <K extends keyof Events>(
    event: K,
    listener: Listener<Events[K]>
  ): void => {
    const eventListeners = listeners.get(event);
    if (!eventListeners) {
      return;
    }
    listeners.set(
      event,
      eventListeners.filter((l) => l !== listener)
    );
  };

  const emit = <K extends keyof Events>(event: K, data: Events[K]): void => {
    listeners.get(event)?.forEach((listener) => {
      try {
        listener(data);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`Error in event listener for ${String(event)}`, e);
      }
    });
  };

  const once = <K extends keyof Events>(
    event: K,
    listener: Listener<Events[K]>
  ): void => {
    const onceListener: Listener<Events[K]> = (data) => {
      off(event, onceListener);
      listener(data);
    };
    on(event, onceListener);
  };

  return {
    on,
    off,
    emit,
    once,
  };
};