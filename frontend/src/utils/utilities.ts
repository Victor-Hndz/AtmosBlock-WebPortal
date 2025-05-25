export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function extractMonthNumber(monthName: string): string {
  const monthIndex = new Date(Date.parse(monthName + " 1, 2020")).getMonth();
  return monthIndex >= 0 ? String(monthIndex + 1) : "-1"; // January = "1", December = "12"
}

export function extractMonthNames(monthNumbers: string[]): string[] {
  return monthNumbers.map(month => {
    const monthIndex = parseInt(month, 10) - 1;
    if (monthIndex < 0 || monthIndex > 11) return "Invalid Month";
    return new Date(2020, monthIndex).toLocaleString("en", { month: "long" });
  });
}
