import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where, doc, getDoc, updateDoc, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, Calendar, MapPin, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type GameBooking = {
  id: string;
  userId: string;
  cardId: string;
  Card_ID: string;
  date: string;
  timeSlot: string;
  openSlots: number;
  bookingTime: any;
  cardTitle?: string;
  cardType?: string;
  cardImageUrl?: string;
  cardOpeningTime?: string;
  cardClosingTime?: string;
};

const Games: React.FC = () => {
  const [gameBookings, setGameBookings] = useState<GameBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameBooking | null>(null);
  const [joiningSlotsCount, setJoiningSlotsCount] = useState(1);
  const [joiningLoading, setJoiningLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

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

          setGameBookings(gamesData);
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

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleJoinGame = (game: GameBooking) => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    setSelectedGame(game);
    setJoiningSlotsCount(1);
  };

  const confirmJoinGame = async () => {
    if (!user || !selectedGame) return;

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
      await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          cardId: selectedGame.cardId,
          Card_ID: selectedGame.Card_ID,
          date: selectedGame.date,
          timeSlot: selectedGame.timeSlot,
          joinedSlots: joiningSlotsCount,
          originalBookingId: selectedGame.id,
          bookingTime: new Date()
        })
      });

      setSelectedGame(null);
      setJoiningSlotsCount(1);
      
      // Show success message
      alert(`Successfully joined the game! You've booked ${joiningSlotsCount} slot${joiningSlotsCount > 1 ? 's' : ''}.`);
      
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
          <h2 className="text-2xl font-bold text-gray-900">Login Required</h2>
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
              <Users className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Join?</h3>
            <p className="text-gray-600">
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
          <h2 className="text-2xl font-bold text-gray-900">Join Game</h2>
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
                    <option key={num} value={num}>{num} slot{num > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <button
                  onClick={confirmJoinGame}
                  disabled={joiningLoading}
                  className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium disabled:opacity-50"
                >
                  {joiningLoading ? 'Joining...' : `Join Game (${joiningSlotsCount} slot${joiningSlotsCount > 1 ? 's' : ''})`}
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
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Join Games</h1>
        <p className="text-gray-600 text-lg">
          Find games with open slots and join other players for exciting matches!
        </p>
      </div>

      {gameBookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-lg">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-600 mb-2">No Games Available</h2>
          <p className="text-gray-500 mb-6">
            There are currently no games with open slots. Check back later or create your own game!
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Browse Cards
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gameBookings.map((game) => (
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
                <div className="absolute top-2 left-2 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {game.openSlots} slots open
                </div>
                <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-sm">
                  Join Game
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{game.cardTitle}</h3>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-gray-600 text-sm">
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-2">
                      {game.cardType}
                    </span>
                  </div>
                  
                  <div className="flex items-center text-gray-600 text-sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{formatDate(game.date)}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-600 text-sm">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>{game.timeSlot}</span>
                  </div>
                  
                  {(game.cardOpeningTime || game.cardClosingTime) && (
                    <div className="flex items-center text-gray-600 text-sm">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>
                        {game.cardOpeningTime && game.cardClosingTime 
                          ? `${game.cardOpeningTime} - ${game.cardClosingTime}`
                          : game.cardOpeningTime || game.cardClosingTime
                        }
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center text-green-600">
                    <Users className="w-5 h-5 mr-2" />
                    <span className="font-semibold">{game.openSlots} slots available</span>
                  </div>
                </div>

                <button
                  onClick={() => handleJoinGame(game)}
                  className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium"
                >
                  Join Game
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showLoginPrompt && <LoginPromptModal />}
      {selectedGame && <JoinGameModal />}
    </div>
  );
};

export default Games;