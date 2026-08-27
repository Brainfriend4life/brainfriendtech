import { hash, compare } from "bcryptjs";


export async function hashTransactionPin(
  pin: string
) {
  return await hash(pin, 10);
}


export async function verifyTransactionPin(
  pin: string,
  hashedPin: string
) {
  return await compare(pin, hashedPin);
}


export function validateTransactionPin(
  pin: string
) {
  return /^\d{4,6}$/.test(pin);
}