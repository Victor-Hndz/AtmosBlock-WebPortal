export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function extractMonthNumber(monthName: string): string {
  const monthIndex = new Date(Date.parse(monthName + " 1, 2020")).getMonth();
  return monthIndex >= 0 ? String(monthIndex + 1) : "-1"; // January = "1", December = "12"
}
