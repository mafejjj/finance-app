export function formatCurrency(value: number, hideValues: boolean) {
  if (hideValues) return "R$ ••••••";

  return `R$ ${value.toFixed(2)}`;
}
