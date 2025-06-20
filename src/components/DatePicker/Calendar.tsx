import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CalendarProps } from './types';
import { 
  getDaysInMonth, 
  getMonthDays, 
  isSameDay, 
  monthNames, 
  getMonthName,
  getYear,
  getFirstDayOfMonth
} from './dateUtils';

const Calendar: React.FC<CalendarProps> = ({
  selectedDate,
  currentDate,
  onDateSelect,
  onMonthChange,
}) => {
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const handlePrevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    onMonthChange(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    onMonthChange(newDate);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(parseInt(e.target.value));
    onMonthChange(newDate);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(parseInt(e.target.value));
    onMonthChange(newDate);
  };

  const goToToday = () => {
    onMonthChange(new Date());
  };

  const renderCalendarDays = () => {
    const today = new Date();
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const daysInMonth = getDaysInMonth(month, year);
    const firstDayOfMonth = getFirstDayOfMonth(month, year);
    
    const days = getMonthDays(month, year);
    
    return days.map((day, index) => {
      if (!day) {
        return <div key={`empty-${index}`} className="h-8 w-8" />;
      }
      
      const date = new Date(year, month, day);
      const isToday = isSameDay(date, today);
      const isSelected = selectedDate && isSameDay(date, selectedDate);
      const isCurrentMonth = date.getMonth() === month;
      
      return (
        <button
          key={`day-${day}-${month}`}
          onClick={() => onDateSelect(date)}
          className={`
            h-8 w-8 rounded-full flex items-center justify-center text-sm transition-all duration-200
            ${isCurrentMonth ? '' : 'text-gray-300'}
            ${isToday && !isSelected ? 'border border-blue-500' : ''}
            ${isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' : 'hover:bg-gray-100'}
            focus:outline-none focus:ring-2 focus:ring-blue-300
          `}
          aria-label={`${day} ${monthNames[month]} ${year}`}
          aria-selected={isSelected}
          type="button"
        >
          {day}
        </button>
      );
    });
  };

  // Generate years for selector (current year ± 10 years)
  const currentYear = getYear(currentDate);
  const years = [];
  for (let year = currentYear - 10; year <= currentYear + 10; year++) {
    years.push(year);
  }

  return (
    <div className="p-4 w-[280px]">
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-1">
          <select 
            value={currentDate.getMonth()} 
            onChange={handleMonthChange}
            className="appearance-none bg-white border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            aria-label="Select month"
          >
            {monthNames.map((month, index) => (
              <option key={month} value={index}>{month}</option>
            ))}
          </select>
          
          <select 
            value={currentDate.getFullYear()} 
            onChange={handleYearChange}
            className="appearance-none bg-white border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            aria-label="Select year"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center space-x-1">
          <button 
            onClick={handlePrevMonth} 
            className="p-1 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            onClick={handleNextMonth} 
            className="p-1 rounded-full hover:bg-gray-100 transition-colors duration-200"
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekdays.map(day => (
          <div key={day} className="h-8 flex items-center justify-center text-xs text-gray-500 font-medium">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {renderCalendarDays()}
      </div>
      
      <div className="mt-4 flex justify-between items-center">
        <button 
          onClick={goToToday}
          className="text-sm text-blue-500 hover:text-blue-700 transition-colors duration-200 underline"
          type="button"
        >
          Today
        </button>
      </div>
    </div>
  );
};

export default Calendar;