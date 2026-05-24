export const fmt = (value: number) => {
  const fractionDigits = Math.abs(value) > 0 && Math.abs(value) < 0.01 ? 6 : 2;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value);
};

export const truncateAddress = (address: string) =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;

export const formatTimeTick = (epochSeconds: number) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(epochSeconds * 1000));

export const formatUpdatedAt = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
