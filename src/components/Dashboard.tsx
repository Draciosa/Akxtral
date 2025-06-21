import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs,
  getDoc
} from 'firebase/firestore';
import { 
  Calendar, 
  Users, 
  Plus, 
  Clock, 
  Edit, 
  Save, 
  X, 
  Trash2, 
  Check, 
  UserPlus,
  Settings,
  FileText,
  AlertCircle
} from 'lucide-react';
import AddCard from './AddCard';

type CardData = {
  id: string;
  title: string;
  imageUrl: string;
  type: string;
  openingTime: string;
  closingTime: string;
  userId: string;
  assignedHost?: string;
  createdAt: any;
  Card_ID: string;
};

type Booking = {
  id: string;
  userId: string;
  cardId: string;
  Card_ID: string;
  date: string;
  timeSlot: string;
  openSlots?: number;
  bookingTime: any;
  cardTitle?: string;
  cardType?: string;
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
  status: 'pending' | 'approved' | 'rejected';
  adminMessage?: string;
  createdAt: any;
  updatedAt: any;
};

const Dashboard: React.FC = () => {
  const { user, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [openSlots, setOpenSlots] = useState<Booking[]>([]);
  const [cards, setCards] = useState<CardData[]>([]);
  const [requests, setRequests] = useState<HostRequest[]>([]);
  const [userRequests, setUserRequests] = useState<HostRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CardData>>({});
  const [saving, setSaving] = useState(false);

  // Host request form state
  const [showHostRequestForm, setShowHostRequestForm] = useState(false);
  const [hostRequestForm, setHostRequestForm] = useState({
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

  // Admin forms state
  const [makeHostForm, setMakeHostForm] = useState({
    email: '',
    userId: ''
  });
  const [assignCardForm, setAssignCardForm] = useState({
    cardId: '',
    hostEmail: '',
    hostUserId: ''
  });
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [requestAction, setRequestAction] = useState<{id: string, action: 'approve' | 'reject', message: string} | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribes: (() => void)[] = [];

    // Fetch user's bookings
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('userId', '==', user.uid)
    );
    unsubscribes.push(onSnapshot(bookingsQuery, async (snapshot) => {
      const bookingsData: Booking[] = [];
      for (const docSnapshot of snapshot.docs) {
        const booking = { id: docSnapshot.id, ...docSnapshot.data() } as Booking;
        
        // Fetch card details
        try {
          const cardDoc = await getDoc(doc(db, 'cards', booking.cardId));
          if (cardDoc.exists()) {
            const cardData = cardDoc.data();
            booking.cardTitle = cardData.title;
            booking.cardType = cardData.type;
          }
        } catch (error) {
          console.error('Error fetching card details:', error);
        }
        
        bookingsData.push(booking);
      }
      setBookings(bookingsData);
    }));

    // Fetch user's open slots
    const openSlotsQuery = query(
      collection(db, 'bookings'),
      where('userId', '==', user.uid),
      where('openSlots', '>', 0)
    );
    unsubscribes.push(onSnapshot(openSlotsQuery, async (snapshot) => {
      const openSlotsData: Booking[] = [];
      for (const docSnapshot of snapshot.docs) {
        const booking = { id: docSnapshot.id, ...docSnapshot.data() } as Booking;
        
        // Fetch card details
        try {
          const cardDoc = await getDoc(doc(db, 'cards', booking.cardId));
          if (cardDoc.exists()) {
            const cardData = cardDoc.data();
            booking.cardTitle = cardData.title;
            booking.cardType = cardData.type;
          }
        } catch (error) {
          console.error('Error fetching card details:', error);
        }
        
        openSlotsData.push(booking);
      }
      setOpenSlots(openSlotsData);
    }));

    // Fetch user's requests
    const userRequestsQuery = query(
      collection(db, 'Requests'),
      where('userId', '==', user.uid)
    );
    unsubscribes.push(onSnapshot(userRequestsQuery, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HostRequest[];
      setUserRequests(requestsData);
    }));

    // Fetch cards based on role
    if (hasRole('admin')) {
      // Admins see all cards
      unsubscribes.push(onSnapshot(collection(db, 'cards'), (snapshot) => {
        const cardsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CardData[];
        setCards(cardsData);
      }));

      // Admins see all requests
      unsubscribes.push(onSnapshot(collection(db, 'Requests'), (snapshot) => {
        const requestsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as HostRequest[];
        setRequests(requestsData);
      }));
    } else if (hasRole('host')) {
      // Hosts see only their assigned cards
      const hostCardsQuery = query(
        collection(db, 'cards'),
        where('assignedHost', '==', user.uid)
      );
      unsubscribes.push(onSnapshot(hostCardsQuery, (snapshot) => {
        const cardsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CardData[];
        setCards(cardsData);
      }));
    }

    setLoading(false);

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [user, hasRole]);

  const handleHostRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      await addDoc(collection(db, 'Requests'), {
        ...hostRequestForm,
        userId: user.uid,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      setHostRequestForm({
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
      setShowHostRequestForm(false);
      alert('Host request submitted successfully!');
    } catch (error) {
      console.error('Error submitting host request:', error);
      alert('Failed to submit request. Please try again.');
    }
  };

  const handleMakeHost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasRole('admin')) return;

    try {
      let targetUserId = makeHostForm.userId;

      // If email is provided but not userId, find the user by email
      if (makeHostForm.email && !makeHostForm.userId) {
        const usersQuery = query(
          collection(db, 'users'),
          where('email', '==', makeHostForm.email)
        );
        const usersSnapshot = await getDocs(usersQuery);
        
        if (usersSnapshot.empty) {
          alert('User not found with this email');
          return;
        }
        
        targetUserId = usersSnapshot.docs[0].id;
      }

      if (!targetUserId) {
        alert('Please provide either email or user ID');
        return;
      }

      await updateDoc(doc(db, 'users', targetUserId), {
        role: 'host',
        updatedAt: new Date()
      });

      setMakeHostForm({ email: '', userId: '' });
      alert('User role updated to host successfully!');
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role. Please try again.');
    }
  };

  const handleAssignCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasRole('admin')) return;

    try {
      let targetUserId = assignCardForm.hostUserId;

      // If email is provided but not userId, find the user by email
      if (assignCardForm.hostEmail && !assignCardForm.hostUserId) {
        const usersQuery = query(
          collection(db, 'users'),
          where('email', '==', assignCardForm.hostEmail)
        );
        const usersSnapshot = await getDocs(usersQuery);
        
        if (usersSnapshot.empty) {
          alert('User not found with this email');
          return;
        }
        
        targetUserId = usersSnapshot.docs[0].id;
      }

      if (!targetUserId || !assignCardForm.cardId) {
        alert('Please provide card ID and host information');
        return;
      }

      await updateDoc(doc(db, 'cards', assignCardForm.cardId), {
        assignedHost: targetUserId,
        updatedAt: new Date()
      });

      setAssignCardForm({ cardId: '', hostEmail: '', hostUserId: '' });
      alert('Card assigned to host successfully!');
    } catch (error) {
      console.error('Error assigning card:', error);
      alert('Failed to assign card. Please try again.');
    }
  };

  const handleRequestAction = async () => {
    if (!requestAction || !hasRole('admin')) return;

    setProcessingRequest(requestAction.id);
    try {
      const updateData: any = {
        status: requestAction.action,
        adminMessage: requestAction.message,
        updatedAt: new Date()
      };

      await updateDoc(doc(db, 'Requests', requestAction.id), updateData);

      // If approving, also update user role to host
      if (requestAction.action === 'approve') {
        const request = requests.find(r => r.id === requestAction.id);
        if (request) {
          await updateDoc(doc(db, 'users', request.userId), {
            role: 'host',
            updatedAt: new Date()
          });
        }
      }

      setRequestAction(null);
      alert(`Request ${requestAction.action}d successfully!`);
    } catch (error) {
      console.error('Error processing request:', error);
      alert('Failed to process request. Please try again.');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleEditCard = (card: CardData) => {
    setEditingCard(card.id);
    setEditForm({
      title: card.title,
      imageUrl: card.imageUrl,
      type: card.type,
      openingTime: card.openingTime,
      closingTime: card.closingTime
    });
  };

  const handleSaveEdit = async (cardId: string) => {
    if (!editForm.title || !editForm.imageUrl || !editForm.type) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, 'cards', cardId), {
        title: editForm.title,
        imageUrl: editForm.imageUrl,
        type: editForm.type,
        openingTime: editForm.openingTime || '',
        closingTime: editForm.closingTime || '',
        updatedAt: new Date()
      });
      
      setEditingCard(null);
      setEditForm({});
    } catch (error) {
      console.error('Error updating card:', error);
      alert('Failed to update card. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!hasRole('admin')) return;
    
    if (window.confirm('Are you sure you want to delete this card?')) {
      try {
        await deleteDoc(doc(db, 'cards', cardId));
        alert('Card deleted successfully!');
      } catch (error) {
        console.error('Error deleting card:', error);
        alert('Failed to delete card. Please try again.');
      }
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getAvailableTabs = () => {
    const tabs = [
      { id: 'bookings', label: 'Your Bookings', icon: Calendar, roles: ['user', 'host', 'admin'] },
      { id: 'openSlots', label: 'Your Open Slots', icon: Users, roles: ['user', 'host', 'admin'] },
    ];

    if (hasRole('user')) {
      tabs.push(
        { id: 'hostRequest', label: 'Request to become a host', icon: UserPlus, roles: ['user'] },
        { id: 'userRequests', label: 'Your Requests', icon: FileText, roles: ['user'] }
      );
    }

    if (hasRole('host')) {
      tabs.push({ id: 'cards', label: 'Your Cards', icon: Settings, roles: ['host'] });
    }

    if (hasRole('admin')) {
      tabs.push(
        { id: 'cards', label: 'All Cards', icon: Settings, roles: ['admin'] },
        { id: 'requests', label: 'Host Requests', icon: FileText, roles: ['admin'] },
        { id: 'makeHost', label: 'Make a Host', icon: UserPlus, roles: ['admin'] },
        { id: 'assignCard', label: 'Assign Cards', icon: Plus, roles: ['admin'] }
      );
    }

    return tabs.filter(tab => 
      tab.roles.some(role => hasRole(role as any))
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

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Please log in to access the dashboard</h2>
        </div>
      </div>
    );
  }

  const availableTabs = getAvailableTabs();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Welcome back, {user.email}! 
          {hasRole('admin') && <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm">Admin</span>}
          {hasRole('host') && <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">Host</span>}
          {hasRole('user') && <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">User</span>}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {availableTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Your Bookings */}
        {activeTab === 'bookings' && (
          <div>
            <h2 className="text-2xl font-semibold mb-6">Your Bookings</h2>
            {bookings.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No bookings yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bookings.map((booking) => (
                  <div key={booking.id} className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="font-semibold text-lg mb-2">{booking.cardTitle}</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>{formatDate(booking.date)}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>{booking.timeSlot}</span>
                      </div>
                      {booking.openSlots && booking.openSlots > 0 && (
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-2" />
                          <span>{booking.openSlots} open slots</span>
                        </div>
                      )}
                      <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                        {booking.cardType}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Your Open Slots */}
        {activeTab === 'openSlots' && (
          <div>
            <h2 className="text-2xl font-semibold mb-6">Your Open Slots</h2>
            {openSlots.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No open slots available</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {openSlots.map((slot) => (
                  <div key={slot.id} className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="font-semibold text-lg mb-2">{slot.cardTitle}</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>{formatDate(slot.date)}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>{slot.timeSlot}</span>
                      </div>
                      <div className="flex items-center text-green-600">
                        <Users className="w-4 h-4 mr-2" />
                        <span className="font-medium">{slot.openSlots} slots available</span>
                      </div>
                      <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                        {slot.cardType}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Request to become a host */}
        {activeTab === 'hostRequest' && hasRole('user') && (
          <div>
            <h2 className="text-2xl font-semibold mb-6">Request to become a host</h2>
            {!showHostRequestForm ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Ready to become a host?</p>
                <button
                  onClick={() => setShowHostRequestForm(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Submit Host Request
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-8">
                <form onSubmit={handleHostRequestSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={hostRequestForm.fullName}
                        onChange={(e) => setHostRequestForm({...hostRequestForm, fullName: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={hostRequestForm.phoneNumber}
                        onChange={(e) => setHostRequestForm({...hostRequestForm, phoneNumber: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={hostRequestForm.email}
                        onChange={(e) => setHostRequestForm({...hostRequestForm, email: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={hostRequestForm.businessName}
                        onChange={(e) => setHostRequestForm({...hostRequestForm, businessName: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Type *
                      </label>
                      <input
                        type="text"
                        required
                        value={hostRequestForm.businessType}
                        onChange={(e) => setHostRequestForm({...hostRequestForm, businessType: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Location *
                      </label>
                      <input
                        type="text"
                        required
                        value={hostRequestForm.businessLocation}
                        onChange={(e) => setHostRequestForm({...hostRequestForm, businessLocation: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Image URL *
                      </label>
                      <input
                        type="url"
                        required
                        value={hostRequestForm.businessImageUrl}
                        onChange={(e) => setHostRequestForm({...hostRequestForm, businessImageUrl: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Opening Time *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., 6:00 AM"
                        value={hostRequestForm.openingTime}
                        onChange={(e) => setHostRequestForm({...hostRequestForm, openingTime: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Closing Time *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., 10:00 PM"
                        value={hostRequestForm.closingTime}
                        onChange={(e) => setHostRequestForm({...hostRequestForm, closingTime: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comments (Optional)
                    </label>
                    <textarea
                      rows={4}
                      value={hostRequestForm.comments}
                      onChange={(e) => setHostRequestForm({...hostRequestForm, comments: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any additional information..."
                    />
                  </div>
                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Submit Request
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowHostRequestForm(false)}
                      className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* User Requests */}
        {activeTab === 'userRequests' && hasRole('user') && (
          <div>
            <h2 className="text-2xl font-semibold mb-6">Your Requests</h2>
            {userRequests.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No requests submitted yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userRequests.map((request) => (
                  <div key={request.id} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-semibold text-lg">{request.businessName}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        request.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                      <div><strong>Business Type:</strong> {request.businessType}</div>
                      <div><strong>Location:</strong> {request.businessLocation}</div>
                      <div><strong>Phone:</strong> {request.phoneNumber}</div>
                      <div><strong>Hours:</strong> {request.openingTime} - {request.closingTime}</div>
                    </div>
                    {request.adminMessage && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Admin Message:</h4>
                        <p className="text-blue-800">{request.adminMessage}</p>
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-4">
                      Submitted: {request.createdAt?.toDate?.()?.toLocaleDateString() || 'Recently'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Cards (Host/Admin) */}
        {activeTab === 'cards' && (hasRole('host') || hasRole('admin')) && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">
                {hasRole('admin') ? 'All Cards' : 'Your Cards'}
              </h2>
              {hasRole('admin') && (
                <button
                  onClick={() => setShowAddCard(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Card</span>
                </button>
              )}
            </div>

            {showAddCard && hasRole('admin') && (
              <div className="bg-white rounded-lg shadow-md p-8 mb-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-semibold">Add New Card</h3>
                  <button
                    onClick={() => setShowAddCard(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <AddCard onSuccess={() => setShowAddCard(false)} />
              </div>
            )}

            {cards.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {hasRole('admin') ? 'No cards in the system yet' : 'No cards assigned to you yet'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card) => (
                  <div key={card.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="relative h-48">
                      {editingCard === card.id ? (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                          <input
                            type="url"
                            value={editForm.imageUrl || ''}
                            onChange={(e) => setEditForm({...editForm, imageUrl: e.target.value})}
                            placeholder="Image URL"
                            className="w-full px-3 py-2 bg-white rounded text-sm"
                          />
                        </div>
                      ) : (
                        <img 
                          src={card.imageUrl} 
                          alt={card.title} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://images.pexels.com/photos/3657154/pexels-photo-3657154.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2';
                          }}
                        />
                      )}
                      <div className="absolute top-2 right-2 flex space-x-1">
                        {editingCard === card.id ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(card.id)}
                              disabled={saving}
                              className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {setEditingCard(null); setEditForm({});}}
                              className="p-2 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditCard(card)}
                              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {hasRole('admin') && (
                              <button
                                onClick={() => handleDeleteCard(card.id)}
                                className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="p-6">
                      {editingCard === card.id ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editForm.title || ''}
                            onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                            placeholder="Card title"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            value={editForm.type || ''}
                            onChange={(e) => setEditForm({...editForm, type: e.target.value})}
                            placeholder="Card type"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={editForm.openingTime || ''}
                              onChange={(e) => setEditForm({...editForm, openingTime: e.target.value})}
                              placeholder="Opening time"
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                            <input
                              type="text"
                              value={editForm.closingTime || ''}
                              onChange={(e) => setEditForm({...editForm, closingTime: e.target.value})}
                              placeholder="Closing time"
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">{card.title}</h3>
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
                          {hasRole('admin') && card.assignedHost && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-500">
                                Assigned to: {card.assignedHost}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Host Requests (Admin) */}
        {activeTab === 'requests' && hasRole('admin') && (
          <div>
            <h2 className="text-2xl font-semibold mb-6">Host Requests</h2>
            {requests.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No host requests yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div key={request.id} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{request.fullName}</h3>
                        <p className="text-gray-600">{request.businessName}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        request.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                      <div><strong>Email:</strong> {request.email}</div>
                      <div><strong>Phone:</strong> {request.phoneNumber}</div>
                      <div><strong>Business Type:</strong> {request.businessType}</div>
                      <div><strong>Location:</strong> {request.businessLocation}</div>
                      <div><strong>Hours:</strong> {request.openingTime} - {request.closingTime}</div>
                      <div><strong>Submitted:</strong> {request.createdAt?.toDate?.()?.toLocaleDateString()}</div>
                    </div>

                    {request.comments && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <strong className="text-sm">Comments:</strong>
                        <p className="text-sm text-gray-600 mt-1">{request.comments}</p>
                      </div>
                    )}

                    {request.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setRequestAction({id: request.id, action: 'approve', message: ''})}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                        >
                          <Check className="w-4 h-4" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => setRequestAction({id: request.id, action: 'reject', message: ''})}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                        >
                          <X className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}

                    {request.adminMessage && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Admin Message:</h4>
                        <p className="text-blue-800">{request.adminMessage}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Make a Host (Admin) */}
        {activeTab === 'makeHost' && hasRole('admin') && (
          <div>
            <h2 className="text-2xl font-semibold mb-6">Make a Host</h2>
            <div className="bg-white rounded-lg shadow-md p-8">
              <form onSubmit={handleMakeHost} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    User Email
                  </label>
                  <input
                    type="email"
                    value={makeHostForm.email}
                    onChange={(e) => setMakeHostForm({...makeHostForm, email: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    User ID (Optional if email provided)
                  </label>
                  <input
                    type="text"
                    value={makeHostForm.userId}
                    onChange={(e) => setMakeHostForm({...makeHostForm, userId: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="User UID"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Make Host
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Assign Cards (Admin) */}
        {activeTab === 'assignCard' && hasRole('admin') && (
          <div>
            <h2 className="text-2xl font-semibold mb-6">Assign Cards</h2>
            <div className="bg-white rounded-lg shadow-md p-8">
              <form onSubmit={handleAssignCard} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Card ID
                  </label>
                  <select
                    value={assignCardForm.cardId}
                    onChange={(e) => setAssignCardForm({...assignCardForm, cardId: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a card</option>
                    {cards.map(card => (
                      <option key={card.id} value={card.id}>
                        {card.title} ({card.type})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Host Email
                  </label>
                  <input
                    type="email"
                    value={assignCardForm.hostEmail}
                    onChange={(e) => setAssignCardForm({...assignCardForm, hostEmail: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="host@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Host User ID (Optional if email provided)
                  </label>
                  <input
                    type="text"
                    value={assignCardForm.hostUserId}
                    onChange={(e) => setAssignCardForm({...assignCardForm, hostUserId: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Host UID"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Assign Card
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Request Action Modal */}
      {requestAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {requestAction.action === 'approve' ? 'Approve' : 'Reject'} Request
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message to user
                </label>
                <textarea
                  rows={4}
                  value={requestAction.message}
                  onChange={(e) => setRequestAction({...requestAction, message: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Enter a message explaining the ${requestAction.action} decision...`}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleRequestAction}
                  disabled={processingRequest === requestAction.id}
                  className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors ${
                    requestAction.action === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  } disabled:opacity-50`}
                >
                  {processingRequest === requestAction.id ? 'Processing...' : 
                   requestAction.action === 'approve' ? 'Approve' : 'Reject'}
                </button>
                <button
                  onClick={() => setRequestAction(null)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;