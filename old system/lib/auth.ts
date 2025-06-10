import { verify } from 'jsonwebtoken';

export function verifyToken(token: string) {
  try {
    return verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
      type: string;
    };
  } catch (error) {
    throw new Error('Invalid token');
  }
}