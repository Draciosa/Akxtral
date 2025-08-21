import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  Settings, 
  FileText, 
  Bell,
  CheckCircle,
  XCircle,
  AlertTriangle,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  ChevronDown,
  ChevronUp,
  Minus,
  UserCheck,
  Shield,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  serverTimestamp,
  orderBy,
  getDocs,
  getDoc,
  // NEW: server-side pagination helpers
  limit as fbLimit,
  startAfter,
  getCountFromServer,
} from 'firebase/firestore';
import AddCard from './AddCard';
import CardList from './CardList';
import RequestNewCard from './RequestNewCard';
import HostRequestForm from './HostRequestForm';
import ManageHomepage from './ManageHomepage';
import ManageHosts from './ManageHosts';
import AssignCards from './AssignCards';
import UserSettings from './UserSettings';
import MfaResetRequest from './MfaResetRequest';

interface Booking {
  id: string;
  userId: string;
  cardId: string;
  Card_ID: string;
  date: string;
  timeSlot: string;
  openSlots?: number;
  perSlotPrice?: number;
  joinedSlots?: number;
  originalBookingId?: string;
  bookingTime: any;
  cardTitle?: string;
  cardType?: string;
  cardLocation?: string;
}

interface Request {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName?: string;
  userPhoneNumber?: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  requestType: 'host-request' | 'new-card' | 'mfa-reset';
  cardData?: any;
  createdAt: any;
  updatedAt: any;
  adminResponse?: string;
}

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: any;
  joinedByUserId?: string;
  joinedByEmail?: string;
  joinedSlots?: number;
  bookingId?: string;
  joinedByDisplayName?: string;
  joinedByPhoneNumber?: string;
  bookedByUserId?: string;
  bookedByEmail?: string;
  bookedByDisplayName?: string;
  bookedByPhoneNumber?: string;
  cardTitle?: string;
  bookingDate?: string;
  bookingTimeSlots?: string[];
}

const ITEMS_PER_PAGE = 5;

const Dashboard: React.FC = () => {
  const { user, hasRole, userProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('notifications');
  const [activeRequestTab, setActiveRequestTab] = useState('host-requests');

  // === Your Bookings (now server-side paginated + real-time per page) ===
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingsTotalCount, setBookingsTotalCount] = useState<number>(0);
  const [bookingsCursors, setBookingsCursors] = useState<any[]>([]); // last doc of each loaded page
  const bookingsUnsubRef = useRef<null | (() => void)>(null);
  const [bookingsRefreshNonce, setBookingsRefreshNonce] = useState<number>(0); // bumps to re-subscribe current page

  // everything else unchanged
  const [requestsPage, setRequestsPage] = useState(1);
  const [notificationsPage, setNotificationsPage] = useState(1);

  const [requests, setRequests] = useState<Request[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set());

  // ---- SERVER-SIDE PAGINATION HELPERS (BOOKINGS) ----
  const bookingsBaseQuery = (uid: string) =>
    query(
      collection(db, 'bookings'),
      where('userId', '==', uid),
      orderBy('bookingTime', 'desc')
    );

  const subscribeBookingsPage = async (page: number) => {
    if (!user) return;

    // Cleanup previous subscription
    if (bookingsUnsubRef.current) {
      bookingsUnsubRef.current();
      bookingsUnsubRef.current = null;
    }

    // Make sure total count is current (cheap aggregation)
    try {
      const countSnap = await getCountFromServer(bookingsBaseQuery(user.uid));
      const newTotal = countSnap.data().count;
      setBookingsTotalCount(newTotal);
    } catch (e) {
      console.error('Failed to fetch bookings count', e);
    }

    // Build paged query
    let q = query(bookingsBaseQuery(user.uid), fbLimit(ITEMS_PER_PAGE));
    if (page > 1) {
      // Ensure we have a cursor for the previous page; if not, backfill by loading pages sequentially until we have it
      let cursor = bookingsCursors[page - 2];
      if (!cursor) {
        // Load missing cursors quietly (one-time reads, not snapshots)
        try {
          let tmpQ = query(bookingsBaseQuery(user.uid), fbLimit(ITEMS_PER_PAGE));
          let lastDoc: any = null;
          const newCursors: any[] = [...bookingsCursors];
          for (let p = 1; p < page; p++) {
            const snap = await getDocs(tmpQ);
            if (snap.docs.length === 0) break;
            lastDoc = snap.docs[snap.docs.length - 1];
            newCursors[p - 1] = lastDoc;
            tmpQ = query(bookingsBaseQuery(user.uid), startAfter(lastDoc), fbLimit(ITEMS_PER_PAGE));
          }
          setBookingsCursors(newCursors);
          cursor = newCursors[page - 2];
        } catch (e) {
          console.error('Error preloading cursors', e);
        }
      }
      if (cursor) {
        q = query(bookingsBaseQuery(user.uid), startAfter(cursor), fbLimit(ITEMS_PER_PAGE));
      }
    }

    // Real-time subscription for the current page
    const unsub = onSnapshot(q, async (snapshot) => {
      const pageBookings: Booking[] = [];

      for (const docSnapshot of snapshot.docs) {
        const bookingData = {
          id: docSnapshot.id,
          ...docSnapshot.data()
        } as Booking;

        // Fetch card details (as before)
        try {
          if (bookingData.cardId) {
            const cardDoc = await getDoc(doc(db, 'cards', bookingData.cardId));
            if (cardDoc.exists()) {
              const cardData = cardDoc.data();
              bookingData.cardTitle = cardData.title;
              bookingData.cardType = cardData.type;
              bookingData.cardLocation = cardData.location;
            }
          }
        } catch (error) {
          console.error('Error fetching card details:', error);
        }

        pageBookings.push(bookingData);
      }

      // Save last doc as cursor for this page
      const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
      setBookings((prev) => pageBookings);
      setBookingsCursors((prev) => {
        const next = [...prev];
        // Page index -> lastDoc
        if (lastDoc) next[bookingsPage - 1] = lastDoc;
        return next;
      });
      setLoading(false);
    }, (err) => {
      console.error('Bookings page snapshot error:', err);
      setLoading(false);
    });

    bookingsUnsubRef.current = unsub;
  };

  // Subscribe/refresh current bookings page whenever user/page/nonce changes
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    subscribeBookingsPage(bookingsPage);
    // cleanup on unmount or dependency change
    return () => {
      if (bookingsUnsubRef.current) {
        bookingsUnsubRef.current();
        bookingsUnsubRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, bookingsPage, bookingsRefreshNonce]);

  // --- OTHER SNAPSHOTS (UNCHANGED) ---
  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const unsubscribes: (() => void)[] = [];

    // Requests for admins
    if (hasRole('admin')) {
      const requestsQuery = query(
        collection(db, 'Requests'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
        const requestsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Request[];
        setRequests(requestsData);
      });

      unsubscribes.push(unsubscribeRequests);
    }

    // Notifications for the user
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(notificationsData);
    });

    unsubscribes.push(unsubscribeNotifications);

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [user, hasRole, navigate]);

  const generateCardId = (): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 30; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleApproveRequest = async (requestId: string, request: Request, adminResponse: string) => {
    if (!adminResponse.trim()) {
      alert('Please provide a response message');
      return;
    }

    try {
      if (request.requestType === 'host-request') {
        // Update user role to host
        await updateDoc(doc(db, 'users', request.userId), {
          role: 'host',
          updatedAt: serverTimestamp()
        });

        // Create the card if cardData exists
        if (request.cardData) {
          const cardId = generateCardId();
          await addDoc(collection(db, 'cards'), {
            ...request.cardData,
            Card_ID: cardId,
            userId: request.userId,
            assignedHost: request.userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      } else if (request.requestType === 'new-card' && request.cardData) {
        // Create the new card
        const cardId = generateCardId();
        await addDoc(collection(db, 'cards'), {
          ...request.cardData,
          Card_ID: cardId,
          userId: request.userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else if (request.requestType === 'mfa-reset') {
        // Reset user's MFA
        await updateDoc(doc(db, 'users', request.userId), {
          mfaEnabled: false,
          mfaSecret: '',
          updatedAt: serverTimestamp()
        });
      }

      // Update request status
      await updateDoc(doc(db, 'Requests', requestId), {
        status: 'approved',
        adminResponse: adminResponse,
        updatedAt: serverTimestamp()
      });

      // Create notification for the user
      let notificationMessage = adminResponse;
      if (request.requestType === 'host-request') {
        notificationMessage += '\n\nYour request to become a host has been approved. You can now create and manage cards.';
      } else if (request.requestType === 'new-card') {
        notificationMessage += '\n\nYour card request has been approved and the card has been created.';
      } else if (request.requestType === 'mfa-reset') {
        notificationMessage += '\n\nYour MFA has been reset. You can set up MFA again from your profile settings.';
      }

      await addDoc(collection(db, 'notifications'), {
        userId: request.userId,
        type: 'request_approved',
        title: 'Request Approved!',
        message: notificationMessage,
        read: false,
        createdAt: serverTimestamp()
      });

    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request. Please try again.');
    }
  };

  const handleRejectRequest = async (requestId: string, request: Request, adminResponse: string) => {
    if (!adminResponse.trim()) {
      alert('Please provide a response message');
      return;
    }

    try {
      await updateDoc(doc(db, 'Requests', requestId), {
        status: 'rejected',
        adminResponse: adminResponse,
        updatedAt: serverTimestamp()
      });

      // Create notification for the user
      let notificationMessage = adminResponse;
      if (request.requestType === 'host-request') {
        notificationMessage += '\n\nYour request to become a host has been rejected.';
      } else if (request.requestType === 'new-card') {
        notificationMessage += '\n\nYour card request has been rejected.';
      } else if (request.requestType === 'mfa-reset') {
        notificationMessage += '\n\nYour MFA reset request has been rejected.';
      }

      await addDoc(collection(db, 'notifications'), {
        userId: request.userId,
        type: 'request_rejected',
        title: 'Request Rejected',
        message: notificationMessage,
        read: false,
        createdAt: serverTimestamp()
      });

    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Failed to reject request. Please try again.');
    }
  };

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleViewReceipt = (bookingId: string) => {
    navigate(`/receipt/${bookingId}`);
  };

  const toggleBookingExpansion = (bookingId: string) => {
    setExpandedBookings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId);
      } else {
        newSet.add(bookingId);
      }
      return newSet;
    });
  };

  const handleUpdateOpenSlots = async (bookingId: string, newOpenSlots: number) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        openSlots: newOpenSlots
      });
    } catch (error) {
      console.error('Error updating open slots:', error);
      alert('Failed to update open slots. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp?.toDate) return 'Unknown';
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isBookingCompleted = (booking: Booking) => {
    const bookingDateTime = new Date(booking.date + ' ' + booking.timeSlot);
    return bookingDateTime < new Date();
  };

  // NOTE: With server-side pagination, these sections reflect the current page window.
  const upcomingBookings = bookings.filter(booking => !isBookingCompleted(booking));
  const completedBookings = bookings.filter(booking => isBookingCompleted(booking));

  const unreadNotifications = notifications.filter(n => !n.read);

  // Filter requests by type
  const hostRequests = requests.filter(r => r.requestType === 'host-request' || r.requestType === 'new-card');
  const mfaResetRequests = requests.filter(r => r.requestType === 'mfa-reset');

  // Client-side pagination helpers for notifications/requests (unchanged)
  const getPaginatedItems = (items: any[], page: number) => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return items.slice(startIndex, endIndex);
    };
  const getTotalPages = (items: any[]) => Math.ceil(items.length / ITEMS_PER_PAGE);

  const PaginationControls = ({ 
    currentPage, 
    totalPages, 
    onPageChange 
  }: { 
    currentPage: number; 
    totalPages: number; 
    onPageChange: (page: number) => void; 
  }) => {
    if (totalPages <= 1) return null;

    const safeChange = (next: number) => {
      if (next < 1 || next > totalPages) return;
      onPageChange(next);
    };

    return (
      <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mt-6">
        <button
          onClick={() => safeChange(currentPage - 1)}
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
                onClick={() => safeChange(pageNum)}
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
          onClick={() => safeChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    );
  };

  const getRoleTag = (role: string) => {
    const roleColors = {
      user: 'bg-blue-100 text-blue-800',
      host: 'bg-purple-100 text-purple-800',
      admin: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[role] || 'bg-gray-100 text-gray-800'}`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    );
  };

const bookingsTotalPages = Math.max(
  1,
  Math.ceil(Math.min(bookingsTotalCount, bookings.length + (bookingsPage - 1) * ITEMS_PER_PAGE) / ITEMS_PER_PAGE)
);

  const refreshCurrentBookingsPage = () => {
    // bump nonce to teardown & resubscribe only the bookings page listener
    setBookingsRefreshNonce(n => n + 1);
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Please log in to access your dashboard</h2>
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

  const tabs = [
    { id: 'notifications', label: `Notifications ${unreadNotifications.length > 0 ? `(${unreadNotifications.length})` : ''}`, icon: Bell },
     ...((hasRole('user') || hasRole('host')) ? [
    { id: 'bookings', label: 'Your Bookings', icon: Calendar }
  ] : []),
    ...(hasRole('user') ? [
      { id: 'host-request', label: 'Become a Host', icon: UserPlus },
      { id: 'mfa-reset', label: 'MFA Reset', icon: Shield }
    ] : []),
    ...(hasRole('host') ? [
      { id: 'cards', label: 'Your Cards', icon: FileText },
      { id: 'request-card', label: 'Request New Card', icon: FileText },
      { id: 'mfa-reset', label: 'MFA Reset', icon: Shield }
    ] : []),
    ...(hasRole('admin') ? [
      { id: 'cards', label: 'All Cards', icon: FileText },
      { id: 'add-card', label: 'Add Card', icon: Plus },
      { id: 'requests', label: 'Requests', icon: FileText },
      { id: 'assign-cards', label: 'Assign Cards', icon: UserCheck },
      { id: 'user-settings', label: 'User Settings', icon: Users },
      { id: 'manage-homepage', label: 'Manage Homepage', icon: Settings },
      { id: 'manage-hosts', label: 'Manage Hosts', icon: Users }
    ] : []),
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
          <p className="text-gray-600">Welcome back, {userProfile?.displayName || user.email}</p>
          {userProfile?.role && getRoleTag(userProfile.role)}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-lg mb-8">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-2 sm:space-x-8 px-4 sm:px-6 overflow-x-auto" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center space-x-2 transition-colors duration-200 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 sm:p-6">
          {/* Your Bookings Tab */}
          {activeTab === 'bookings' && (
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Your Bookings</h2>
              
              {/* Upcoming Bookings */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Upcoming Bookings ({upcomingBookings.length})
                  </h3>
                  {/* Refresh ONLY the current page's bookings */}
                  <button
                    onClick={refreshCurrentBookingsPage}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    title="Refresh this page's bookings"
                  >
                    Refresh
                  </button>
                </div>

                {upcomingBookings.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No upcoming bookings on this page</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {upcomingBookings.map((booking) => (
                        <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{booking.cardTitle || 'Unknown Card'}</h4>
                              <div className="text-sm text-gray-600 mt-1 space-y-1">
                                <div className="flex items-center">
                                  <Calendar className="w-4 h-4 mr-2" />
                                  <span>{formatDate(booking.date)}</span>
                                </div>
                                <div className="flex items-center">
                                  <Clock className="w-4 h-4 mr-2" />
                                  <span>{booking.timeSlot}</span>
                                </div>
                                {booking.cardLocation && (
                                  <div className="flex items-center">
                                    <span className="w-4 h-4 mr-2">📍</span>
                                    <span>{booking.cardLocation}</span>
                                  </div>
                                )}
                                {booking.openSlots && booking.openSlots > 0 && (
                                  <div className="flex items-center">
                                    <Users className="w-4 h-4 mr-2" />
                                    <span>{booking.openSlots} open slots</span>
                                    {booking.perSlotPrice && (
                                      <span className="ml-2 text-green-600">@ ₹{booking.perSlotPrice}/slot</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                              <button
                                onClick={() => handleViewReceipt(booking.id)}
                                className="flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm"
                              >
                                <Eye className="w-4 h-4" />
                                <span>Receipt</span>
                              </button>
                              {booking.openSlots && booking.openSlots > 0 && (
                                <button
                                  onClick={() => toggleBookingExpansion(booking.id)}
                                  className="flex items-center justify-center space-x-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 text-sm"
                                >
                                  <Edit className="w-4 h-4" />
                                  <span>Edit Slots</span>
                                  {expandedBookings.has(booking.id) ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Expandable section for editing open slots */}
                          {expandedBookings.has(booking.id) && booking.openSlots && booking.openSlots > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <h5 className="font-medium text-gray-800 mb-3">Edit Open Slots</h5>
                              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                                <span className="text-sm text-gray-600">Current open slots: {booking.openSlots}</span>
                                <div className="flex flex-wrap gap-2">
                                  {Array.from({ length: booking.openSlots }, (_, i) => (
                                    <button
                                      key={i}
                                      onClick={() => handleUpdateOpenSlots(booking.id, booking.openSlots! - 1)}
                                      className="flex items-center space-x-1 px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors duration-200 text-sm"
                                    >
                                      <Minus className="w-3 h-3" />
                                      <span>Remove 1</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 mt-2">
                                You can only decrease the number of open slots. Once removed, slots cannot be added back.
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Server-side pagination controls for Bookings */}
                    <PaginationControls
                      currentPage={bookingsPage}
                      totalPages={bookingsTotalPages}
                      onPageChange={setBookingsPage}
                    />
                  </>
                )}
              </div>

              {/* Completed Bookings */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Completed Bookings ({completedBookings.length})</h3>
                {completedBookings.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No completed bookings on this page</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {completedBookings.map((booking) => (
                      <div key={booking.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-700">{booking.cardTitle || 'Unknown Card'}</h4>
                            <div className="text-sm text-gray-500 mt-1 space-y-1">
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-2" />
                                <span>{formatDate(booking.date)}</span>
                              </div>
                              <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-2" />
                                <span>{booking.timeSlot}</span>
                              </div>
                              {booking.cardLocation && (
                                <div className="flex items-center">
                                  <span className="w-4 h-4 mr-2">📍</span>
                                  <span>{booking.cardLocation}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium text-center">
                              Completed
                            </span>
                            <button
                              onClick={() => handleViewReceipt(booking.id)}
                              className="flex items-center justify-center space-x-1 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 text-sm"
                            >
                              <Eye className="w-4 h-4" />
                              <span>Receipt</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Notifications</h2>
              
              {notifications.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No notifications</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {getPaginatedItems(notifications, notificationsPage).map((notification) => (
                      <div 
                        key={notification.id} 
                        className={`border rounded-lg p-4 ${
                          notification.read ? 'border-gray-200 bg-white' : 'border-blue-200 bg-blue-50'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{notification.title}</h4>
                            <p className="text-gray-600 mt-1 text-sm sm:text-base">{notification.message}</p>
                            {(notification.joinedByDisplayName || notification.joinedByEmail || notification.bookedByDisplayName || notification.bookedByEmail) && (
                              <div className="mt-2 text-sm text-blue-600">
                                <p><strong>Player:</strong> {notification.joinedByDisplayName || notification.bookedByDisplayName || notification.joinedByEmail || notification.bookedByEmail}</p>
                                {(notification.joinedByPhoneNumber || notification.bookedByPhoneNumber) ? (
                                  <p><strong>Phone:</strong> {notification.joinedByPhoneNumber || notification.bookedByPhoneNumber}</p>
                                ) : (
                                  <p><strong>Phone:</strong> N/A</p>
                                )}
                                {notification.joinedSlots && (
                                  <p><strong>Slots Joined:</strong> {notification.joinedSlots}</p>
                                )}
                                {notification.bookingTimeSlots && (
                                  <p><strong>Time Slots:</strong> {notification.bookingTimeSlots.join(', ')}</p>
                                )}
                              </div>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              {formatTime(notification.createdAt)}
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                            {!notification.read && (
                              <button
                                onClick={() => handleMarkNotificationAsRead(notification.id)}
                                className="text-blue-600 hover:text-blue-800 text-sm px-3 py-1 border border-blue-300 rounded hover:bg-blue-50 transition-colors duration-200"
                              >
                                Mark as read
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteNotification(notification.id)}
                              className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded transition-colors duration-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <PaginationControls
                    currentPage={notificationsPage}
                    totalPages={getTotalPages(notifications)}
                    onPageChange={setNotificationsPage}
                  />
                </>
              )}
            </div>
          )}

          {/* Host Request Tab */}
          {activeTab === 'host-request' && hasRole('user') && (
            <HostRequestForm />
          )}

          {/* MFA Reset Tab */}
          {activeTab === 'mfa-reset' && (hasRole('user') || hasRole('host')) && (
            <MfaResetRequest />
          )}

          {/* Request New Card Tab */}
          {activeTab === 'request-card' && hasRole('host') && (
            <RequestNewCard />
          )}

          {/* Cards Tab */}
          {activeTab === 'cards' && (hasRole('host') || hasRole('admin')) && (
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
                {hasRole('admin') ? 'All Cards' : 'Your Cards'}
              </h2>
              <CardList />
            </div>
          )}

          {/* Add Card Tab (Admin only) */}
          {activeTab === 'add-card' && hasRole('admin') && (
            <AddCard />
          )}

          {/* Assign Cards Tab (Admin only) */}
          {activeTab === 'assign-cards' && hasRole('admin') && (
            <AssignCards />
          )}

          {/* User Settings Tab (Admin only) */}
          {activeTab === 'user-settings' && hasRole('admin') && (
            <UserSettings />
          )}

          {/* Requests Tab (Admin only) */}
          {activeTab === 'requests' && hasRole('admin') && (
            <div className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Requests</h2>
              
              {/* Request Type Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8" aria-label="Request Types">
                  <button
                    onClick={() => setActiveRequestTab('host-requests')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                      activeRequestTab === 'host-requests'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Host Requests ({hostRequests.length})
                  </button>
                  <button
                    onClick={() => setActiveRequestTab('mfa-reset')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                      activeRequestTab === 'mfa-reset'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    MFA Reset Requests ({mfaResetRequests.length})
                  </button>
                </nav>
              </div>

              {/* Host Requests */}
              {activeRequestTab === 'host-requests' && (
                <div>
                  {hostRequests.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">No host requests</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {getPaginatedItems(hostRequests, requestsPage).map((request) => (
                          <RequestItem 
                            key={request.id} 
                            request={request} 
                            onApprove={handleApproveRequest}
                            onReject={handleRejectRequest}
                            formatTime={formatTime}
                          />
                        ))}
                      </div>
                      <PaginationControls
                        currentPage={requestsPage}
                        totalPages={getTotalPages(hostRequests)}
                        onPageChange={setRequestsPage}
                      />
                    </>
                  )}
                </div>
              )}

              {/* MFA Reset Requests */}
              {activeRequestTab === 'mfa-reset' && (
                <div>
                  {mfaResetRequests.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg">No MFA reset requests</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        {getPaginatedItems(mfaResetRequests, requestsPage).map((request) => (
                          <RequestItem 
                            key={request.id} 
                            request={request} 
                            onApprove={handleApproveRequest}
                            onReject={handleRejectRequest}
                            formatTime={formatTime}
                          />
                        ))}
                      </div>
                      <PaginationControls
                        currentPage={requestsPage}
                        totalPages={getTotalPages(mfaResetRequests)}
                        onPageChange={setRequestsPage}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Manage Homepage Tab (Admin only) */}
          {activeTab === 'manage-homepage' && hasRole('admin') && (
            <ManageHomepage />
          )}

          {/* Manage Hosts Tab (Admin only) */}
          {activeTab === 'manage-hosts' && hasRole('admin') && (
            <ManageHosts />
          )}
        </div>
      </div>
    </div>
  );
};

