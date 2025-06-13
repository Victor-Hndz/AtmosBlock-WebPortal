/**
 * Constants related to requests
 * Contains options for form fields, steps, and other request-related configurations
 */

/**
 * Tab order for the multi-step form
 */
export const REQUEST_FORM_STEPS = ["basicInfo", "mapConfig", "additionalSettings", "summary"];

/**
 * Available variable names for selection
 */
export const VARIABLE_NAME_OPTIONS = ["geopotential", "temperature"];

/**
 * Available pressure levels for selection
 */
export const PRESSURE_LEVELS = ["1000", "850", "500", "300", "100", "10"];

/**
 * Available pressure levels for advanced selection
 * Ordered in descending numerical value
 */
export const PRESSURE_LEVELS_ADVANCED = [...PRESSURE_LEVELS, "900", "700", "550", "200", "50"].sort((a, b) => {
  const numA = parseInt(a);
  const numB = parseInt(b);
  return numB - numA;
});

/**
 * Available years for selection
 * From 2000 to the previous year (actual year - 1)
 */
export const AVAILABLE_YEARS = Array.from({ length: new Date().getFullYear() - 2000 }, (_, i) => `${2000 + i}`);

/**
 * Available years for advanced selection
 * From 1940 to the previous year (actual year - 1)
 */
export const AVAILABLE_YEARS_ADVANCED = Array.from(
  { length: new Date().getFullYear() - 1940 },
  (_, i) => `${1940 + i}`
);

/**
 * Available months for selection
 */
export const AVAILABLE_MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/**
 * Get the month number (0-11) from the month name
 * @param monthName - The name of the month
 * @returns The month number (0-11)
 */
export const getMonthNumber = (monthName: string): number => {
  return AVAILABLE_MONTHS.findIndex(month => month === monthName);
};

/**
 * Available days for selection
 * @param year - The year to get days for
 * @param month - The month to get days for (0-11)
 * @returns Array of days as strings
 */
export const AVAILABLE_DAYS = (year: number, month: number) => {
  return Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => `${i + 1}`);
};

/**
 * Calculate days available based on selected years and months
 * @param selectedYears - Array of selected years as strings
 * @param selectedMonths - Array of selected month names
 * @returns Array of available days as strings
 */
export const calculateAvailableDays = (selectedYears: string[], selectedMonths: string[]): string[] => {
  // If no years or months are selected, return empty array
  if (!selectedYears.length || !selectedMonths.length) {
    return [];
  }

  // If exactly one year and one month selected, return days for that specific month/year
  if (selectedYears.length === 1 && selectedMonths.length === 1) {
    const year = parseInt(selectedYears[0]);
    const monthIndex = getMonthNumber(selectedMonths[0]);
    return AVAILABLE_DAYS(year, monthIndex);
  }

  // Otherwise, find all possible days across the selected years and months
  const allDays = new Set<string>();

  // Calculate the maximum number of days in each selected month across all selected years
  selectedMonths.forEach(monthName => {
    const monthIndex = getMonthNumber(monthName);

    // Find the maximum number of days this month can have across all selected years
    let maxDays = 0;

    selectedYears.forEach(yearStr => {
      const year = parseInt(yearStr);
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
      maxDays = Math.max(maxDays, daysInMonth);
    });

    // Add all possible days up to the maximum
    for (let i = 1; i <= maxDays; i++) {
      allDays.add(String(i));
    }
  });

  // Convert the Set to Array and sort numerically
  return Array.from(allDays).sort((a, b) => parseInt(a) - parseInt(b));
};

/**
 * Available hours for selection
 */
export const AVAILABLE_HOURS = Array.from({ length: 24 }, (_, i) => i.toString());

/**
 * Available map types for selection
 */
export const MAP_TYPES = ["cont", "disp", "comb", "forms"];

/**
 * Available map areas for selection
 */
export const MAP_AREAS = ["North", "South", "East", "West"];

/**
 * Available map levels for selection
 */
export const MAP_LEVELS = ["10", "15", "20", "25", "30"];

/**
 * Available file formats for selection
 */
export const FILE_FORMAT_OPTIONS = ["svg", "png", "jpg", "jpeg", "pdf"];

/**
 * Toast duration in milliseconds
 */
export const TOAST_DURATION = 3000;
