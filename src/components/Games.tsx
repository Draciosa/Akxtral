import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where, doc, getDoc, updateDoc, getDocs, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, Calendar, MapPin, X, LogIn, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type GameBooking = {
  id: string;
  userId: string;
  cardId: string;
  Card_ID: string;
  date: string;
  timeSlot: string;
  openSlots: number;
  perSlotPrice?: number;
  bookingTime: any;
  cardTitle?: string;
  cardType?: string;
  cardImageUrl?: string;
  cardOpeningTime?: string;
  cardClosingTime?: string;
  cardLocation?: string;
  cardPricePerHour?: number;
};

interface FilterOptions {
  type: string;
  location: string;
  minPrice: number;
  maxPrice: number;
  date: string;
}

const GAMES_PER_PAGE = 6;

const Games: React.FC = () => {
  const [allGameBookings, setAllGameBookings] = useState<GameBooking[]>([]);
  const [filteredGameBookings, setFilteredGameBookings] = useState<GameBooking[]>([]);
  const [displayedGames, setDisplayedGames] = useState<GameBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameBooking | null>(null);
  const [joiningSlotsCount, setJoiningSlotsCount] = useState(1);
  const [joiningLoading, setJoiningLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    type: '',
    location: '',
    minPrice: 0,
    maxPrice: 0,
    date: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();
  const { user, hasRole, userProfile } = useAuth();

  const totalPages = Math.ceil(filteredGameBookings.length / GAMES_PER_PAGE);
  const availableTypes = [...new Set(allGameBookings.map(game => game.cardType).filter(Boolean))];
  const availableLocations = [...new Set(allGameBookings.map(game => game.cardLocation).filter(Boolean))];

  useEffect(() => {
    const fetchGamesWithOpenSlots = () => {
      try {
        setLoading(true);
        setError('');
        
        // Query for bookings that have open slots
        const q = query(
          collection(db, 'bookings'),
          where('openSlots', '>', 0)
        );

        const unsubscribe = onSnapshot(q, async (querySnapshot) => {
          const gamesData: GameBooking[] = [];
          
          for (const docSnapshot of querySnapshot.docs) {
            const bookingData = {
              id: docSnapshot.id,
              ...docSnapshot.data()
            } as GameBooking;

            // Fetch card details for each booking
            try {
              const cardDoc = await getDoc(doc(db, 'cards', bookingData.cardId));
              if (cardDoc.exists()) {
                const cardData = cardDoc.data();
                bookingData.cardTitle = cardData.title;
                bookingData.cardType = cardData.type;
                bookingData.cardImageUrl = cardData.imageUrl;
                bookingData.cardOpeningTime = cardData.openingTime;
                bookingData.cardClosingTime = cardData.closingTime;
                bookingData.cardLocation = cardData.location;
                bookingData.cardPricePerHour = cardData.pricePerHour;
              }
            } catch (cardError) {
              console.error('Error fetching card details:', cardError);
            }

            // Only include future games
            const gameDateTime = new Date(bookingData.date + ' ' + bookingData.timeSlot);
            if (gameDateTime > new Date()) {
              gamesData.push(bookingData);
            }
          }

          // Sort by date and time (soonest first)
          gamesData.sort((a, b) => {
            const dateA = new Date(a.date + ' ' + a.timeSlot);
            const dateB = new Date(b.date + ' ' + b.timeSlot);
            return dateA.getTime() - dateB.getTime();
          });

          setAllGameBookings(gamesData);
          setLoading(false);
        }, (err) => {
          console.error('Error in real-time listener:', err);
          setError('Unable to load games at the moment.');
          setLoading(false);
        });

        return unsubscribe;
      } catch (err) {
        console.error('Error setting up real-time listener:', err);
        setError('Unable to load games at the moment.');
        setLoading(false);
      }
    };

    const unsubscribe = fetchGamesWithOpenSlots();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Apply search and filters
  useEffect(() => {
    let filtered = allGameBookings;

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(game =>
        game.cardTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.cardType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.cardLocation?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply filters
    if (filters.type) {
      filtered = filtered.filter(game => game.cardType === filters.type);
    }

    if (filters.location) {
      filtered = filtered.filter(game => game.cardLocation === filters.location);
    }

    if (filters.minPrice > 0) {
      filtered = filtered.filter(game => (game.perSlotPrice || 0) >= filters.minPrice);
    }

    if (filters.maxPrice > 0) {
      filtered = filtered.filter(game => (game.perSlotPrice || 0) <= filters.maxPrice);
    }

    if (filters.date) {
      filtered = filtered.filter(game => game.date === filters.date);
    }

    setFilteredGameBookings(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [allGameBookings, searchTerm, filters]);

  // Update displayed games when page changes
  useEffect(() => {
    const startIndex = (currentPage - 1) * GAMES_PER_PAGE;
    const endIndex = startIndex + GAMES_PER_PAGE;
    setDisplayedGames(filteredGameBookings.slice(startIndex, endIndex));
  }, [currentPage, filteredGameBookings]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleFilterChange = (key: keyof FilterOptions, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      location: '',
      minPrice: 0,
      maxPrice: 0,
      date: ''
    });
    setSearchTerm('');
  };

  const hasActiveFilters = filters.type || filters.location || filters.minPrice > 0 || filters.maxPrice > 0 || filters.date || searchTerm;

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const canUserJoinGames = (): boolean => {
    if (!user) return false;
    
    // Admins cannot join games
    if (hasRole('admin')) return false;
    
    // Users and hosts can join games
    return hasRole('user') || hasRole('host');
  };

  const handleJoinGame = (game: GameBooking) => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    if (!canUserJoinGames()) {
      alert('Admins cannot join games');
      return;
    }

    setSelectedGame(game);
    setJoiningSlotsCount(1);
  };

  const confirmJoinGame = async () => {
    if (!user || !selectedGame || !userProfile) return;

    if (joiningSlotsCount > selectedGame.openSlots) {
      alert(`Only ${selectedGame.openSlots} slots available`);
      return;
    }

    setJoiningLoading(true);
    try {
      // Update the original booking to reduce open slots
      const newOpenSlots = selectedGame.openSlots - joiningSlotsCount;
      const bookingRef = doc(db, 'bookings', selectedGame.id);
      
      await updateDoc(bookingRef, {
        openSlots: newOpenSlots
      });

      // Create a new booking for the joining user
      const newBookingData = {
        userId: user.uid,
        cardId: selectedGame.cardId,
        Card_ID: selectedGame.Card_ID,
        date: selectedGame.date,
        timeSlot: selectedGame.timeSlot,
        joinedSlots: joiningSlotsCount,
        originalBookingId: selectedGame.id,
        bookingTime: new Date()
      };

      const newBookingRef = await addDoc(collection(db, 'bookings'), newBookingData);

      // Create notification for the original booking owner
      await addDoc(collection(db, 'notifications'), {
        userId: selectedGame.userId,
        type: 'slot_joined',
        title: 'Someone joined your game!',
        message: `A player has joined ${joiningSlotsCount} slot${joiningSlotsCount > 1 ? 's' : ''} in your ${selectedGame.cardTitle} booking on ${formatDate(selectedGame.date)} at ${selectedGame.timeSlot}`,
        bookingId: selectedGame.id,
        joinedByUserId: user.uid,
        joinedByEmail: user.email,
        joinedByDisplayName: userProfile.displayName || '',
        joinedByPhoneNumber: userProfile.phoneNumber || '',
        joinedSlots: joiningSlotsCount,
        read: false,
        createdAt: new Date()
      });

      setSelectedGame(null);
      setJoiningSlotsCount(1);
      
      // Redirect to receipt page for the new booking
      navigate(`/receipt/${newBookingRef.id}`);
      
    } catch (error) {
      console.error('Error joining game:', error);
      alert('Failed to join game. Please try again.');
    } finally {
      setJoiningLoading(false);
    }
  };

  const LoginPromptModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Login Required</h2>
          <button
            onClick={() => setShowLoginPrompt(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Join?</h3>
            <p className="text-gray-600 text-sm sm:text-base">
              You need to be logged in to join games. Please sign in to continue.
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => {
                setShowLoginPrompt(false);
                navigate('/');
                setTimeout(() => {
                  const loginButton = document.querySelector('[data-login-trigger]') as HTMLButtonElement;
                  if (loginButton) loginButton.click();
                }, 100);
              }}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
            >
              Sign In to Join
            </button>
            <button
              onClick={() => setShowLoginPrompt(false)}
              className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const JoinGameModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Join Game</h2>
          <button
            onClick={() => setSelectedGame(null)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6">
          {selectedGame && (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedGame.cardTitle}</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{formatDate(selectedGame.date)}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>{selectedGame.timeSlot}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    <span>{selectedGame.openSlots} slots available</span>
                  </div>
                  {selectedGame.perSlotPrice && (
                    <div className="flex items-center">
                      <span className="font-semibold text-green-600">₹{selectedGame.perSlotPrice} per slot</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How many slots do you want to book?
                </label>
                <select
                  value={joiningSlotsCount}
                  onChange={(e) => setJoiningSlotsCount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: selectedGame.openSlots }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>
                      {num} slot{num > 1 ? 's' : ''} 
                      {selectedGame.perSlotPrice && ` - ₹${num * selectedGame.perSlotPrice}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <button
                  onClick={confirmJoinGame}
                  disabled={joiningLoading}
                  className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium disabled:opacity-50"
                >
                  {joiningLoading ? 'Joining...' : 
                    `Join Game (${joiningSlotsCount} slot${joiningSlotsCount > 1 ? 's' : ''}${selectedGame.perSlotPrice ? ` - ₹${joiningSlotsCount * selectedGame.perSlotPrice}` : ''})`
                  }
                </button>
                <button
                  onClick={() => setSelectedGame(null)}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg">
          <p>{error}</p>
          <p className="text-sm mt-1">Please try refreshing the page or contact support if the issue persists.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Join Games</h1>
        <p className="text-gray-600 text-base sm:text-lg">
          Find games with open slots and join other players for exciting matches!
        </p>
        
        {/* Authentication Guidelines */}
        {!user && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
            <div className="flex items-start">
              <LogIn className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-blue-800 mb-2">Sign In Required</h3>
                <p className="text-blue-700 mb-4 text-sm sm:text-base">
                  To view and join available games, you need to be signed in to your account. 
                  This helps us ensure a secure and personalized gaming experience.
                </p>
                <button
                  onClick={() => setShowLoginPrompt(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium text-sm sm:text-base"
                >
                  Sign In Now
                </button>
              </div>
            </div>
          </div>
        )}

        {hasRole('admin') && (
          <div className="mt-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg">
            <p className="text-sm sm:text-base">Admins cannot join games. This page is for viewing purposes only.</p>
          </div>
        )}
      </div>

      {/* Only show games if user is authenticated */}
      {user ? (
        <>
          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search games by title, type, or location..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
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

                  {/* Location Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <select
                      value={filters.location}
                      onChange={(e) => handleFilterChange('location', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="">All Locations</option>
                      {availableLocations.map(location => (
                        <option key={location} value={location}>{location}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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

                  {/* Price Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Price (₹/slot)
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
                      Max Price (₹/slot)
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
                    {searchTerm && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                        Search: {searchTerm}
                        <button
                          onClick={() => setSearchTerm('')}
                          className="ml-2 text-gray-600 hover:text-gray-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
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
                    {filters.location && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                        Location: {filters.location}
                        <button
                          onClick={() => handleFilterChange('location', '')}
                          className="ml-2 text-purple-600 hover:text-purple-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {filters.date && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800">
                        Date: {new Date(filters.date).toLocaleDateString()}
                        <button
                          onClick={() => handleFilterChange('date', '')}
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

          {/* Results Summary */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
            <div className="text-sm text-gray-600">
              {filteredGameBookings.length > 0 ? (
                <>Showing {((currentPage - 1) * GAMES_PER_PAGE) + 1}-{Math.min(currentPage * GAMES_PER_PAGE, filteredGameBookings.length)} of {filteredGameBookings.length} games</>
              ) : (
                <>No games found</>
              )}
            </div>
          </div>

          {filteredGameBookings.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl shadow-lg">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl sm:text-2xl font-bold text-gray-600 mb-2">
                {hasActiveFilters ? 'No games match your criteria' : 'No Games Available'}
              </h2>
              <p className="text-gray-500 mb-6 text-sm sm:text-base px-4">
                {hasActiveFilters 
                  ? 'Try adjusting your search or filters to find more games.'
                  : 'There are currently no games with open slots. Check back later or create your own game!'
                }
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  onClick={() => navigate('/')}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  Browse Cards
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {displayedGames.map((game) => (
                  <div 
                    key={game.id} 
                    className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
                  >
                    <div className="relative h-48 bg-gray-200">
                      <img 
                        src={game.cardImageUrl} 
                        alt={game.cardTitle} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://images.pexels.com/photos/3657154/pexels-photo-3657154.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';
                        }}
                      />
                      <div className="absolute top-2 left-2 bg-green-600 text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                        {game.openSlots} slots open
                      </div>
                      <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs sm:text-sm">
                        Join Game
                      </div>
                      {game.perSlotPrice && (
                        <div className="absolute bottom-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs sm:text-sm font-semibold">
                          ₹{game.perSlotPrice}/slot
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 sm:p-6">
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 line-clamp-1">{game.cardTitle}</h3>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-gray-600 text-sm">
                          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-2">
                            {game.cardType}
                          </span>
                        </div>
                        
                        <div className="flex items-center text-gray-600 text-sm">
                          <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{formatDate(game.date)}</span>
                        </div>
                        
                        <div className="flex items-center text-gray-600 text-sm">
                          <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{game.timeSlot}</span>
                        </div>

                        {game.cardLocation && (
                          <div className="flex items-center text-gray-600 text-sm">
                            <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{game.cardLocation}</span>
                          </div>
                        )}
                        
                        {(game.cardOpeningTime || game.cardClosingTime) && (
                          <div className="flex items-center text-gray-600 text-sm">
                            <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="truncate">
                              {game.cardOpeningTime && game.cardClosingTime 
                                ? `${game.cardOpeningTime} - ${game.cardClosingTime}`
                                : game.cardOpeningTime || game.cardClosingTime
                              }
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
                        <div className="flex items-center text-green-600">
                          <Users className="w-5 h-5 mr-2" />
                          <span className="font-semibold text-sm">{game.openSlots} slots available</span>
                        </div>
                        {game.perSlotPrice && (
                          <div className="flex items-center text-blue-600">
                            <span className="font-semibold text-sm">₹{game.perSlotPrice}/slot</span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleJoinGame(game)}
                        disabled={hasRole('admin')}
                        className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                      >
                        {hasRole('admin') ? 'Admin View Only' : 'Join Game'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </button>
                  
                  <div className="flex items-center space-x-2 overflow-x-auto">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                            pageNum === currentPage
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 hover:text-gray-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl shadow-lg">
          <LogIn className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-600 mb-2">Sign In to View Games</h2>
          <p className="text-gray-500 mb-6 text-sm sm:text-base px-4">
            Please sign in to your account to view and join available games.
          </p>
          <button
            onClick={() => setShowLoginPrompt(true)}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Sign In
          </button>
        </div>
      )}

      {/* Modals */}
      {showLoginPrompt && <LoginPromptModal />}
      {selectedGame && <JoinGameModal />}
    </div>
  );
};

export default Games;