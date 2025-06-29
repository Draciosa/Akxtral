import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Users, UserCheck, AlertTriangle, Search } from 'lucide-react';

interface HostUser {
  id: string;
  email: string;
  role: string;
  displayName?: string;
}

interface Card {
  id: string;
  title: string;
  type: string;
  location: string;
  assignedHost?: string;
  userId: string;
  Card_ID: string;
}

const AssignCards: React.FC = () => {
  const { hasRole } = useAuth();
  const [hosts, setHosts] = useState<HostUser[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!hasRole('admin')) return;

    const unsubscribes: (() => void)[] = [];

    // Fetch hosts
    const hostsQuery = query(
      collection(db, 'users'),
      where('role', '==', 'host')
    );

    const unsubscribeHosts = onSnapshot(hostsQuery, (snapshot) => {
      const hostsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HostUser[];
      setHosts(hostsData);
    });

    unsubscribes.push(unsubscribeHosts);

    // Fetch all cards
    const cardsQuery = query(collection(db, 'cards'));

    const unsubscribeCards = onSnapshot(cardsQuery, (snapshot) => {
      const cardsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Card[];
      setCards(cardsData);
      setLoading(false);
    });

    unsubscribes.push(unsubscribeCards);

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [hasRole]);

  const handleAssignCard = async (cardId: string, hostId: string) => {
    setAssigning(cardId);
    setError('');
    setSuccess('');

    try {
      await updateDoc(doc(db, 'cards', cardId), {
        assignedHost: hostId,
        updatedAt: serverTimestamp()
      });

      const host = hosts.find(h => h.id === hostId);
      const card = cards.find(c => c.id === cardId);
      
      setSuccess(`Successfully assigned "${card?.title}" to ${host?.displayName || host?.email}`);
    } catch (error) {
      console.error('Error assigning card:', error);
      setError('Failed to assign card. Please try again.');
    } finally {
      setAssigning(null);
    }
  };

  const handleUnassignCard = async (cardId: string) => {
    setAssigning(cardId);
    setError('');
    setSuccess('');

    try {
      await updateDoc(doc(db, 'cards', cardId), {
        assignedHost: null,
        updatedAt: serverTimestamp()
      });

      const card = cards.find(c => c.id === cardId);
      setSuccess(`Successfully unassigned "${card?.title}"`);
    } catch (error) {
      console.error('Error unassigning card:', error);
      setError('Failed to unassign card. Please try again.');
    } finally {
      setAssigning(null);
    }
  };

  const getHostName = (hostId: string) => {
    const host = hosts.find(h => h.id === hostId);
    return host?.displayName || host?.email || 'Unknown Host';
  };

  const filteredCards = cards.filter(card =>
    card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!hasRole('admin')) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
        Only administrators can assign cards to hosts.
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
            <UserCheck className="w-6 h-6 mr-2 text-blue-600" />
            Assign Cards to Hosts
          </h3>
          <div className="text-sm text-gray-600">
            {cards.length} total cards • {hosts.length} hosts available
          </div>
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

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search cards by title, type, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Cards List */}
        {filteredCards.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {searchTerm ? 'No cards match your search' : 'No cards found'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCards.map((card) => (
              <div key={card.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">
                          {card.type.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{card.title}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>{card.type}</span>
                          {card.location && (
                            <>
                              <span>•</span>
                              <span>{card.location}</span>
                            </>
                          )}
                          <span>•</span>
                          <span className="font-mono text-xs">ID: {card.Card_ID}</span>
                        </div>
                        {card.assignedHost && (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Users className="w-3 h-3 mr-1" />
                              Assigned to: {getHostName(card.assignedHost)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {card.assignedHost ? (
                      <button
                        onClick={() => handleUnassignCard(card.id)}
                        disabled={assigning === card.id}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {assigning === card.id ? 'Unassigning...' : 'Unassign'}
                      </button>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssignCard(card.id, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          disabled={assigning === card.id}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
                        >
                          <option value="">Select Host</option>
                          {hosts.map(host => (
                            <option key={host.id} value={host.id}>
                              {host.displayName || host.email}
                            </option>
                          ))}
                        </select>
                        {assigning === card.id && (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-800">Assignment Guidelines</h4>
              <ul className="text-sm text-blue-700 mt-1 space-y-1">
                <li>• Assigned hosts can edit and manage their assigned cards</li>
                <li>• Hosts cannot book their own assigned cards</li>
                <li>• Only one host can be assigned per card</li>
                <li>• Unassigned cards can be managed by any admin</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignCards;