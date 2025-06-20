import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Check, X, Users } from 'lucide-react';
import { doc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';

type CardData = {
  id: string;
  title: string;
  imageUrl: string;
  type: string;
  openingTime: string;
  closingTime: string;
  userId: string;
  createdAt: any;
  Card_ID: string;
};

type TimeSlot = {
  time: string;
  available: boolean;
};

type Booking = {
  userId: string;
  cardId: string;
  Card_ID: string;
  date: string;
  timeSlot: string;
  bookingTime: Date;
  openSlots?: number;
};

const BookingCalendar: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedOpenSlots, setSelectedOpenSlots] = useState<number>(0);

  // Generate time slots from opening to closing time
  const generateTimeSlots = (openingTime: string, closingTime: string): string[] => {
    const slots: string[] = [];
    
    // Convert time strings to 24-hour format for easier calculation
    const parseTime = (timeStr: string): number => {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let hour24 = hours;
      
      if (period?.toUpperCase() === 'PM' && hours !== 12) {
        hour24 += 12;
      } else if (period?.toUpperCase() === 'AM' && hours === 12) {
        hour24 = 0;
      }
      
      return hour24 * 60 + (minutes || 0);
    };

    const formatTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
    };

    const startMinutes = parseTime(openingTime);
    const endMinutes = parseTime(closingTime);
    
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 60) {
      slots.push(formatTime(minutes));
    }
    
    return slots;
  };

  // Format date to YYYY-MM-DD in local timezone
  const formatDateForStorage = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Check which time slots are already booked
  const checkAvailability = async (date: Date, cardId: string) => {
    const dateString = formatDateForStorage(date);
    console.log('Checking availability for date:', dateString); // Debug log
    
    const q = query(
      collection(db, 'bookings'),
      where('cardId', '==', cardId),
      where('date', '==', dateString)
    );
    
    const querySnapshot = await getDocs(q);
    const bookedSlots = querySnapshot.docs.map(doc => {
      const data = doc.data();
      console.log('Found booking:', data); // Debug log
      return data.timeSlot;
    });
    
    console.log('Booked slots for', dateString, ':', bookedSlots); // Debug log
    return bookedSlots;
  };

  useEffect(() => {
    const fetchCard = async () => {
      if (!id) {
        setError('Card ID not provided');
        setLoading(false);
        return;
      }

      try {
        const cardDoc = await getDoc(doc(db, 'cards', id));
        
        if (cardDoc.exists()) {
          const cardData = {
            id: cardDoc.id,
            ...cardDoc.data()
          } as CardData;
          setCard(cardData);
        } else {
          setError('Card not found');
        }
      } catch (err) {
        console.error('Error fetching card:', err);
        setError('Failed to load card details');
      } finally {
        setLoading(false);
      }
    };

    fetchCard();
  }, [id]);

  useEffect(() => {
    const updateTimeSlots = async () => {
      if (selectedDate && card && card.openingTime && card.closingTime) {
        const allSlots = generateTimeSlots(card.openingTime, card.closingTime);
        const bookedSlots = await checkAvailability(selectedDate, card.id);
        
        const slotsWithAvailability = allSlots.map(slot => ({
          time: slot,
          available: !bookedSlots.includes(slot)
        }));
        
        setTimeSlots(slotsWithAvailability);
      }
    };

    updateTimeSlots();
  }, [selectedDate, card]);

  const handleDateSelect = (date: Date) => {
    console.log('Selected date:', date, 'Formatted:', formatDateForStorage(date)); // Debug log
    setSelectedDate(date);
    setSelectedTimeSlots([]);
    setError('');
    setSuccess('');
  };

  const handleTimeSlotToggle = (timeSlot: string) => {
    setSelectedTimeSlots(prev => {
      if (prev.includes(timeSlot)) {
        return prev.filter(slot => slot !== timeSlot);
      } else {
        return [...prev, timeSlot];
      }
    });
  };

  const handleConfirmBooking = async () => {
    if (!user) {
      setError('Please log in to make a booking');
      return;
    }

    if (!selectedDate || selectedTimeSlots.length === 0) {
      setError('Please select a date and at least one time slot');
      return;
    }

    if (!card) {
      setError('Card information not available');
      return;
    }

    setBookingLoading(true);
    setError('');

    try {
      const dateString = formatDateForStorage(selectedDate);
      console.log('Storing booking for date:', dateString); // Debug log
      
      // Create bookings for each selected time slot
      const bookingPromises = selectedTimeSlots.map(timeSlot => {
        const bookingData: any = {
          userId: user.uid,
          cardId: card.id,
          Card_ID: card.Card_ID,
          date: dateString,
          timeSlot: timeSlot,
          bookingTime: new Date()
        };

        // Add open slots if selected
        if (selectedOpenSlots > 0) {
          bookingData.openSlots = selectedOpenSlots;
        }

        console.log('Creating booking:', bookingData); // Debug log
        return addDoc(collection(db, 'bookings'), bookingData);
      });

      await Promise.all(bookingPromises);
      
      setSuccess(`Successfully booked ${selectedTimeSlots.length} time slot${selectedTimeSlots.length > 1 ? 's' : ''} for ${selectedDate.toLocaleDateString()}${selectedOpenSlots > 0 ? ` with ${selectedOpenSlots} open slots` : ''}`);
      setSelectedTimeSlots([]);
      setSelectedOpenSlots(0);
      
      // Refresh time slots to show updated availability
      const bookedSlots = await checkAvailability(selectedDate, card.id);
      const allSlots = generateTimeSlots(card.openingTime, card.closingTime);
      const slotsWithAvailability = allSlots.map(slot => ({
        time: slot,
        available: !bookedSlots.includes(slot)
      }));
      setTimeSlots(slotsWithAvailability);
      
    } catch (err) {
      console.error('Error creating booking:', err);
      setError('Failed to create booking. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const renderCalendar = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-12 w-12" />);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
      const isPast = date < today && !isToday;
      
      days.push(
        <button
          key={day}
          onClick={() => !isPast && handleDateSelect(date)}
          disabled={isPast}
          className={`
            h-12 w-12 rounded-lg flex items-center justify-center text-sm transition-all duration-200
            ${isPast ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-blue-100'}
            ${isToday && !isSelected ? 'border-2 border-blue-500' : ''}
            ${isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
            ${!isPast && !isSelected ? 'hover:bg-gray-100' : ''}
          `}
        >
          {day}
        </button>
      );
    }
    
    return days;
  };

  const SlotPicker = () => {
    const slotOptions = [1, 2, 3, 4, 5, 6, 7, 8];
    
    return (
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2 text-blue-600" />
          Slots open for other players (Optional)
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Select how many slots you want to keep open for other players to join your game
        </p>
        
        <div className="grid grid-cols-4 gap-3">
          {slotOptions.map(num => (
            <button
              key={num}
              onClick={() => setSelectedOpenSlots(selectedOpenSlots === num ? 0 : num)}
              className={`
                p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center space-y-2
                ${selectedOpenSlots === num 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }
              `}
            >
              <div className="flex space-x-1">
                {Array.from({ length: num }, (_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${
                      selectedOpenSlots === num ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="font-medium">{num}</span>
            </button>
          ))}
        </div>
        
        {selectedOpenSlots > 0 && (
          <div className="mt-4 p-3 bg-blue-100 rounded-lg">
            <p className="text-blue-800 text-sm">
              <strong>{selectedOpenSlots} slots</strong> will be available for other players to join your game
            </p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error && !card) {
    return (
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/')}
          className="mb-6 inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to home
        </button>
        <div className="text-center bg-white rounded-xl shadow-lg p-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (!card) return null;

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => navigate(`/card/${id}`)}
        className="mb-6 inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200 font-medium"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to card details
      </button>

      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Book {card.title}</h1>
          <p className="text-gray-600">Select a date and time slots for your booking</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Calendar Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Select Date
            </h2>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-medium">{monthNames[new Date().getMonth()]} {new Date().getFullYear()}</h3>
              </div>
              
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekdays.map(day => (
                  <div key={day} className="h-8 flex items-center justify-center text-xs text-gray-500 font-medium">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {renderCalendar()}
              </div>
            </div>
          </div>

          {/* Time Slots Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Select Time Slots
            </h2>
            
            {!selectedDate ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <p className="text-gray-500">Please select a date first</p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Selected date: <span className="font-medium">{selectedDate.toLocaleDateString()}</span>
                  </p>
                  {selectedTimeSlots.length > 0 && (
                    <p className="text-sm text-blue-600 mt-1">
                      {selectedTimeSlots.length} slot{selectedTimeSlots.length > 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {timeSlots.map(slot => (
                    <button
                      key={slot.time}
                      onClick={() => slot.available && handleTimeSlotToggle(slot.time)}
                      disabled={!slot.available}
                      className={`
                        p-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-between
                        ${!slot.available 
                          ? 'bg-red-100 text-red-400 cursor-not-allowed' 
                          : selectedTimeSlots.includes(slot.time)
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-white text-gray-700 hover:bg-blue-50 border border-gray-200'
                        }
                      `}
                    >
                      <span>{slot.time}</span>
                      {!slot.available && <X className="w-4 h-4" />}
                      {slot.available && selectedTimeSlots.includes(slot.time) && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
                
                {timeSlots.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No time slots available</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Slot Picker */}
        {selectedDate && selectedTimeSlots.length > 0 && <SlotPicker />}

        {/* Booking Summary and Confirm Button */}
        {selectedDate && selectedTimeSlots.length > 0 && (
          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Booking Summary</h3>
            <div className="space-y-2 mb-6">
              <p><span className="font-medium">Card:</span> {card.title}</p>
              <p><span className="font-medium">Date:</span> {selectedDate.toLocaleDateString()}</p>
              <p><span className="font-medium">Time Slots:</span> {selectedTimeSlots.join(', ')}</p>
              <p><span className="font-medium">Total Slots:</span> {selectedTimeSlots.length}</p>
              {selectedOpenSlots > 0 && (
                <p><span className="font-medium">Open Slots for Others:</span> {selectedOpenSlots}</p>
              )}
            </div>
            
            <button
              onClick={handleConfirmBooking}
              disabled={bookingLoading || !user}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
            >
              {bookingLoading ? 'Confirming Booking...' : 'Confirm Booking'}
            </button>
            
            {!user && (
              <p className="text-center text-red-600 text-sm mt-2">
                Please log in to make a booking
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingCalendar;