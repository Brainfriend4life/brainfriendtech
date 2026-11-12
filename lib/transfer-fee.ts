// Check Paystack's current transfer fees and adjust if they change.
export const USER_PAYS_FEE = true; // true: fee is taken from the withdrawal. false: you absorb it.

export function transferFee(amount: number): number {
  if (amount <= 5000) return 10;
  if (amount <= 50000) return 25;
  return 50;
}
