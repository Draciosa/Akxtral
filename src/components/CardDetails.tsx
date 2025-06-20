import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Clock, CalendarCheck, X } from 'lucide-react';
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
              <CalendarCheck className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Book?</h3>
            <p className="text-gray-600">
              You need to be logged in to make a booking. Please sign in to continue with your reservation.
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => {
                setShowLoginPrompt(false);
                navigate('/');
                // Trigger login modal - we'll need to pass this state up or use a global state
                setTimeout(() => {
                  // This is a workaround - in a real app you'd use proper state management
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
        <div className="text-center bg-white rounded-xl shadow-lg p-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'Card not found'}
          </h2>
          <p className="text-gray-600 mb-6">
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
        <div className="relative h-96 md:h-[500px]">
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
          <div className="absolute bottom-6 left-6 text-white">
            <h1 className="text-4xl md:text-5xl font-bold mb-2">{card.title}</h1>
            <div className="flex flex-wrap gap-3">
              <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-lg font-medium">{card.type}</span>
              </div>
              {(card.openingTime || card.closingTime) && (
                <div className="inline-flex items-center bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                  <Clock className="w-5 h-5 mr-2" />
                  <span className="text-lg font-medium">
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

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold mb-4 text-gray-900">About This Card</h2>
                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Card Type</h3>
                      <p className="text-gray-600">{card.type}</p>
                    </div>
                  </div>
                  
                  {(card.openingTime || card.closingTime) && (
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mr-4">
                        <Clock className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Operating Hours</h3>
                        <p className="text-gray-600">
                          {card.openingTime && card.closingTime 
                            ? `${card.openingTime} - ${card.closingTime}`
                            : card.openingTime || card.closingTime
                          }
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                      <Calendar className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Created</h3>
                      <p className="text-gray-600">
                        {card.createdAt?.toDate?.()?.toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) || 'Recently'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-4 text-gray-900">Description</h2>
                <div className="bg-blue-50 rounded-lg p-6">
                  <p className="text-gray-700 leading-relaxed">
                    This is a {card.type.toLowerCase()} card titled "{card.title}". 
                    {(card.openingTime || card.closingTime) && (
                      <span>
                        {' '}It operates {card.openingTime && card.closingTime 
                          ? `from ${card.openingTime} to ${card.closingTime}`
                          : card.openingTime ? `starting at ${card.openingTime}` : `until ${card.closingTime}`
                        }.
                      </span>
                    )}
                    {' '}It represents a user-created entry in our sports and activities collection. 
                    Each card showcases different sports venues, activities, or experiences 
                    shared by our community members.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold mb-4 text-gray-900">Card Statistics</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg">
                    <div className="text-3xl font-bold mb-2">1</div>
                    <div className="text-blue-100">Card Created</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg">
                    <div className="text-3xl font-bold mb-2">{card.type.length}</div>
                    <div className="text-green-100">Type Length</div>
                  </div>
                  {(card.openingTime || card.closingTime) && (
                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg col-span-2">
                      <div className="text-2xl font-bold mb-2">
                        {card.openingTime && card.closingTime 
                          ? `${card.openingTime} - ${card.closingTime}`
                          : card.openingTime || card.closingTime
                        }
                      </div>
                      <div className="text-orange-100">Operating Hours</div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-4 text-gray-900">Actions</h2>
                <div className="space-y-3">
                  <button
                    onClick={handleBookNow}
                    className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium flex items-center justify-center"
                  >
                    <CalendarCheck className="w-5 h-5 mr-2" />
                    {user ? 'Book Now' : 'Book Now (Login Required)'}
                  </button>
                  <button
                    onClick={() => window.open(card.imageUrl, '_blank')}
                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
                  >
                    View Full Image
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium"
                  >
                    Back to Home
                  </button>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="font-semibold text-yellow-800 mb-2">Community Card</h3>
                <p className="text-yellow-700 text-sm">
                  This card was created by a community member and represents their 
                  contribution to our sports and activities database.
                </p>
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