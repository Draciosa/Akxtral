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
  pricePerHour: number;
  description: string;
  location: string;
}

export default function AddCard({ onSuccess }: AddCardProps) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    imageUrl: '',
    type: '',
    openingTime: '00:00',
    closingTime: '23:00',
    pricePerHour: 0,
    description: '',
    location: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user, hasRole } = useAuth();

  // Generate time options from 00:00 to 23:00
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      const timeString = `${hour.toString().padStart(2, '0')}:00`;
      options.push(timeString);
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

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

    if (formData.pricePerHour <= 0) {
      setError('Price per hour must be greater than 0');
      return;
    }

    if (!formData.title || !formData.type || !formData.location) {
      setError('Title, type, and location are required');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Generate unique Card_ID
      const uniqueCardId = await generateUniqueCardId();
      
      const searchKeywords = buildSearchKeywords(formData);

await addDoc(collection(db, 'cards'), {
  ...formData,
  Card_ID: uniqueCardId,
  userId: user.uid,
  createdAt: new Date(),
  updatedAt: new Date(),

  // 🔹 lowercase fields for search
  titleLower: formData.title.toLowerCase(),
  typeLower: formData.type.toLowerCase(),
  locationLower: formData.location.toLowerCase(),
  descriptionLower: formData.description.toLowerCase(),

  // 🔹 combined field for multi-field search
  searchKeywords,
});

      
      setFormData({ 
        title: '', 
        imageUrl: '', 
        type: '', 
        openingTime: '00:00', 
        closingTime: '23:00',
        pricePerHour: 0,
        description: '',
        location: ''
      });
      
      setSuccess('Card created successfully!');
      
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

  // Build a single lowercase searchKeywords string
const buildSearchKeywords = (card: FormData) => {
  return [card.title, card.type, card.location, card.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};


  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev: FormData) => ({ 
      ...prev, 
      [name]: type === 'number' ? parseFloat(value) || 0 : value 
    }));
  };

  const capitalizeFirstLetter = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  if (!hasRole('admin')) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
        Only administrators can create cards.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-semibold mb-6 text-gray-900">Add New Card</h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}
        
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            placeholder="Enter card title"
            value={formData.title}
            onChange={(e) => {
              const capitalizedValue = capitalizeFirstLetter(e.target.value);
              setFormData(prev => ({ ...prev, title: capitalizedValue }));
            }}
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>
        
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
            Type *
          </label>
          <input
            type="text"
            id="type"
            name="type"
            placeholder="e.g., Football, Cricket, Tennis"
            value={formData.type}
            onChange={(e) => {
              const capitalizedValue = capitalizeFirstLetter(e.target.value);
              setFormData(prev => ({ ...prev, type: capitalizedValue }));
            }}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
            Location *
          </label>
          <input
            type="text"
            id="location"
            name="location"
            placeholder="e.g., Banjara Hills, Hyderabad"
            value={formData.location}
            onChange={(e) => {
              const capitalizedValue = capitalizeFirstLetter(e.target.value);
              setFormData(prev => ({ ...prev, location: capitalizedValue }));
            }}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            placeholder="Describe the venue, facilities, and amenities..."
            value={formData.description}
            onChange={(e) => {
              const capitalizedValue = capitalizeFirstLetter(e.target.value);
              setFormData(prev => ({ ...prev, description: capitalizedValue }));
            }}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>

        <div>
          <label htmlFor="pricePerHour" className="block text-sm font-medium text-gray-700 mb-2">
            Price per Hour (₹) *
          </label>
          <input
            type="number"
            id="pricePerHour"
            name="pricePerHour"
            placeholder="Enter price per hour"
            value={formData.pricePerHour || ''}
            onChange={handleChange}
            min="1"
            step="1"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="openingTime" className="block text-sm font-medium text-gray-700 mb-2">
              Opening Time
            </label>
            <select
              id="openingTime"
              name="openingTime"
              value={formData.openingTime}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              {timeOptions.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="closingTime" className="block text-sm font-medium text-gray-700 mb-2">
              Closing Time
            </label>
            <select
              id="closingTime"
              name="closingTime"
              value={formData.closingTime}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              {timeOptions.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>
        </div>
        
        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
        >
          {isLoading ? 'Adding Card...' : 'Add Card'}
        </button>
      </form>
    </div>
  );
}