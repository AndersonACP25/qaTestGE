import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { HttpError } from "../http-error.js";

let deriving = 0;
async function derive(password: string, salt: string): Promise<Buffer> {
  if (deriving >= 2)
    throw new HttpError(
      429,
      "AUTH_BUSY",
      "Hay varios accesos en curso. Intenta de nuevo en unos segundos.",
    );
  deriving++;
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      scrypt(
        password,
        salt,
        64,
        { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
        (error, key) => (error ? reject(error) : resolve(key)),
      );
    });
  } finally {
    deriving--;
  }
}
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt);
  return `scrypt-v1$${salt}$${key.toString("hex")}`;
}
export async function verifyPassword(
  password: string,
  encoded: string | undefined,
): Promise<boolean> {
  const match = /^scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(encoded ?? "");
  // Same derivation cost for unknown accounts and malformed hashes.
  const key = await derive(password, match?.[1] ?? "0".repeat(32));
  const equal = timingSafeEqual(key, Buffer.from(match?.[2] ?? "0".repeat(128), "hex"));
  return Boolean(match) && equal;
}
