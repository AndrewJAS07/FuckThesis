// First ensure process is defined as it's needed by other polyfills
if (typeof (global as any).process === 'undefined') {
  (global as any).process = {
    env: {
      NODE_ENV: 'development'
    },
    nextTick: (cb: Function) => setTimeout(cb, 0),
    browser: true,
    versions: {
      http_parser: '2.9.3',
      node: '16.0.0',
      v8: '9.0.0',
      ares: '1.17.0',
      uv: '1.41.0',
      zlib: '1.2.11',
      modules: '93',
      nghttp2: '1.42.0'
    }
  };
}

// Import base polyfills
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';

// Import and set up WebSocket
import './websocket-polyfill';

// Import stream polyfill
import streamModule from './stream-module';

// Set up stream module with safety checks
if (typeof (global as any).stream === 'undefined') {
  const { EventEmitter, Stream, Readable, Writable, Transform, Duplex, PassThrough } = streamModule;
  
  // First set up EventEmitter
  (global as any).EventEmitter = EventEmitter;
  
  // Then set up stream components
  (global as any).stream = streamModule;
  (global as any).Stream = Stream;
  (global as any).Readable = Readable;
  (global as any).Writable = Writable;
  (global as any).Transform = Transform;
  (global as any).Duplex = Duplex;
  (global as any).PassThrough = PassThrough;
}

// Import and set up crypto
import crypto from './crypto-polyfill';
if (typeof (global as any).crypto === 'undefined') {
  (global as any).crypto = crypto;
}

// Import and set up https
import https from './https-polyfill';
if (typeof (global as any).https === 'undefined') {
  (global as any).https = https;
}

// Import base64 utilities
import { encode, decode, encodeBuffer, decodeToBuffer } from './base64';

// Set up base64 utilities
if (typeof (global as any).base64 === 'undefined') {
  (global as any).base64 = {
    encode,
    decode,
    encodeBuffer,
    decodeToBuffer
  };
}

// Ensure Buffer is defined
if (typeof (global as any).Buffer === 'undefined') {
  (global as any).Buffer = require('buffer').Buffer;
}

// Export all polyfills
export {
  streamModule as stream,
  crypto,
  https
};

// Export base64 utilities separately
export const base64 = {
  encode,
  decode,
  encodeBuffer,
  decodeToBuffer
};

// Add any other polyfills here
export {}; 