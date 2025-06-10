// Pure JavaScript base64 implementation
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

export const encode = (data: string): string => {
  const str = String(data);
  let output = '';
  let chr1, chr2, chr3, enc1, enc2, enc3, enc4;
  let i = 0;

  while (i < str.length) {
    chr1 = str.charCodeAt(i++);
    chr2 = str.charCodeAt(i++);
    chr3 = str.charCodeAt(i++);

    enc1 = chr1 >> 2;
    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
    enc4 = chr3 & 63;

    if (isNaN(chr2)) {
      enc3 = enc4 = 64;
    } else if (isNaN(chr3)) {
      enc4 = 64;
    }

    output = output +
      chars.charAt(enc1) + chars.charAt(enc2) +
      chars.charAt(enc3) + chars.charAt(enc4);
  }

  return output;
};

export const decode = (data: string): string => {
  const str = String(data).replace(/[=]+$/, '');
  let output = '';
  let chr1, chr2, chr3;
  let enc1, enc2, enc3, enc4;
  let i = 0;

  while (i < str.length) {
    enc1 = chars.indexOf(str.charAt(i++));
    enc2 = chars.indexOf(str.charAt(i++));
    enc3 = chars.indexOf(str.charAt(i++));
    enc4 = chars.indexOf(str.charAt(i++));

    chr1 = (enc1 << 2) | (enc2 >> 4);
    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    chr3 = ((enc3 & 3) << 6) | enc4;

    output = output + String.fromCharCode(chr1);

    if (enc3 !== 64) {
      output = output + String.fromCharCode(chr2);
    }
    if (enc4 !== 64) {
      output = output + String.fromCharCode(chr3);
    }
  }

  return output;
};

export const encodeBuffer = (data: Uint8Array): string => {
  let str = '';
  for (let i = 0; i < data.length; i++) {
    str += String.fromCharCode(data[i]);
  }
  return encode(str);
};

export const decodeToBuffer = (data: string): Uint8Array => {
  const str = decode(data);
  const buffer = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    buffer[i] = str.charCodeAt(i);
  }
  return buffer;
}; 