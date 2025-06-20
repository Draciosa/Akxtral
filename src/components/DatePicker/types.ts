export interface DatePickerProps {
  selectedDate: Date | null;
  onChange: (date: Date) => void;
  format?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export interface CalendarProps {
  selectedDate: Date | null;
  currentDate: Date;
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
}

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}