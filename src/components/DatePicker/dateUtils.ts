// Date utility functions

export const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const getMonthName = (date: Date): string => {
  return monthNames[date.getMonth()];
};

export const getYear = (date: Date): number => {
  return date.getFullYear();
};

export const getDaysInMonth = (month: number, year: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

export const getFirstDayOfMonth = (month: number, year: number): number => {
  return new Date(year, month, 1).getDay();
};

export const getMonthDays = (month: number, year: number): (number | null)[] => {
  const daysInMonth = getDaysInMonth(month, year);
  const firstDayOfMonth = getFirstDayOfMonth(month, year);
  
  const days: (number | null)[] = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }
  
  // Fill the remainder of the grid (to make it a multiple of 7)
  const remainingCells = 7 - (days.length % 7);
  if (remainingCells < 7) {
    for (let i = 0; i < remainingCells; i++) {
      days.push(null);
    }
  }
  
  return days;
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
};

export const formatDate = (date: Date, format: string): string => {
  const day = date.getDate();
  const month = date.getMonth() + 1; // Months are 0-based
  const year = date.getFullYear();
  
  // Basic formatting patterns
  return format
    .replace('yyyy', year.toString())
    .replace('MM', month.toString().padStart(2, '0'))
    .replace('dd', day.toString().padStart(2, '0'))
    .replace('M', month.toString())
    .replace('d', day.toString());
};

export const parseDate = (dateString: string, format: string): Date | null => {
  // This is a simplified version - a real implementation would be more robust
  try {
    // Check for MM/DD/YYYY format
    if (format === 'MM/dd/yyyy') {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[0], 10) - 1; // Months are 0-based
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        
        const date = new Date(year, month, day);
        if (isValidDate(date)) {
          return date;
        }
      }
    }
    
    // Other formats can be added here
    return null;
  } catch (e) {
    return null;
  }
};

export const isValidDate = (date: any): date is Date => {
  return date instanceof Date && !isNaN(date.getTime());
};