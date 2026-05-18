export function formatCurrency(
  amount: number | null | undefined,
  currency = "USD",
) {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return "Estimate unavailable";
  }

  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
