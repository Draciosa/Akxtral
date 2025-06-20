import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Calendar, Clock, MapPin, User, Plus, BarChart3, CreditCard, Users, Building, FileText, Shield, UserCheck, Trash2, Check, X } from 'lucide-react';
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

type HostRequest = {
  id: string;
  userId: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  businessName: string;
  businessType: string;
  businessLocation: string;
  businessImageUrl: string;
  openingTime: string;
  closingTime: string;
  comments?: string;
  createdAt: any;
  status: 'pending' | 'approved' | 'rejected';
};

type HostRequestFormData = {
  fullName: string;
  phoneNumber: string;
  email: string;
  businessName: string;
  businessType: string;
  businessLocation: string;
  businessImageUrl: string;
  openingTime: string;
  closingTime: string;
  comments: string;
};

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

type MakeHostFormData = {
  email: string;
  userId: string;
};

const Dashboard: React.FC = () => {
  const { user, userProfile, hasRole, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [openSlotBookings, setOpenSlotBookings] = useState<BookingData[]>([]);
  const [hostRequests, setHostRequests] = useState<HostRequest[]>([]);
  const [allHostRequests, setAllHostRequests] = useState<HostRequest[]>([]);
  const [allCards, setAllCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<'bookings' | 'cards' | 'openSlots' | 'hostRequest' | 'requests' | 'adminCards' | 'adminRequests' | 'makeHost'>('bookings');
  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [hostRequestForm, setHostRequestForm] = useState<HostRequestFormData>({
    fullName: '',
    phoneNumber: '',
    email: user?.email || '',
    businessName: '',
    businessType: '',
    businessLocation: '',
    businessImageUrl: '',
    openingTime: '',
    closingTime: '',
    comments: ''
  });
  const [makeHostForm, setMakeHostForm] = useState<MakeHostFormData>({
    email: '',
    userId: ''
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [makingHost, setMakingHost] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setHostRequestForm(prev => ({ ...prev, email: user.email || '' }));
    }
  }, [user?.email]);

  // Set default active section based on user role
  useEffect(() => {
    if (userProfile) {
      if (hasRole('admin')) {
        setActiveSection('adminRequests');
      } else if (hasRole('host')) {
        setActiveSection('cards');
      } else {
        setActiveSection('bookings');
      }
    }
  }, [userProfile, hasRole]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !userProfile) {
        setLoading(false);
        return;
      }

      try {
        // Fetch user's bookings (for users and hosts)
        if (hasAnyRole(['user', 'host'])) {
          const bookingsQuery = query(
            collection(db, 'bookings'),
            where('userId', '==', user.uid)
          );
          
          const unsubscribeBookings = onSnapshot(bookingsQuery, async (querySnapshot) => {
            const bookingsData: BookingData[] = [];
            const openSlotBookingsData: BookingData[] = [];

            for (const docSnapshot of querySnapshot.docs) {
              const bookingData = {
                id: docSnapshot.id,
                ...docSnapshot.data()
              } as BookingData;

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

              if (bookingData.openSlots && bookingData.openSlots > 0) {
                const bookingDateTime = new Date(bookingData.date + ' ' + bookingData.timeSlot);
                if (bookingDateTime > new Date()) {
                  openSlotBookingsData.push(bookingData);
                }
              }
            }

            bookingsData.sort((a, b) => {
              const dateA = new Date(a.date + ' ' + a.timeSlot);
              const dateB = new Date(b.date + ' ' + b.timeSlot);
              return dateB.getTime() - dateA.getTime();
            });

            openSlotBookingsData.sort((a, b) => {
              const dateA = new Date(a.date + ' ' + a.timeSlot);
              const dateB = new Date(b.date + ' ' + b.timeSlot);
              return dateA.getTime() - dateB.getTime();
            });

            setBookings(bookingsData);
            setOpenSlotBookings(openSlotBookingsData);
          });
        }

        // Fetch user's host requests (for users)
        if (hasRole('user')) {
          const requestsQuery = query(
            collection(db, 'Requests'),
            where('userId', '==', user.uid)
          );

          const unsubscribeRequests = onSnapshot(requestsQuery, (querySnapshot) => {
            const requestsData: HostRequest[] = [];
            
            querySnapshot.forEach((doc) => {
              requestsData.push({
                id: doc.id,
                ...doc.data()
              } as HostRequest);
            });

            requestsData.sort((a, b) => {
              const dateA = a.createdAt?.toDate?.() || new Date(0);
              const dateB = b.createdAt?.toDate?.() || new Date(0);
              return dateB.getTime() - dateA.getTime();
            });

            setHostRequests(requestsData);
          });
        }

        // Fetch all host requests (for admins)
        if (hasRole('admin')) {
          const allRequestsQuery = query(collection(db, 'Requests'));

          const unsubscribeAllRequests = onSnapshot(allRequestsQuery, (querySnapshot) => {
            const requestsData: HostRequest[] = [];
            
            querySnapshot.forEach((doc) => {
              requestsData.push({
                id: doc.id,
                ...doc.data()
              } as HostRequest);
            });

            requestsData.sort((a, b) => {
              const dateA = a.createdAt?.toDate?.() || new Date(0);
              const dateB = b.createdAt?.toDate?.() || new Date(0);
              return dateB.getTime() - dateA.getTime();
            });

            setAllHostRequests(requestsData);
          });

          // Fetch all cards (for admins)
          const allCardsQuery = query(collection(db, 'cards'));

          const unsubscribeAllCards = onSnapshot(allCardsQuery, (querySnapshot) => {
            const cardsData: CardData[] = [];
            
            querySnapshot.forEach((doc) => {
              cardsData.push({
                id: doc.id,
                ...doc.data()
              } as CardData);
            });

            cardsData.sort((a, b) => {
              const dateA = a.createdAt?.toDate?.() || new Date(0);
              const dateB = b.createdAt?.toDate?.() || new Date(0);
              return dateB.getTime() - dateA.getTime();
            });

            setAllCards(cardsData);
          });
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load dashboard data');
        setLoading(false);
      }
    };

    fetchData();
  }, [user, userProfile, hasRole, hasAnyRole]);

  const handleCardClick = (cardId: string) => {
    navigate(`/card/${cardId}`);
  };

  const handleHostRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to submit a request');
      return;
    }

    const requiredFields = ['fullName', 'phoneNumber', 'email', 'businessName', 'businessType', 'businessLocation', 'businessImageUrl', 'openingTime', 'closingTime'];
    const missingFields = requiredFields.filter(field => !hostRequestForm[field as keyof HostRequestFormData]);
    
    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    setSubmittingRequest(true);
    setError('');

    try {
      await addDoc(collection(db, 'Requests'), {
        ...hostRequestForm,
        userId: user.uid,
        status: 'pending',
        createdAt: new Date()
      });

      setHostRequestForm({
        fullName: '',
        phoneNumber: '',
        email: user.email || '',
        businessName: '',
        businessType: '',
        businessLocation: '',
        businessImageUrl: '',
        openingTime: '',
        closingTime: '',
        comments: ''
      });

      setActiveSection('requests');
      
    } catch (err) {
      console.error('Error submitting host request:', err);
      setError('Failed to submit request. Please try again.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleRequestAction = async (requestId: string, action: 'approved' | 'rejected') => {
    setProcessingRequest(requestId);
    
    try {
      const requestRef = doc(db, 'Requests', requestId);
      await updateDoc(requestRef, {
        status: action,
        processedAt: new Date(),
        processedBy: user?.uid
      });

      // If approved, update user role to host
      if (action === 'approved') {
        const request = allHostRequests.find(r => r.id === requestId);
        if (request) {
          const userRef = doc(db, 'users', request.userId);
          await updateDoc(userRef, {
            role: 'host',
            updatedAt: new Date()
          });
        }
      }
    } catch (err) {
      console.error('Error processing request:', err);
      setError('Failed to process request. Please try again.');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleMakeHost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!makeHostForm.email && !makeHostForm.userId) {
      setError('Please provide either email or user ID');
      return;
    }

    setMakingHost(true);
    setError('');

    try {
      let userQuery;
      if (makeHostForm.userId) {
        // Direct user ID lookup
        const userRef = doc(db, 'users', makeHostForm.userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          await updateDoc(userRef, {
            role: 'host',
            updatedAt: new Date(),
            promotedBy: user?.uid
          });
          
          setMakeHostForm({ email: '', userId: '' });
          alert('User successfully promoted to host!');
        } else {
          setError('User not found with that ID');
        }
      } else {
        // Email lookup
        userQuery = query(
          collection(db, 'users'),
          where('email', '==', makeHostForm.email)
        );
        
        const querySnapshot = await getDocs(userQuery);
        
        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          await updateDoc(userDoc.ref, {
            role: 'host',
            updatedAt: new Date(),
            promotedBy: user?.uid
          });
          
          setMakeHostForm({ email: '', userId: '' });
          alert('User successfully promoted to host!');
        } else {
          setError('User not found with that email');
        }
      }
    } catch (err) {
      console.error('Error making user host:', err);
      setError('Failed to promote user. Please try again.');
    } finally {
      setMakingHost(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Are you sure you want to delete this card? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'cards', cardId));
    } catch (err) {
      console.error('Error deleting card:', err);
      setError('Failed to delete card. Please try again.');
    }
  };

  const handleInputChange = (field: keyof HostRequestFormData, value: string) => {
    setHostRequestForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

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

  if (!user || !userProfile) {
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

  const renderSidebarNavigation = () => (
    <nav className="space-y-2">
      {/* User sections */}
      {hasAnyRole(['user', 'host']) && (
        <>
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
        </>
      )}

      {/* User-only sections */}
      {hasRole('user') && (
        <>
          <button
            onClick={() => setActiveSection('hostRequest')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
              activeSection === 'hostRequest'
                ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Building className="w-5 h-5" />
            <span className="font-medium">Request to become a host</span>
          </button>

          <button
            onClick={() => setActiveSection('requests')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
              activeSection === 'requests'
                ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText className="w-5 h-5" />
            <div className="flex items-center justify-between w-full">
              <span className="font-medium">Requests</span>
              {hostRequests.length > 0 && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {hostRequests.length}
                </span>
              )}
            </div>
          </button>
        </>
      )}

      {/* Host sections */}
      {hasRole('host') && (
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
      )}

      {/* Admin sections */}
      {hasRole('admin') && (
        <>
          <button
            onClick={() => setActiveSection('adminCards')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
              activeSection === 'adminCards'
                ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span className="font-medium">Cards</span>
          </button>

          <button
            onClick={() => setActiveSection('adminRequests')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
              activeSection === 'adminRequests'
                ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText className="w-5 h-5" />
            <div className="flex items-center justify-between w-full">
              <span className="font-medium">Requests</span>
              {allHostRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                  {allHostRequests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => setActiveSection('makeHost')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
              activeSection === 'makeHost'
                ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <UserCheck className="w-5 h-5" />
            <span className="font-medium">Make a host</span>
          </button>
        </>
      )}
    </nav>
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
                <p className="text-sm text-gray-500">
                  {userProfile.role === 'admin' ? 'Admin Panel' : 
                   userProfile.role === 'host' ? 'Host Panel' : 'User Panel'}
                </p>
              </div>
            </div>

            {renderSidebarNavigation()}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Welcome Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-8 mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                {userProfile.role === 'admin' ? <Shield className="w-8 h-8" /> :
                 userProfile.role === 'host' ? <Building className="w-8 h-8" /> :
                 <User className="w-8 h-8" />}
              </div>
              <div>
                <h1 className="text-3xl font-bold">Welcome back!</h1>
                <p className="text-blue-100 text-lg">{user.email}</p>
                <p className="text-blue-200 text-sm capitalize">{userProfile.role} Account</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Content based on active section */}
          {activeSection === 'bookings' && hasAnyRole(['user', 'host']) && (
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
                            <BookingCard key={booking.id} booking={booking} isUpcoming={true} onCardClick={handleCardClick} />
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
                            <BookingCard key={booking.id} booking={booking} isUpcoming={false} onCardClick={handleCardClick} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'openSlots' && hasAnyRole(['user', 'host']) && (
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
                        onClick={() => handleCardClick(booking.cardId)}
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

          {activeSection === 'cards' && hasRole('host') && (
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

          {activeSection === 'hostRequest' && hasRole('user') && (
            <div>
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Request to become a host</h2>
                <p className="text-gray-600 mb-8">
                  Fill out this form to request becoming a host. We'll review your application and get back to you.
                </p>

                <form onSubmit={handleHostRequestSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="fullName"
                        value={hostRequestForm.fullName}
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        id="phoneNumber"
                        value={hostRequestForm.phoneNumber}
                        onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter your phone number"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={hostRequestForm.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter your email"
                      />
                    </div>

                    <div>
                      <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
                        Name of Business *
                      </label>
                      <input
                        type="text"
                        id="businessName"
                        value={hostRequestForm.businessName}
                        onChange={(e) => handleInputChange('businessName', e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter your business name"
                      />
                    </div>

                    <div>
                      <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-2">
                        Business Type *
                      </label>
                      <input
                        type="text"
                        id="businessType"
                        value={hostRequestForm.businessType}
                        onChange={(e) => handleInputChange('businessType', e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="e.g., Sports Complex, Gym, Tennis Club"
                      />
                    </div>

                    <div>
                      <label htmlFor="businessLocation" className="block text-sm font-medium text-gray-700 mb-2">
                        Business Location *
                      </label>
                      <input
                        type="text"
                        id="businessLocation"
                        value={hostRequestForm.businessLocation}
                        onChange={(e) => handleInputChange('businessLocation', e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter your business address"
                      />
                    </div>

                    <div>
                      <label htmlFor="openingTime" className="block text-sm font-medium text-gray-700 mb-2">
                        Opening Time *
                      </label>
                      <input
                        type="text"
                        id="openingTime"
                        value={hostRequestForm.openingTime}
                        onChange={(e) => handleInputChange('openingTime', e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="e.g., 6:00 AM"
                      />
                    </div>

                    <div>
                      <label htmlFor="closingTime" className="block text-sm font-medium text-gray-700 mb-2">
                        Closing Time *
                      </label>
                      <input
                        type="text"
                        id="closingTime"
                        value={hostRequestForm.closingTime}
                        onChange={(e) => handleInputChange('closingTime', e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="e.g., 10:00 PM"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="businessImageUrl" className="block text-sm font-medium text-gray-700 mb-2">
                      Business Image URL *
                    </label>
                    <input
                      type="url"
                      id="businessImageUrl"
                      value={hostRequestForm.businessImageUrl}
                      onChange={(e) => handleInputChange('businessImageUrl', e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="https://example.com/business-image.jpg"
                    />
                  </div>

                  <div>
                    <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-2">
                      Comments (Optional)
                    </label>
                    <textarea
                      id="comments"
                      value={hostRequestForm.comments}
                      onChange={(e) => handleInputChange('comments', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Any additional information about your business..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingRequest}
                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                  >
                    {submittingRequest ? 'Submitting Request...' : 'Submit Host Request'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeSection === 'requests' && hasRole('user') && (
            <div>
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Requests</h2>
                <p className="text-gray-600 mb-6">
                  Track the status of your host requests here.
                </p>

                {hostRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No requests yet</h3>
                    <p className="text-gray-500 mb-6">
                      You haven't submitted any host requests yet.
                    </p>
                    <button
                      onClick={() => setActiveSection('hostRequest')}
                      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      Submit a Request
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {hostRequests.map((request) => (
                      <div key={request.id} className="border border-gray-200 rounded-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{request.businessName}</h3>
                            <p className="text-gray-600">{request.businessType}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            request.status === 'pending' 
                              ? 'bg-yellow-100 text-yellow-800'
                              : request.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Location:</span> {request.businessLocation}
                          </div>
                          <div>
                            <span className="font-medium">Hours:</span> {request.openingTime} - {request.closingTime}
                          </div>
                          <div>
                            <span className="font-medium">Contact:</span> {request.phoneNumber}
                          </div>
                          <div>
                            <span className="font-medium">Submitted:</span> {request.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                          </div>
                        </div>

                        {request.comments && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium text-gray-700">Comments:</span>
                            <p className="text-gray-600 mt-1">{request.comments}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Admin sections */}
          {activeSection === 'adminCards' && hasRole('admin') && (
            <div>
              <div className="bg-white rounded-xl shadow-lg p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">All Cards</h2>
                  <button
                    onClick={() => setShowAddCardForm(true)}
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md hover:shadow-lg font-medium"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add New Card
                  </button>
                </div>

                {allCards.length === 0 ? (
                  <div className="text-center py-12">
                    <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No cards yet</h3>
                    <p className="text-gray-500">No cards have been created yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allCards.map((card) => (
                      <div key={card.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300">
                        <div className="relative h-48 bg-gray-200">
                          <img 
                            src={card.imageUrl} 
                            alt={card.title} 
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => handleCardClick(card.id)}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'https://images.pexels.com/photos/3657154/pexels-photo-3657154.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';
                            }}
                          />
                          <div className="absolute top-2 right-2">
                            <button
                              onClick={() => handleDeleteCard(card.id)}
                              className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors duration-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="p-6">
                          <h3 
                            className="text-xl font-semibold text-gray-900 mb-2 cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => handleCardClick(card.id)}
                          >
                            {card.title}
                          </h3>
                          <div className="flex items-center justify-between mb-3">
                            <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                              {card.type}
                            </span>
                            <span className="text-gray-500 text-sm">
                              {card.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently added'}
                            </span>
                          </div>
                          
                          {(card.openingTime || card.closingTime) && (
                            <div className="flex items-center text-gray-600 text-sm mt-2">
                              <Clock className="w-4 h-4 mr-2" />
                              <span>
                                {card.openingTime && card.closingTime 
                                  ? `${card.openingTime} - ${card.closingTime}`
                                  : card.openingTime || card.closingTime
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'adminRequests' && hasRole('admin') && (
            <div>
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Host Requests</h2>
                <p className="text-gray-600 mb-6">
                  Review and manage host requests from users.
                </p>

                {allHostRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No requests yet</h3>
                    <p className="text-gray-500">No host requests have been submitted yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allHostRequests.map((request) => (
                      <div key={request.id} className="border border-gray-200 rounded-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{request.businessName}</h3>
                            <p className="text-gray-600">{request.businessType}</p>
                            <p className="text-sm text-gray-500">Requested by: {request.email}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              request.status === 'pending' 
                                ? 'bg-yellow-100 text-yellow-800'
                                : request.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </span>
                            
                            {request.status === 'pending' && (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleRequestAction(request.id, 'approved')}
                                  disabled={processingRequest === request.id}
                                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRequestAction(request.id, 'rejected')}
                                  disabled={processingRequest === request.id}
                                  className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Full Name:</span> {request.fullName}
                          </div>
                          <div>
                            <span className="font-medium">Phone:</span> {request.phoneNumber}
                          </div>
                          <div>
                            <span className="font-medium">Location:</span> {request.businessLocation}
                          </div>
                          <div>
                            <span className="font-medium">Hours:</span> {request.openingTime} - {request.closingTime}
                          </div>
                          <div>
                            <span className="font-medium">Submitted:</span> {request.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                          </div>
                        </div>

                        {request.comments && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium text-gray-700">Comments:</span>
                            <p className="text-gray-600 mt-1">{request.comments}</p>
                          </div>
                        )}

                        {request.businessImageUrl && (
                          <div className="mt-4">
                            <span className="font-medium text-gray-700">Business Image:</span>
                            <img 
                              src={request.businessImageUrl} 
                              alt={request.businessName}
                              className="mt-2 w-32 h-32 object-cover rounded-lg"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'https://images.pexels.com/photos/3657154/pexels-photo-3657154.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'makeHost' && hasRole('admin') && (
            <div>
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Make a Host</h2>
                <p className="text-gray-600 mb-8">
                  Promote a user to host status by entering their email or user ID.
                </p>

                <form onSubmit={handleMakeHost} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={makeHostForm.email}
                      onChange={(e) => setMakeHostForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter user's email address"
                    />
                  </div>

                  <div className="text-center text-gray-500">
                    <span>OR</span>
                  </div>

                  <div>
                    <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-2">
                      User ID
                    </label>
                    <input
                      type="text"
                      id="userId"
                      value={makeHostForm.userId}
                      onChange={(e) => setMakeHostForm(prev => ({ ...prev, userId: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter user's ID"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={makingHost || (!makeHostForm.email && !makeHostForm.userId)}
                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
                  >
                    {makingHost ? 'Promoting User...' : 'Make Host'}
                  </button>
                </form>
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
const BookingCard: React.FC<{ 
  booking: BookingData; 
  isUpcoming: boolean; 
  onCardClick: (cardId: string) => void;
}> = ({ booking, isUpcoming, onCardClick }) => {
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
      onClick={() => onCardClick(booking.cardId)}
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