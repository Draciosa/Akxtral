import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDocs, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Users, UserMinus, AlertTriangle } from 'lucide-react';

interface HostUser {
  id: string;
  email: string;
  role: string;
  createdAt: any;
  updatedAt: any;
  displayName?: string;
}

const ManageHosts: React.FC = () => {
  const { hasRole } = useAuth();
  const [hosts, setHosts] = useState<HostUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!hasRole('admin')) return;

    const q = query(
      collection(db, 'users'),
      where('role', '==', 'host')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const hostsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HostUser[];

      // Sort by creation date (most recent first)
      hostsData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setHosts(hostsData);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching hosts:', err);
      setError('Failed to load hosts');
      setLoading(false);
    });

    return unsubscribe;
  }, [hasRole]);

  const handleRevokeHost = async (hostId: string, hostEmail: string) => {
    if (!confirm(`Are you sure you want to revoke host privileges for ${hostEmail}? This action will also delete all cards created by this host and any open slots associated with those cards.`)) {
      return;
    }

    setRevoking(hostId);
    setError('');
    setSuccess('');

    try {
      // First, get all cards created by this host
      const cardsQuery = query(
        collection(db, 'cards'),
        where('userId', '==', hostId)
      );
      
      const cardsSnapshot = await getDocs(cardsQuery);
      const cardIds = cardsSnapshot.docs.map(doc => doc.id);

      // Delete all bookings with open slots for these cards
      for (const cardId of cardIds) {
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('cardId', '==', cardId),
          where('openSlots', '>', 0)
        );
        
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const deleteBookingPromises = bookingsSnapshot.docs.map(bookingDoc => 
          deleteDoc(doc(db, 'bookings', bookingDoc.id))
        );
        
        await Promise.all(deleteBookingPromises);
      }

      // Delete all cards created by this host
      const deleteCardPromises = cardsSnapshot.docs.map(cardDoc => 
        deleteDoc(doc(db, 'cards', cardDoc.id))
      );
      
      await Promise.all(deleteCardPromises);

      // Then revoke host privileges
      const userRef = doc(db, 'users', hostId);
      await updateDoc(userRef, {
        role: 'user',
        updatedAt: serverTimestamp()
      });

      setSuccess(`Host privileges revoked for ${hostEmail}. Deleted ${cardsSnapshot.docs.length} card(s) and associated open slots.`);
    } catch (error) {
      console.error('Error revoking host:', error);
      setError('Failed to revoke host privileges. Please try again.');
    } finally {
      setRevoking(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return 'Unknown';
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!hasRole('admin')) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
        Only administrators can manage hosts.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold flex items-center">
            <Users className="w-6 h-6 mr-2 text-blue-600" />
            Manage Hosts ({hosts.length})
          </h3>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        {hosts.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No hosts found</p>
            <p className="text-gray-400 text-sm mt-2">Users with host privileges will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {hosts.map((host) => (
              <div key={host.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {host.displayName || host.email}
                        </h4>
                        {host.displayName && (
                          <p className="text-sm text-gray-600">{host.email}</p>
                        )}
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                          <span>ID: {host.id}</span>
                          <span>•</span>
                          <span>Host since: {formatDate(host.createdAt)}</span>
                          {host.updatedAt && (
                            <>
                              <span>•</span>
                              <span>Updated: {formatDate(host.updatedAt)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                      Host
                    </span>
                    <button
                      onClick={() => handleRevokeHost(host.id, host.email)}
                      disabled={revoking === host.id}
                      className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {revoking === host.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Revoking...</span>
                        </>
                      ) : (
                        <>
                          <UserMinus className="w-4 h-4" />
                          <span>Revoke Host</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Warning Notice */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-yellow-800">Important Notice</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Revoking host privileges will change the user's role back to "user" and automatically delete all cards created by that host, 
                including any open slots associated with those cards. This action cannot be undone.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageHosts;