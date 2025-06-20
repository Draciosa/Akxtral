import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Clock, Edit, Save, X } from 'lucide-react';

type CardData = {
  id: string;
  title: string;
  imageUrl: string;
  type: string;
  openingTime: string;
  closingTime: string;
  userId: string;
  createdAt: any;
};

export default function CardList() {
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CardData>>({});
  const [saving, setSaving] = useState(false);
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      setCards([]);
      setLoading(false);
      return;
    }

    let q;
    if (hasRole('admin')) {
      // Admins can see all cards
      q = query(collection(db, 'cards'));
    } else {
      // Hosts can only see their own cards
      q = query(
        collection(db, 'cards'),
        where('userId', '==', user.uid)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as CardData[];
      
      // Sort by creation date (most recent first)
      items.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      
      setCards(items);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching cards:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, hasRole]);

  const handleEditClick = (card: CardData) => {
    setEditingCard(card.id);
    setEditForm({
      title: card.title,
      imageUrl: card.imageUrl,
      type: card.type,
      openingTime: card.openingTime,
      closingTime: card.closingTime
    });
  };

  const handleCancelEdit = () => {
    setEditingCard(null);
    setEditForm({});
  };

  const handleSaveEdit = async (cardId: string) => {
    if (!editForm.title || !editForm.imageUrl || !editForm.type) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const cardRef = doc(db, 'cards', cardId);
      await updateDoc(cardRef, {
        title: editForm.title,
        imageUrl: editForm.imageUrl,
        type: editForm.type,
        openingTime: editForm.openingTime || '',
        closingTime: editForm.closingTime || ''
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

  const handleInputChange = (field: keyof CardData, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCardClick = (cardId: string) => {
    navigate(`/card/${cardId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to view cards.</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          {hasRole('admin') ? 'No cards in the system yet.' : 'No cards yet. Add your first card!'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card) => (
        <div 
          key={card.id} 
          className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300"
        >
          <div className="relative h-48 bg-gray-200">
            {editingCard === card.id ? (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <input
                  type="url"
                  value={editForm.imageUrl || ''}
                  onChange={(e) => handleInputChange('imageUrl', e.target.value)}
                  placeholder="Image URL"
                  className="w-full px-3 py-2 bg-white rounded text-sm"
                />
              </div>
            ) : (
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
            )}
            <div className="absolute top-2 left-2">
              {hasRole('admin') ? (
                <span className="bg-red-600 text-white px-2 py-1 rounded text-sm">
                  Admin View
                </span>
              ) : (
                <span className="bg-purple-600 text-white px-2 py-1 rounded text-sm">
                  Your Card
                </span>
              )}
            </div>
            <div className="absolute top-2 right-2">
              {editingCard === card.id ? (
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleSaveEdit(card.id)}
                    disabled={saving}
                    className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors duration-200 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="p-2 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors duration-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                // Only show edit button if user owns the card or is admin
                (hasRole('admin') || card.userId === user?.uid) && (
                  <button
                    onClick={() => handleEditClick(card)}
                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors duration-200"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )
              )}
            </div>
          </div>
          <div className="p-6">
            {editingCard === card.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editForm.title || ''}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Card title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={editForm.type || ''}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  placeholder="Card type"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={editForm.openingTime || ''}
                    onChange={(e) => handleInputChange('openingTime', e.target.value)}
                    placeholder="Opening time"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <input
                    type="text"
                    value={editForm.closingTime || ''}
                    onChange={(e) => handleInputChange('closingTime', e.target.value)}
                    placeholder="Closing time"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
            ) : (
              <>
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
                
                {/* Opening and Closing Times */}
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

                {/* Show creator info for admins */}
                {hasRole('admin') && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Created by: {card.userId}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}