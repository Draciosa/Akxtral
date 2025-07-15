import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, CalendarCheck, X, MapPin } from 'lucide-react';
import { useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
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
  createdAt: any;
  Card_ID: string;
};

const CardDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

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
          setCard({
            id: cardDoc.id,
            ...cardDoc.data()
          } as CardData);
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

  const handleBookNow = () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    navigate(`/book/${id}`);
  };

  const getGoogleMapsEmbedUrl = (location: string) => {
    const encodedLocation = encodeURIComponent(location);
    return `https://www.google.com/maps?q=${encodedLocation}&output=embed`;
  };

  const LoginPromptModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Login Required</h2>
          <button
            onClick={() => setShowLoginPrompt(false)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-4 sm:p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarCheck className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Book?</h3>
            <p className="text-gray-600 text-sm sm:text-base">
              You need to be logged in to make a booking. Please sign in to continue with your reservation.
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
              Sign In to Book
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !card) {
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
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
            {error || 'Card not found'}
          </h2>
          <p className="text-gray-600 mb-6 text-sm sm:text-base">
            The card you're looking for doesn't exist or has been removed.
          </p>
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

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => navigate('/')}
        className="mb-6 inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200 font-medium"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to home
      </button>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="relative h-64 sm:h-80 md:h-96 lg:h-[500px]">
          <img
            src={card.imageUrl}
            alt={card.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://images.pexels.com/photos/3657154/pexels-photo-3657154.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 text-white">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2">{card.title}</h1>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <div className="inline-block bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-1 sm:py-2 rounded-full">
                <span className="text-sm sm:text-lg font-medium">{card.type}</span>
              </div>
              {card.pricePerHour > 0 && (
                <div className="inline-flex items-center bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-1 sm:py-2 rounded-full">
                  <span className="text-sm sm:text-lg font-medium">₹{card.pricePerHour}/hour</span>
                </div>
              )}
              {(card.openingTime || card.closingTime) && (
                <div className="inline-flex items-center bg-white/20 backdrop-blur-sm px-3 sm:px-4 py-1 sm:py-2 rounded-full">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  <span className="text-sm sm:text-lg font-medium">
                    {card.openingTime && card.closingTime 
                      ? `${card.openingTime} - ${card.closingTime}`
                      : card.openingTime || card.closingTime
                    }
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              {card.description && (
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-900">About This Venue</h2>
                  <div className="bg-blue-50 rounded-lg p-4 sm:p-6">
                    <p className="text-gray-700 leading-relaxed text-sm sm:text-base">{card.description}</p>
                  </div>
                </div>
              )}

              {/* Location Map */}
              {card.location && (
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-900">Location</h2>
                  <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
                    <div className="flex items-center mb-4">
                      <MapPin className="w-5 h-5 text-gray-600 mr-2 flex-shrink-0" />
                      <span className="text-gray-700 font-medium text-sm sm:text-base">{card.location}</span>
                    </div>
                    <div className="rounded-lg overflow-hidden border border-gray-200">
                      <iframe
                        src={getGoogleMapsEmbedUrl(card.location)}
                        width="100%"
                        height="250"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title={`Map showing location of ${card.title}`}
                        className="sm:h-[300px]"
                      ></iframe>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Booking Card */}
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200 sticky top-4">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Book This Venue</h3>
                
                {card.pricePerHour > 0 && (
                  <div className="mb-4">
                    <div className="text-2xl sm:text-3xl font-bold text-green-600">
                      ₹{card.pricePerHour}
                      <span className="text-base sm:text-lg font-normal text-gray-500">/hour</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleBookNow}
                  className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium flex items-center justify-center mb-4 text-sm sm:text-base"
                >
                  <CalendarCheck className="w-5 h-5 mr-2" />
                  {user ? 'Book Now' : 'Book Now (Login Required)'}
                </button>

                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium text-sm sm:text-base"
                >
                  Back to Home
                </button>
              </div>

              {/* Venue Details */}
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Venue Details</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                      <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Sport Type</h4>
                      <p className="text-gray-600 text-sm">{card.type}</p>
                    </div>
                  </div>
                  
                  {(card.openingTime || card.closingTime) && (
                    <div className="flex items-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-full flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                        <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Operating Hours</h4>
                        <p className="text-gray-600 text-sm">
                          {card.openingTime && card.closingTime 
                            ? `${card.openingTime} - ${card.closingTime}`
                            : card.openingTime || card.closingTime
                          }
                        </p>
                      </div>
                    </div>
                  )}

                  {card.location && (
                    <div className="flex items-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                        <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Location</h4>
                        <p className="text-gray-600 text-sm break-words">{card.location}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Login Prompt Modal */}
      {showLoginPrompt && <LoginPromptModal />}
    </div>
  );
};

export default CardDetails;