declare module 'readable-stream' {
  export class Readable {
    constructor(options?: any);
  }
  export class Writable {
    constructor(options?: any);
  }
  export class Transform {
    constructor(options?: any);
  }
  export class Duplex {
    constructor(options?: any);
  }
}

declare module 'stream-browserify' {
  const stream: any;
  export default stream;
}

declare module 'react-native-crypto' {
  const crypto: any;
  export default crypto;
}

declare module 'react-native-stream' {
  export class Readable {
    constructor(options?: any);
  }
  export class Writable {
    constructor(options?: any);
  }
  export class Transform {
    constructor(options?: any);
  }
  export class Duplex {
    constructor(options?: any);
  }
}

declare module 'react-native-https' {
  const https: any;
  export default https;
}

declare module 'react-native-crypto-js' {
  const CryptoJS: any;
  export default CryptoJS;
}

declare module './stream-module' {
  const stream: {
    Stream: any;
    Readable: any;
    Writable: any;
    Duplex: any;
    Transform: any;
    PassThrough: any;
    finished: () => void;
    pipeline: () => void;
    addAbortSignal: () => void;
    getDefaultHighWaterMark: () => number;
    isDisturbed: () => boolean;
    isErrored: () => boolean;
    isReadable: () => boolean;
    isWritable: () => boolean;
    isDuplex: () => boolean;
    isReadableStream: () => boolean;
    isWritableStream: () => boolean;
    isDuplexStream: () => boolean;
    isTransformStream: () => boolean;
    isPassThroughStream: () => boolean;
    isFinished: () => boolean;
    isPipeline: () => boolean;
    isAddAbortSignal: () => boolean;
    isGetDefaultHighWaterMark: () => boolean;
  };
  export default stream;
}

declare global {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
  }
  
  interface ProcessVersions {
    http_parser: string;
    node: string;
    v8: string;
    ares: string;
    uv: string;
    zlib: string;
    modules: string;
    nghttp2: string;
  }

  // Add stream module to global
  var stream: any;
  var Stream: any;
  var WebSocket: any;
  var https: any;
  var crypto: any;
} 