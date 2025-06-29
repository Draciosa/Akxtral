import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Check, X, Users, ChevronLeft, ChevronRight } from 'lucide-react';
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
  pricePerHour: number;
  location: string;
  description: string;
  userId: string;
  assignedHost?: string;
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
  perSlotPrice?: number;
};

const BookingCalendar: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole, userProfile } = useAuth();
  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedOpenSlots, setSelectedOpenSlots] = useState<number>(0);
  const [perSlotPrice, setPerSlotPrice] = useState<number>(0);
  const [currentMonth, setCurrentMonth] = useState(new Date());

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
    let endMinutes = parseTime(closingTime);
    
    // Handle overnight venues (e.g., 4 AM to 2 AM next day)
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60; // Add 24 hours
    }
    
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 60) {
      const actualMinutes = minutes % (24 * 60); // Handle overflow past midnight
      slots.push(formatTime(actualMinutes));
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
    console.log('Checking availability for date:', dateString);
    
    const q = query(
      collection(db, 'bookings'),
      where('cardId', '==', cardId),
      where('date', '==', dateString)
    );
    
    const querySnapshot = await getDocs(q);
    const bookedSlots = querySnapshot.docs.map(doc => {
      const data = doc.data();
      console.log('Found booking:', data);
      return data.timeSlot;
    });
    
    console.log('Booked slots for', dateString, ':', bookedSlots);
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
    console.log('Selected date:', date, 'Formatted:', formatDateForStorage(date));
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

  const canUserBookCard = (): boolean => {
    if (!user || !card) return false;
    
    // Admins cannot book cards
    if (hasRole('admin')) return false;
    
    // Users can book any card
    if (hasRole('user')) return true;
    
    // Hosts can book cards except their own assigned cards
    if (hasRole('host')) {
      return card.assignedHost !== user.uid;
    }
    
    return false;
  };

  const getBookingErrorMessage = (): string => {
    if (!user) return 'Please log in to make a booking';
    if (hasRole('admin')) return 'Admins cannot book cards';
    if (hasRole('host') && card?.assignedHost === user.uid) {
      return 'You cannot book your own assigned card';
    }
    return 'You do not have permission to book this card';
  };

  const handleConfirmBooking = async () => {
    console.log("🔥 handleConfirmBooking called");

    if (!user) {
      console.warn("❌ No user logged in");
      setError('Please log in to make a booking');
      return;
    }

    if (!canUserBookCard()) {
      console.warn("❌ User not allowed to book card", { user, card });
      setError(getBookingErrorMessage());
      return;
    }

    if (!selectedDate || selectedTimeSlots.length === 0) {
      console.warn("❌ Date or time slot not selected");
      setError('Please select a date and at least one time slot');
      return;
    }

    if (!card) {
      console.warn("❌ Card data not loaded");
      setError('Card information not available');
      return;
    }

    // Validate per slot price if open slots are selected
    if (selectedOpenSlots > 0 && perSlotPrice <= 0) {
      setError('Please set a valid price per slot for open slots');
      return;
    }

    setBookingLoading(true);
    setError('');

    try {
      const dateString = formatDateForStorage(selectedDate);
      console.log('Storing booking for date:', dateString);
      
      // Calculate total amount
      const totalAmount = selectedTimeSlots.length * (card.pricePerHour || 0);
      
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
          bookingData.perSlotPrice = perSlotPrice;
        }

        console.log("📦 Booking payload being sent to Firestore:", bookingData);

        return addDoc(collection(db, 'bookings'), bookingData);
      });

      const bookingResults = await Promise.all(bookingPromises);
      
      // Get the first booking ID for the receipt
      const firstBookingId = bookingResults[0].id;

      // Notify assigned host if card has one
      if (card.assignedHost) {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: card.assignedHost,
            type: 'card_booked',
            title: 'Your card has been booked!',
            message: `${userProfile?.displayName || user.email} has booked your card "${card.title}" on ${formatDate(selectedDate)} at ${selectedTimeSlots.join(', ')}${selectedOpenSlots > 0 ? ` with ${selectedOpenSlots} open slots at ₹${perSlotPrice} per slot` : ''}`,
            bookingId: firstBookingId,
            bookedByUserId: user.uid,
            bookedByEmail: user.email,
            bookedByDisplayName: userProfile?.displayName || '',
            bookedByPhoneNumber: userProfile?.phoneNumber || '',
            cardTitle: card.title,
            bookingDate: dateString,
            bookingTimeSlots: selectedTimeSlots,
            openSlots: selectedOpenSlots,
            perSlotPrice: perSlotPrice,
            read: false,
            createdAt: new Date()
          });
        } catch (notificationError) {
          console.error('Error creating notification for assigned host:', notificationError);
          // Don't fail the booking if notification fails
        }
      }
      
      setSuccess(`Successfully booked ${selectedTimeSlots.length} time slot${selectedTimeSlots.length > 1 ? 's' : ''} for ${selectedDate.toLocaleDateString()}${selectedOpenSlots > 0 ? ` with ${selectedOpenSlots} open slots at ₹${perSlotPrice} per slot` : ''}`);
      
      // Redirect to receipt page
      navigate(`/receipt/${firstBookingId}`);
      
    } catch (err) {
      console.error('Error creating booking:', err);
      setError('Failed to create booking. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderCalendar = () => {
    const today = new Date();
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10 sm:h-12 sm:w-12" />);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === today.toDateString();
      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
      const isPast = date < today && !isToday;
      
      days.push(
        <button
          key={day}
          onClick={() => !isPast && handleDateSelect(date)}
          disabled={isPast}
          className={`
            h-10 w-10 sm:h-12 sm:w-12 rounded-lg flex items-center justify-center text-sm transition-all duration-200
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

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const SlotPicker = () => {
    const slotOptions = [1, 2, 3, 4, 5, 6, 7, 8];
    
    return (
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 sm:p-6 mb-6 border border-blue-200">
        <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center text-blue-800">
          <Users className="w-5 h-5 mr-2 text-blue-600" />
          Slots Open for Other Players (Optional)
        </h3>
        <p className="text-xs sm:text-sm text-blue-700 mb-4">
          Select how many slots you want to keep open for other players to join your game
        </p>
        
        <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-4">
          {slotOptions.map(num => (
            <button
              key={num}
              onClick={() => setSelectedOpenSlots(selectedOpenSlots === num ? 0 : num)}
              className={`
                p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 flex flex-col items-center space-y-2
                ${selectedOpenSlots === num 
                  ? 'border-blue-500 bg-blue-100 text-blue-700 shadow-md' 
                  : 'border-gray-200 hover:border-blue-300 text-gray-600 hover:bg-white'
                }
              `}
            >
              <div className="flex space-x-1">
                {Array.from({ length: num }, (_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                      selectedOpenSlots === num ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="font-medium text-xs sm:text-sm">{num}</span>
            </button>
          ))}
        </div>

        {/* Per Slot Price Input */}
        {selectedOpenSlots > 0 && (
          <div className="mt-4 p-3 sm:p-4 bg-white rounded-lg border border-blue-200">
            <label className="block text-xs sm:text-sm font-medium text-blue-800 mb-2">
              Price Per Slot (₹) *
            </label>
            <input
              type="number"
              value={perSlotPrice || ''}
              onChange={(e) => setPerSlotPrice(parseFloat(e.target.value) || 0)}
              onFocus={(e) => e.target.select()}
              placeholder="Enter price per slot"
              min="1"
              step="1"
              required
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            />
            <p className="text-blue-700 text-xs sm:text-sm mt-2">
              <strong>{selectedOpenSlots} slots</strong> will be available for other players at ₹{perSlotPrice || 0} per slot
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
        <div className="text-center bg-white rounded-xl shadow-lg p-8 sm:p-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Error</h2>
          <p className="text-gray-600 mb-6 text-sm sm:text-base">{error}</p>
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

  // Check if user can book this card
  if (!canUserBookCard()) {
    return (
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => navigate(`/card/${id}`)}
          className="mb-6 inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200 font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to card details
        </button>
        <div className="text-center bg-white rounded-xl shadow-lg p-8 sm:p-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Cannot Book This Card</h2>
          <p className="text-gray-600 mb-6 text-sm sm:text-base">
            {getBookingErrorMessage()}
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Browse Other Cards
          </button>
        </div>
      </div>
    );
  }

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

      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Book {card.title}</h1>
          <p className="text-gray-600 text-sm sm:text-base">Select a date and time slots for your booking</p>
          {card.pricePerHour && (
            <p className="text-base sm:text-lg font-semibold text-green-600 mt-2">₹{card.pricePerHour} per hour</p>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <span className="text-sm sm:text-base">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
            <span className="text-sm sm:text-base">{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Calendar Section */}
          <div>
            <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Select Date
            </h2>
            <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base sm:text-lg font-medium">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={handlePrevMonth}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors duration-200"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors duration-200"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekdays.map(day => (
                  <div key={day} className="h-6 sm:h-8 flex items-center justify-center text-xs text-gray-500 font-medium">
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
            <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Select Time Slots
            </h2>
            
            {!selectedDate ? (
              <div className="bg-gray-50 rounded-lg p-6 sm:p-8 text-center">
                <p className="text-gray-500 text-sm sm:text-base">Please select a date first</p>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                <div className="mb-4">
                  <p className="text-xs sm:text-sm text-gray-600">
                    Selected date: <span className="font-medium">{selectedDate.toLocaleDateString()}</span>
                  </p>
                  {selectedTimeSlots.length > 0 && (
                    <p className="text-xs sm:text-sm text-blue-600 mt-1">
                      {selectedTimeSlots.length} slot{selectedTimeSlots.length > 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {timeSlots.map(slot => (
                    <button
                      key={slot.time}
                      onClick={() => slot.available && handleTimeSlotToggle(slot.time)}
                      disabled={!slot.available}
                      className={`
                        p-2 sm:p-3 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-between
                        ${!slot.available 
                          ? 'bg-red-100 text-red-400 cursor-not-allowed' 
                          : selectedTimeSlots.includes(slot.time)
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-white text-gray-700 hover:bg-blue-50 border border-gray-200'
                        }
                      `}
                    >
                      <span>{slot.time}</span>
                      {!slot.available && <X className="w-3 h-3 sm:w-4 sm:h-4" />}
                      {slot.available && selectedTimeSlots.includes(slot.time) && <Check className="w-3 h-3 sm:w-4 sm:h-4" />}
                    </button>
                  ))}
                </div>
                
                {timeSlots.length === 0 && (
                  <p className="text-center text-gray-500 py-4 text-sm">No time slots available</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Slot Picker */}
        {selectedDate && selectedTimeSlots.length > 0 && <SlotPicker />}

        {/* Booking Summary and Confirm Button */}
        {selectedDate && selectedTimeSlots.length > 0 && (
          <div className="mt-6 sm:mt-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 sm:p-6 border border-blue-200">
            <h3 className="text-base sm:text-lg font-semibold mb-4 text-blue-800">Booking Summary</h3>
            <div className="space-y-2 mb-4 sm:mb-6 text-sm sm:text-base">
              <p><span className="font-medium">Card:</span> {card.title}</p>
              <p><span className="font-medium">Date:</span> {selectedDate.toLocaleDateString()}</p>
              <p><span className="font-medium">Time Slots:</span> {selectedTimeSlots.join(', ')}</p>
              <p><span className="font-medium">Total Slots:</span> {selectedTimeSlots.length}</p>
              {card.pricePerHour && (
                <>
                  <p><span className="font-medium">Price per Hour:</span> ₹{card.pricePerHour}</p>
                  <p><span className="font-medium">Total Amount:</span> <span className="text-green-600 font-bold">₹{selectedTimeSlots.length * card.pricePerHour}</span></p>
                </>
              )}
              {selectedOpenSlots > 0 && (
                <>
                  <p><span className="font-medium">Open Slots for Others:</span> {selectedOpenSlots}</p>
                  <p><span className="font-medium">Price per Slot:</span> ₹{perSlotPrice}</p>
                  <p><span className="font-medium">Potential Revenue:</span> <span className="text-green-600">₹{selectedOpenSlots * perSlotPrice}</span></p>
                </>
              )}
            </div>
            
            <button
              onClick={handleConfirmBooking}
              disabled={bookingLoading || !user || (selectedOpenSlots > 0 && perSlotPrice <= 0)}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm sm:text-base"
            >
              {bookingLoading ? 'Confirming Booking...' : 'Confirm Booking'}
            </button>
            
            {!user && (
              <p className="text-center text-red-600 text-xs sm:text-sm mt-2">
                Please log in to make a booking
              </p>
            )}

            {selectedOpenSlots > 0 && perSlotPrice <= 0 && (
              <p className="text-center text-red-600 text-xs sm:text-sm mt-2">
                Please set a valid price per slot
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingCalendar;