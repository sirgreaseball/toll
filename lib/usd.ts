export const usd = (cents: number) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;
