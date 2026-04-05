import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "../config.js";

export function signAccessToken(userId: string): string {
  const options: SignOptions = {
    expiresIn: config.jwtExpiresIn as SignOptions["expiresIn"],
  };
  return jwt.sign({ sub: userId }, config.jwtSecret, options);
}