// Request Item Component (unchanged)
const RequestItem: React.FC<{
  request: Request;
  onApprove: (id: string, request: Request, response: string) => void;
  onReject: (id: string, request: Request, response: string) => void;
  formatTime: (timestamp: any) => string;
}> = ({ request, onApprove, onReject, formatTime }) => {
  const [adminResponse, setAdminResponse] = useState('');
  const [isResponding, setIsResponding] = useState(false);

  const handleApprove = () => {
    if (!adminResponse.trim()) {
      alert('Please provide a response message');
      return;
    }
    onApprove(request.id, request, adminResponse);
    setAdminResponse('');
    setIsResponding(false);
  };

  const handleReject = () => {
    if (!adminResponse.trim()) {
      alert('Please provide a response message');
      return;
    }
    onReject(request.id, request, adminResponse);
    setAdminResponse('');
    setIsResponding(false);
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'host-request': return 'Host Request';
      case 'new-card': return 'New Card Request';
      case 'mfa-reset': return 'MFA Reset Request';
      default: return 'Request';
    }
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'host-request': return <UserPlus className="w-5 h-5 text-purple-600" />;
      case 'new-card': return <FileText className="w-5 h-5 text-blue-600" />;
      case 'mfa-reset': return <Shield className="w-5 h-5 text-red-600" />;
      default: return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 space-y-2 sm:space-y-0">
        <div className="flex items-center space-x-3">
          {getRequestTypeIcon(request.requestType)}
          <div>
            <h4 className="font-semibold text-gray-900">
              {getRequestTypeLabel(request.requestType)}
            </h4>
            <p className="text-sm text-gray-600">From: {request.userDisplayName || request.userEmail}</p>
            {request.userPhoneNumber && (
              <p className="text-sm text-gray-500">📞 {request.userPhoneNumber}</p>
            )}
            <p className="text-xs text-gray-500">
              {formatTime(request.createdAt)}
            </p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          request.status === 'approved' ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }`}>
          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
        </span>
      </div>
      
      <div className="mb-4">
        <h5 className="font-medium text-gray-800 mb-2">Message:</h5>
        <p className="text-gray-600 bg-gray-50 p-3 rounded text-sm">{request.message}</p>
      </div>

      {request.cardData && (
        <div className="mb-4">
          <h5 className="font-medium text-gray-800 mb-2">Card Details:</h5>
          <div className="bg-gray-50 p-3 rounded space-y-2 text-sm">
            <p><strong>Title:</strong> {request.cardData.title}</p>
            <p><strong>Type:</strong> {request.cardData.type}</p>
            <p><strong>Location:</strong> {request.cardData.location}</p>
            <p><strong>Price per Hour:</strong> ₹{request.cardData.pricePerHour}</p>
            <p><strong>Hours:</strong> {request.cardData.openingTime} - {request.cardData.closingTime}</p>
            {request.cardData.description && (
              <p><strong>Description:</strong> {request.cardData.description}</p>
            )}
          </div>
        </div>
      )}

      {request.adminResponse && (
        <div className="mb-4">
          <h5 className="font-medium text-gray-800 mb-2">Admin Response:</h5>
          <p className="text-gray-600 bg-blue-50 p-3 rounded border border-blue-200 text-sm">{request.adminResponse}</p>
        </div>
      )}

      {request.status === 'pending' && (
        <div className="space-y-3">
          {!isResponding ? (
            <button
              onClick={() => setIsResponding(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm"
            >
              Respond to Request
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Response (Required) *
                </label>
                <textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="Provide your response to the user..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={handleApprove}
                  disabled={!adminResponse.trim()}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Approve</span>
                </button>
                <button
                  onClick={handleReject}
                  disabled={!adminResponse.trim()}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject</span>
                </button>
                <button
                  onClick={() => {
                    setIsResponding(false);
                    setAdminResponse('');
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
