import React, { useState } from 'react';
import { Search, Filter, X, MapPin, Clock, Calendar } from 'lucide-react';

interface SearchAndFiltersProps {
  onSearch: (searchTerm: string) => void;
  onFilterChange: (filters: FilterOptions) => void;
  availableTypes: string[];
}

export interface FilterOptions {
  type: string;
  minPrice: number;
  maxPrice: number;
  date: string;
  time: string;
}

const SearchAndFilters: React.FC<SearchAndFiltersProps> = ({
  onSearch,
  onFilterChange,
  availableTypes
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    type: '',
    minPrice: 0,
    maxPrice: 0,
    date: '',
    time: ''
  });

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    onSearch(value);
  };

  const handleFilterChange = (key: keyof FilterOptions, value: string | number) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      type: '',
      minPrice: 0,
      maxPrice: 0,
      date: '',
      time: ''
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters = filters.type || filters.minPrice > 0 || filters.maxPrice > 0 || filters.date || filters.time;

  // Generate time options
  const timeOptions = [];
  for (let hour = 6; hour <= 22; hour++) {
    const time12 = hour > 12 ? `${hour - 12}:00 PM` : hour === 12 ? '12:00 PM' : `${hour}:00 AM`;
    timeOptions.push(time12);
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-8">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search cards by title, type, or location..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
          />
        </div>

        {/* Filter Toggle Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center px-4 py-3 border rounded-lg transition-colors duration-200 text-sm sm:text-base ${
            showFilters || hasActiveFilters
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-5 h-5 mr-2" />
          Filters
          {hasActiveFilters && (
            <span className="ml-2 bg-white text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
              !
            </span>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                <X className="w-4 h-4 mr-1" />
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sport Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">All Types</option>
                {availableTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                Date
              </label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => handleFilterChange('date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Time Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                Time
              </label>
              <select
                value={filters.time}
                onChange={(e) => handleFilterChange('time', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Any Time</option>
                {timeOptions.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Price (₹/hour)
              </label>
              <input
                type="number"
                value={filters.minPrice || ''}
                onChange={(e) => handleFilterChange('minPrice', parseInt(e.target.value) || 0)}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Price (₹/hour)
              </label>
              <input
                type="number"
                value={filters.maxPrice || ''}
                onChange={(e) => handleFilterChange('maxPrice', parseInt(e.target.value) || 0)}
                placeholder="Any"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap gap-2">
              {filters.type && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                  Type: {filters.type}
                  <button
                    onClick={() => handleFilterChange('type', '')}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.date && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                  Date: {new Date(filters.date).toLocaleDateString()}
                  <button
                    onClick={() => handleFilterChange('date', '')}
                    className="ml-2 text-purple-600 hover:text-purple-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.time && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800">
                  Time: {filters.time}
                  <button
                    onClick={() => handleFilterChange('time', '')}
                    className="ml-2 text-orange-600 hover:text-orange-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.minPrice > 0 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                  Min: ₹{filters.minPrice}
                  <button
                    onClick={() => handleFilterChange('minPrice', 0)}
                    className="ml-2 text-green-600 hover:text-green-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.maxPrice > 0 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                  Max: ₹{filters.maxPrice}
                  <button
                    onClick={() => handleFilterChange('maxPrice', 0)}
                    className="ml-2 text-green-600 hover:text-green-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchAndFilters;