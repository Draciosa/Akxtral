import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Calendar, Clock, MapPin, User, Plus, BarChart3, CreditCard, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AddCard from './AddCard';
import CardList from './CardList';

type BookingData = {
  id: string;
  userId: string;
  cardId: string;
  Card_ID: string;
  date: string;
  timeSlot: string;
  bookingTime: any;
  openSlots?: number;
  cardTitle?: string;
  cardType?: string;
  cardImageUrl?: string;
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [openSlotBookings, setOpenSlotBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<'bookings' | 'cards' | 'openSlots'>('bookings');
  const [showAddCardForm, setShowAddCardForm] = useState(false);

  useEffect(() => {
    const fetchBookings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch all bookings for the current user
        const q = query(
          collection(db, 'bookings'),
          where('userId', '==', user.uid)
        );
        
        // Set up real-time listener for bookings
        const unsubscribe = onSnapshot(q, async (querySnapshot) => {
          const bookingsData: BookingData[] = [];
          const openSlotBookingsData: BookingData[] = [];

          // For each booking, also fetch the card details
          for (const docSnapshot of querySnapshot.docs) {
            const bookingData = {
              id: docSnapshot.id,
              ...docSnapshot.data()
            } as BookingData;

            // Fetch card details
            try {
              const cardDoc = await getDoc(doc(db, 'cards', bookingData.cardId));
              if (cardDoc.exists()) {
                const cardData = cardDoc.data();
                bookingData.cardTitle = cardData.title;
                bookingData.cardType = cardData.type;
                bookingData.cardImageUrl = cardData.imageUrl;
              }
            } catch (cardError) {
              console.error('Error fetching card details:', cardError);
            }

            bookingsData.push(bookingData);

            // Separate bookings with open slots
            if (bookingData.openSlots && bookingData.openSlots > 0) {
              // Only include future bookings with open slots
              const bookingDateTime = new Date(bookingData.date + ' ' + bookingData.timeSlot);
              if (bookingDateTime > new Date()) {
                openSlotBookingsData.push(bookingData);
              }
            }
          }

          // Sort bookings by date and time (most recent first)
          bookingsData.sort((a, b) => {
            const dateA = new Date(a.date + ' ' + a.timeSlot);
            const dateB = new Date(b.date + ' ' + b.timeSlot);
            return dateB.getTime() - dateA.getTime();
          });

          // Sort open slot bookings by date and time (soonest first)
          openSlotBookingsData.sort((a, b) => {
            const dateA = new Date(a.date + ' ' + a.timeSlot);
            const dateB = new Date(b.date + ' ' + b.timeSlot);
            return dateA.getTime() - dateB.getTime();
          });

          setBookings(bookingsData);
          setOpenSlotBookings(openSlotBookingsData);
          setLoading(false);
        });

        return unsubscribe;
      } catch (err) {
        console.error('Error fetching bookings:', err);
        setError('Failed to load your bookings');
        setLoading(false);
      }
    };

    const unsubscribe = fetchBookings();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const isUpcoming = (dateString: string, timeSlot: string): boolean => {
    const bookingDateTime = new Date(dateString + ' ' + timeSlot);
    return bookingDateTime > new Date();
  };

  const groupBookingsByStatus = () => {
    const upcoming = bookings.filter(booking => isUpcoming(booking.date, booking.timeSlot));
    const past = bookings.filter(booking => !isUpcoming(booking.date, booking.timeSlot));
    return { upcoming, past };
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center bg-white rounded-xl shadow-lg p-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in</h2>
          <p className="text-gray-600 mb-6">You need to be logged in to view your dashboard.</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const { upcoming, past } = groupBookingsByStatus();

  const AddCardModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Add New Card</h2>
          <button
            onClick={() => setShowAddCardForm(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
          >
            <Plus className="w-5 h-5 text-gray-500 rotate-45" />
          </button>
        </div>
        <div className="p-6">
          <AddCard onSuccess={() => setShowAddCardForm(false)} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-white shadow-lg min-h-screen">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
                <p className="text-sm text-gray-500">Manage your account</p>
              </div>
            </div>

            <nav className="space-y-2">
              <button
                onClick={() => setActiveSection('bookings')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                  activeSection === 'bookings'
                    ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span className="font-medium">Your Bookings</span>
              </button>

              <button
                onClick={() => setActiveSection('openSlots')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                  activeSection === 'openSlots'
                    ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Users className="w-5 h-5" />
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium">Your Open Slots</span>
                  {openSlotBookings.length > 0 && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      {openSlotBookings.length}
                    </span>
                  )}
                </div>
              </button>

              <button
                onClick={() => setActiveSection('cards')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                  activeSection === 'cards'
                    ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span className="font-medium">Your Cards</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Welcome Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-8 mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Welcome back!</h1>
                <p className="text-blue-100 text-lg">{user.email}</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Content based on active section */}
          {activeSection === 'bookings' && (
            <div>
              {/* Booking Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Total Bookings</p>
                      <p className="text-3xl font-bold text-gray-900">{bookings.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Upcoming</p>
                      <p className="text-3xl font-bold text-green-600">{upcoming.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <Clock className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm">Completed</p>
                      <p className="text-3xl font-bold text-gray-600">{past.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-gray-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Your Bookings Section */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Bookings</h2>

                {bookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No bookings yet</h3>
                    <p className="text-gray-500 mb-6">Start exploring and book your first activity!</p>
                    <button
                      onClick={() => navigate('/')}
                      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      Browse Cards
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Upcoming Bookings */}
                    {upcoming.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <Clock className="w-5 h-5 mr-2 text-green-600" />
                          Upcoming Bookings ({upcoming.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {upcoming.map((booking) => (
                            <BookingCard key={booking.id} booking={booking} isUpcoming={true} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Past Bookings */}
                    {past.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <Calendar className="w-5 h-5 mr-2 text-gray-600" />
                          Past Bookings ({past.length})
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {past.map((booking) => (
                            <BookingCard key={booking.id} booking={booking} isUpcoming={false} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'openSlots' && (
            <div>
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Open Slots</h2>
                <p className="text-gray-600 mb-6">
                  These are your bookings that have open slots for other players to join.
                </p>

                {openSlotBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No open slots</h3>
                    <p className="text-gray-500 mb-6">
                      You don't have any bookings with open slots for other players.
                    </p>
                    <button
                      onClick={() => navigate('/')}
                      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      Create a Booking
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {openSlotBookings.map((booking) => (
                      <div 
                        key={booking.id}
                        className="border border-green-200 bg-green-50 rounded-lg p-4 transition-all duration-200 hover:shadow-md cursor-pointer"
                        onClick={() => navigate(`/card/${booking.cardId}`)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            {booking.cardImageUrl ? (
                              <img
                                src={booking.cardImageUrl}
                                alt={booking.cardTitle || 'Card'}
                                className="w-12 h-12 rounded-lg object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'https://images.pexels.com/photos/3657154/pexels-photo-3657154.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                                <Calendar className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">
                              {booking.cardTitle || 'Unknown Card'}
                            </h4>
                            {booking.cardType && (
                              <p className="text-sm text-gray-600 mb-1">{booking.cardType}</p>
                            )}
                            <div className="flex items-center text-sm text-gray-500 mb-1">
                              <Calendar className="w-4 h-4 mr-1" />
                              <span>{formatDate(booking.date)}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-500 mb-2">
                              <Clock className="w-4 h-4 mr-1" />
                              <span>{booking.timeSlot}</span>
                            </div>
                            <div className="flex items-center text-sm text-green-600">
                              <Users className="w-4 h-4 mr-1" />
                              <span className="font-medium">{booking.openSlots} slots open</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-green-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-800">
                              Open for Players
                            </span>
                            <span className="text-xs text-gray-400">
                              Real-time updates
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'cards' && (
            <div>
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Your Cards</h2>
                  <button
                    onClick={() => setShowAddCardForm(true)}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md hover:shadow-lg font-medium"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add New Card
                  </button>
                </div>
                <CardList />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Card Modal */}
      {showAddCardForm && <AddCardModal />}
    </div>
  );
};

// Booking Card Component
const BookingCard: React.FC<{ booking: BookingData; isUpcoming: boolean }> = ({ booking, isUpcoming }) => {
  const navigate = useNavigate();

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div 
      className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md cursor-pointer ${
        isUpcoming ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
      }`}
      onClick={() => navigate(`/card/${booking.cardId}`)}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {booking.cardImageUrl ? (
            <img
              src={booking.cardImageUrl}
              alt={booking.cardTitle || 'Card'}
              className="w-12 h-12 rounded-lg object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://images.pexels.com/photos/3657154/pexels-photo-3657154.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';
              }}
            />
          ) : (
            <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-gray-400" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 truncate">
            {booking.cardTitle || 'Unknown Card'}
          </h4>
          {booking.cardType && (
            <p className="text-sm text-gray-600 mb-1">{booking.cardType}</p>
          )}
          <div className="flex items-center text-sm text-gray-500 mb-1">
            <Calendar className="w-4 h-4 mr-1" />
            <span>{formatDate(booking.date)}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="w-4 h-4 mr-1" />
            <span>{booking.timeSlot}</span>
          </div>
          {booking.openSlots && booking.openSlots > 0 && (
            <div className="flex items-center text-sm text-green-600 mt-1">
              <Users className="w-4 h-4 mr-1" />
              <span>{booking.openSlots} open slots</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            isUpcoming 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {isUpcoming ? 'Upcoming' : 'Completed'}
          </span>
          <span className="text-xs text-gray-400">
            Booked {booking.bookingTime?.toDate?.()?.toLocaleDateString() || 'Recently'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;