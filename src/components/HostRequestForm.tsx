import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Clock, DollarSign, FileText, Image, CheckCircle } from 'lucide-react';

interface HostRequestFormProps {
  onSuccess?: () => void;
}

interface CardFormData {
  title: string;
  imageUrl: string;
  type: string;
  openingTime: string;
  closingTime: string;
  pricePerHour: number;
  description: string;
  location: string;
}

const HostRequestForm: React.FC<HostRequestFormProps> = ({ onSuccess }) => {
  const { user } = useAuth();
  const [requestMessage, setRequestMessage] = useState('');
  const [cardData, setCardData] = useState<CardFormData>({
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
  const [success, setSuccess] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to submit a request');
      return;
    }

    if (!requestMessage.trim()) {
      setError('Please provide a message for your request');
      return;
    }

    if (!cardData.title || !cardData.type || !cardData.pricePerHour) {
      setError('Please fill in all required card details');
      return;
    }

    if (cardData.pricePerHour <= 0) {
      setError('Price per hour must be greater than 0');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await addDoc(collection(db, 'Requests'), {
        userId: user.uid,
        userEmail: user.email,
        message: requestMessage,
        status: 'pending',
        cardData: cardData,
        requestType: 'host-request',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setRequestMessage('');
      setCardData({
        title: '',
        imageUrl: '',
        type: '',
        openingTime: '00:00',
        closingTime: '23:00',
        pricePerHour: 0,
        description: '',
        location: ''
      });
      setSuccess(true);

      setTimeout(() => setSuccess(false), 5000);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error submitting request:', error);
      setError('Failed to submit request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardDataChange = (field: keyof CardFormData, value: string | number) => {
    setCardData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const capitalizeFirstLetter = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  if (success) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Request Submitted Successfully!</h3>
        <p className="text-gray-600 mb-6">
          Your request to become a host has been sent to the administrators. 
          You will be notified once it's reviewed.
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-semibold mb-6">Request to Become a Host</h3>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Request Message */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Why do you want to become a host? *
          </label>
          <textarea
            value={requestMessage}
            onChange={(e) => setRequestMessage(e.target.value)}
            placeholder="Please explain why you want to become a host and how you plan to contribute..."
            rows={4}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Card Details Section */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-lg font-semibold mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-blue-600" />
            Card Details (What you want to host)
          </h4>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Guidelines:</strong> Opening time starts from 00:00 (midnight) and closing time ends at 23:00 (11 PM). 
              Please select appropriate times for your venue.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card Title */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card Title *
              </label>
              <input
                type="text"
                value={cardData.title}
                onChange={(e) => handleCardDataChange('title', capitalizeFirstLetter(e.target.value))}
                placeholder="e.g., Victory Sports Arena"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Card Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sport/Activity Type *
              </label>
              <input
                type="text"
                value={cardData.type}
                onChange={(e) => handleCardDataChange('type', capitalizeFirstLetter(e.target.value))}
                placeholder="e.g., Football, Cricket, Tennis"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Price per Hour */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <DollarSign className="w-4 h-4 mr-1" />
                Price per Hour (₹) *
              </label>
              <input
                type="number"
                value={cardData.pricePerHour || ''}
                onChange={(e) => handleCardDataChange('pricePerHour', parseFloat(e.target.value) || 0)}
                placeholder="Enter price per hour"
                min="1"
                step="1"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Opening Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                Opening Time
              </label>
              <select
                value={cardData.openingTime}
                onChange={(e) => handleCardDataChange('openingTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {timeOptions.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>

            {/* Closing Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                Closing Time
              </label>
              <select
                value={cardData.closingTime}
                onChange={(e) => handleCardDataChange('closingTime', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {timeOptions.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                Location
              </label>
              <input
                type="text"
                value={cardData.location}
                onChange={(e) => handleCardDataChange('location', capitalizeFirstLetter(e.target.value))}
                placeholder="e.g., Banjara Hills, Hyderabad"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Image URL */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Image className="w-4 h-4 mr-1" />
                Image URL
              </label>
              <input
                type="url"
                value={cardData.imageUrl}
                onChange={(e) => handleCardDataChange('imageUrl', e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={cardData.description}
                onChange={(e) => handleCardDataChange('description', capitalizeFirstLetter(e.target.value))}
                placeholder="Describe your venue, facilities, and what makes it special..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
        >
          {isLoading ? 'Submitting Request...' : 'Submit Host Request'}
        </button>
      </form>
    </div>
  );
};

export default HostRequestForm;