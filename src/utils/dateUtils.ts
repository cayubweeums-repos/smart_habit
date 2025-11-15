/**
 * Format a date to YYYY-MM-DD string
 */
export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date key
 */
export function getTodayKey(): string {
  return formatDateKey(new Date());
}

/**
 * Parse a date key (YYYY-MM-DD) to Date object
 */
export function parseDateKey(dateKey: string): Date {
  return new Date(dateKey + 'T00:00:00');
}

/**
 * Get date X days ago from today
 */
export function getDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDateKey(date);
}

/**
 * Get date X days from now
 */
export function getDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

/**
 * Format date to display string (e.g., "Jan 15, 2024")
 */
export function formatDisplayDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseDateKey(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format date to short display string (e.g., "Jan 15")
 */
export function formatShortDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseDateKey(date) : date;
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get day of week name
 */
export function getDayOfWeek(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseDateKey(date) : date;
  return dateObj.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Check if a date key is today
 */
export function isToday(dateKey: string): boolean {
  return dateKey === getTodayKey();
}

/**
 * Get array of date keys for a range
 */
export function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = parseDateKey(startDate);
  const end = parseDateKey(endDate);
  
  while (current <= end) {
    dates.push(formatDateKey(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * Get the start and end dates for the last N days
 */
export function getLastNDaysRange(days: number): { startDate: string; endDate: string } {
  return {
    startDate: getDaysAgo(days - 1),
    endDate: getTodayKey(),
  };
}

