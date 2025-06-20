import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import Calendar from './Calendar';
import { formatDate, parseDate, isValidDate } from './dateUtils';
import { DatePickerProps } from './types';

const DatePicker: React.FC<DatePickerProps> = ({
  selectedDate,
  onChange,
  format = 'MM/dd/yyyy',
  placeholder = 'Select a date',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [currentDate, setCurrentDate] = useState(selectedDate || new Date());
  const datePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedDate) {
      setInputValue(formatDate(selectedDate, format));
      setCurrentDate(selectedDate);
    } else {
      setInputValue('');
    }
  }, [selectedDate, format]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const date = parseDate(value, format);
    if (isValidDate(date)) {
      onChange(date);
    }
  };

  const handleDateSelect = (date: Date) => {
    onChange(date);
    setInputValue(formatDate(date, format));
    setIsOpen(false);
  };

  const toggleCalendar = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
    if (e.key === 'Enter' || e.key === ' ') {
      toggleCalendar();
    }
  };

  return (
    <div 
      ref={datePickerRef} 
      className={`relative inline-block ${className}`}
      onKeyDown={handleKeyDown}
    >
      <div className="relative">
        <input
          type="text"
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
            disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'cursor-pointer'
          }`}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onClick={toggleCalendar}
          readOnly={disabled}
          disabled={disabled}
          aria-label="Date"
          aria-haspopup="true"
          aria-expanded={isOpen}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
          <CalendarIcon size={18} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-10 transform origin-top transition-all duration-200 ease-in-out animate-in fade-in">
          <Calendar
            selectedDate={selectedDate}
            currentDate={currentDate}
            onDateSelect={handleDateSelect}
            onMonthChange={setCurrentDate}
          />
        </div>
      )}
    </div>
  );
};

export default DatePicker;