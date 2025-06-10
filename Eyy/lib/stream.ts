import { EventEmitter } from 'events';

class Stream extends EventEmitter {
  constructor() {
    super();
  }

  pipe(dest: any, options?: any) {
    return dest;
  }
}

class Readable extends Stream {
  private _readableState: any;
  private _read: any;

  constructor(options?: any) {
    super();
    this._readableState = {
      flowing: null,
      ended: false,
      endEmitted: false,
      reading: false,
      sync: true,
      needReadable: false,
      emittedReadable: false,
      readableListening: false,
      resumeScheduled: false,
      destroyed: false,
      defaultEncoding: 'utf8',
      awaitDrain: 0,
      readingMore: false,
      decoder: null,
      encoding: null
    };
    this._read = options?.read || (() => {});
  }

  push(chunk: any, encoding?: string) {
    return true;
  }

  unshift(chunk: any, encoding?: string) {
    return true;
  }

  isPaused() {
    return false;
  }

  setEncoding(encoding: string) {
    return this;
  }

  read(size?: number) {
    return null;
  }

  resume() {
    return this;
  }

  pause() {
    return this;
  }

  destroy(error?: Error) {
    return this;
  }
}

class Writable extends Stream {
  private _writableState: any;
  private _write: any;

  constructor(options?: any) {
    super();
    this._writableState = {
      objectMode: false,
      highWaterMark: 16384,
      finalCalled: false,
      needDrain: false,
      ending: false,
      ended: false,
      finished: false,
      destroyed: false,
      decodeStrings: true,
      defaultEncoding: 'utf8',
      length: 0,
      writing: false,
      corked: 0,
      sync: true,
      bufferProcessing: false,
      writecb: null,
      writelen: 0,
      bufferedRequest: null,
      lastBufferedRequest: null,
      pendingcb: 0,
      prefinished: false,
      errorEmitted: false,
      emitClose: true,
      autoDestroy: false,
      bufferedRequestCount: 0,
      corkedRequestsFree: null
    };
    this._write = options?.write || (() => {});
  }

  write(chunk: any, encoding?: string | Function, cb?: Function) {
    return true;
  }

  end(chunk?: any, encoding?: string | Function, cb?: Function) {
    return this;
  }

  cork() {
    return this;
  }

  uncork() {
    return this;
  }

  destroy(error?: Error) {
    return this;
  }
}

class Duplex extends Stream {
  private _readableState: any;
  private _writableState: any;
  private _read: any;
  private _write: any;

  constructor(options?: any) {
    super();
    this._readableState = {
      flowing: null,
      ended: false,
      endEmitted: false,
      reading: false,
      sync: true,
      needReadable: false,
      emittedReadable: false,
      readableListening: false,
      resumeScheduled: false,
      destroyed: false,
      defaultEncoding: 'utf8',
      awaitDrain: 0,
      readingMore: false,
      decoder: null,
      encoding: null
    };
    this._writableState = {
      objectMode: false,
      highWaterMark: 16384,
      finalCalled: false,
      needDrain: false,
      ending: false,
      ended: false,
      finished: false,
      destroyed: false,
      decodeStrings: true,
      defaultEncoding: 'utf8',
      length: 0,
      writing: false,
      corked: 0,
      sync: true,
      bufferProcessing: false,
      writecb: null,
      writelen: 0,
      bufferedRequest: null,
      lastBufferedRequest: null,
      pendingcb: 0,
      prefinished: false,
      errorEmitted: false,
      emitClose: true,
      autoDestroy: false,
      bufferedRequestCount: 0,
      corkedRequestsFree: null
    };
    this._read = options?.read || (() => {});
    this._write = options?.write || (() => {});
  }

  write(chunk: any, encoding?: string | Function, cb?: Function) {
    return true;
  }

  end(chunk?: any, encoding?: string | Function, cb?: Function) {
    return this;
  }

  read(size?: number) {
    return null;
  }
}

class Transform extends Duplex {
  private _transformState: any;
  private _transformFn: any;

  constructor(options?: any) {
    super(options);
    this._transformState = {
      afterTransform: () => {},
      needTransform: false,
      transforming: false,
      writecb: null,
      writechunk: null,
      writeencoding: null
    };
    this._transformFn = options?.transform || (() => {});
  }

  _transform(chunk: any, encoding: string, callback: Function) {
    callback();
  }

  _flush(callback: Function) {
    callback();
  }
}

// Export individual classes
export { Stream, Readable, Writable, Duplex, Transform };

// Also export as a default object for backward compatibility
const stream = {
  Stream,
  Readable,
  Writable,
  Duplex,
  Transform,
  PassThrough: Transform
};

export default stream; 