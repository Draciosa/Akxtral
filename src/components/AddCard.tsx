import { useState, FormEvent, ChangeEvent } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

interface AddCardProps {
  onSuccess?: () => void;
}

interface FormData {
  title: string;
  imageUrl: string;
  type: string;
  openingTime: string;
  closingTime: string;
}

export default function AddCard({ onSuccess }: AddCardProps) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    imageUrl: '',
    type: '',
    openingTime: '',
    closingTime: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, hasRole } = useAuth();

  // Generate a random 30-character string with lowercase, uppercase, and numbers
  const generateCardId = (): string => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 30; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Check if Card_ID already exists in database
  const isCardIdUnique = async (cardId: string): Promise<boolean> => {
    const q = query(collection(db, 'cards'), where('Card_ID', '==', cardId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  };

  // Generate a unique Card_ID that doesn't exist in database
  const generateUniqueCardId = async (): Promise<string> => {
    let cardId: string;
    let isUnique = false;
    
    do {
      cardId = generateCardId();
      isUnique = await isCardIdUnique(cardId);
    } while (!isUnique);
    
    return cardId;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to add a card');
      return;
    }

    if (!hasRole('admin')) {
      setError('Only admins can create cards');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Generate unique Card_ID
      const uniqueCardId = await generateUniqueCardId();
      
      await addDoc(collection(db, 'cards'), {
        ...formData,
        Card_ID: uniqueCardId,
        userId: user.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      setFormData({ 
        title: '', 
        imageUrl: '', 
        type: '', 
        openingTime: '', 
        closingTime: '' 
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error adding card:', error);
      setError('Failed to add card. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: FormData) => ({ ...prev, [name]: value }));
  };

  if (!hasRole('admin')) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
        Only administrators can create cards.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Title
        </label>
        <input
          type="text"
          id="title"
          name="title"
          placeholder="Enter card title"
          value={formData.title}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        />
      </div>
      
      <div>
        <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-2">
          Image URL
        </label>
        <input
          type="url"
          id="imageUrl"
          name="imageUrl"
          placeholder="https://example.com/image.jpg"
          value={formData.imageUrl}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        />
      </div>
      
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
          Type
        </label>
        <input
          type="text"
          id="type"
          name="type"
          placeholder="e.g., Football, Cricket, Tennis"
          value={formData.type}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        />
      </div>

      <div>
        <label htmlFor="openingTime" className="block text-sm font-medium text-gray-700 mb-2">
          Opening Time
        </label>
        <input
          type="text"
          id="openingTime"
          name="openingTime"
          placeholder="e.g., 6:00 AM"
          value={formData.openingTime}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        />
      </div>

      <div>
        <label htmlFor="closingTime" className="block text-sm font-medium text-gray-700 mb-2">
          Closing Time
        </label>
        <input
          type="text"
          id="closingTime"
          name="closingTime"
          placeholder="e.g., 10:00 PM"
          value={formData.closingTime}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        />
      </div>
      
      <button 
        type="submit" 
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
      >
        {isLoading ? 'Adding Card...' : 'Add Card'}
      </button>
    </form>
  );
}