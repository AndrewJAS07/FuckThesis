// Base EventEmitter class
class EventEmitter {
  private events: { [key: string]: Function[] } = {};

  constructor() {
    this.events = {};
  }

  on(event: string, listener: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
    return this;
  }

  once(event: string, listener: Function) {
    const onceWrapper = (...args: any[]) => {
      this.removeListener(event, onceWrapper);
      listener(...args);
    };
    return this.on(event, onceWrapper);
  }

  emit(event: string, ...args: any[]) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args));
    }
    return this;
  }

  removeListener(event: string, listener: Function) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(l => l !== listener);
    }
    return this;
  }

  removeAllListeners(event?: string) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
    return this;
  }

  listenerCount(event: string) {
    return this.events[event] ? this.events[event].length : 0;
  }
}

// Create a simple stream implementation
const createStream = () => {
  const emitter = new EventEmitter();
  return {
    on: emitter.on.bind(emitter),
    once: emitter.once.bind(emitter),
    emit: emitter.emit.bind(emitter),
    removeListener: emitter.removeListener.bind(emitter),
    removeAllListeners: emitter.removeAllListeners.bind(emitter),
    listenerCount: emitter.listenerCount.bind(emitter),
    pipe: () => {},
    read: () => null,
    write: () => true,
    end: () => {},
    destroy: () => {},
    pause: () => {},
    resume: () => {},
    isPaused: () => false
  };
};

// Create the stream module object
const streamModule = {
  EventEmitter,
  Stream: createStream,
  Readable: createStream,
  Writable: createStream,
  Duplex: createStream,
  Transform: createStream,
  PassThrough: createStream,
  finished: () => {},
  pipeline: () => {},
  addAbortSignal: () => {},
  getDefaultHighWaterMark: () => 16384,
  isDisturbed: () => false,
  isErrored: () => false,
  isReadable: () => false,
  isWritable: () => false,
  isDuplex: () => false,
  isReadableStream: () => false,
  isWritableStream: () => false,
  isDuplexStream: () => false,
  isTransformStream: () => false,
  isPassThroughStream: () => false,
  isFinished: () => false,
  isPipeline: () => false,
  isAddAbortSignal: () => false,
  isGetDefaultHighWaterMark: () => false
};

export default streamModule; 