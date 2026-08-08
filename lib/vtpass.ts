import CryptoJS from "crypto-js";

export const vtpassConfig = {
  apiKey: process.env.VTPASS_API_KEY!,
  publicKey: process.env.VTPASS_PUBLIC_KEY!,
  secretKey: process.env.VTPASS_SECRET_KEY!,
  baseUrl: "https://sandbox.vtpass.com/api",
};

export function generateSignature(payload: string) {
  return CryptoJS.HmacSHA256(
    payload,
    vtpassConfig.secretKey
  ).toString(CryptoJS.enc.Hex);
}