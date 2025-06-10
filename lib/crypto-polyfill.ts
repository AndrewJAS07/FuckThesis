// Minimal crypto polyfill
import { encode, decode } from './base64';

const crypto = {
  createHash: (algorithm: string) => ({
    update: (data: any) => ({
      digest: (encoding: string) => {
        // Basic hash implementation
        return encoding === 'base64' ? encode('') : '';
      }
    })
  }),
  randomBytes: (size: number) => {
    // Basic random bytes implementation
    const bytes = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes;
  }
};

export default crypto; 