import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Image, Type, Link, Save } from 'lucide-react';

interface HeroData {
  title: string;
  subtitle: string;
  backgroundImage: string;
  buttonText: string;
  buttonLink: string;
  updatedAt?: any;
}

const ManageHomepage: React.FC = () => {
  const { hasRole } = useAuth();
  const [heroData, setHeroData] = useState<HeroData>({
    title: 'Welcome to TURFION',
    subtitle: 'Discover and book amazing sports venues and activities',
    backgroundImage: 'https://images.pexels.com/photos/3657154/pexels-photo-3657154.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    buttonText: 'Explore Now',
    buttonLink: '#cards'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchHeroData = async () => {
      try {
        const heroDoc = await getDoc(doc(db, 'settings', 'hero'));
        if (heroDoc.exists()) {
          const data = heroDoc.data() as HeroData;
          setHeroData(data);
        }
      } catch (error) {
        console.error('Error fetching hero data:', error);
        setError('Failed to load homepage data');
      } finally {
        setLoading(false);
      }
    };

    fetchHeroData();
  }, []);

  const handleSave = async () => {
    if (!heroData.title.trim() || !heroData.subtitle.trim()) {
      setError('Title and subtitle are required');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await setDoc(doc(db, 'settings', 'hero'), {
        ...heroData,
        updatedAt: serverTimestamp()
      });
      
      setSuccess('Homepage updated successfully!');
    } catch (error) {
      console.error('Error saving hero data:', error);
      setError('Failed to save homepage data');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof HeroData, value: string) => {
    setHeroData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
    setSuccess('');
  };

  if (!hasRole('admin')) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
        Only administrators can manage the homepage.
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
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-6">Manage Homepage Hero Section</h3>
        
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

        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Type className="w-4 h-4 mr-2" />
              Hero Title *
            </label>
            <input
              type="text"
              value={heroData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter hero title"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Subtitle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Type className="w-4 h-4 mr-2" />
              Hero Subtitle *
            </label>
            <textarea
              value={heroData.subtitle}
              onChange={(e) => handleInputChange('subtitle', e.target.value)}
              placeholder="Enter hero subtitle"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Background Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Image className="w-4 h-4 mr-2" />
              Background Image URL
            </label>
            <input
              type="url"
              value={heroData.backgroundImage}
              onChange={(e) => handleInputChange('backgroundImage', e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Button Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Button Text
            </label>
            <input
              type="text"
              value={heroData.buttonText}
              onChange={(e) => handleInputChange('buttonText', e.target.value)}
              placeholder="Enter button text"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Button Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Link className="w-4 h-4 mr-2" />
              Button Link
            </label>
            <input
              type="text"
              value={heroData.buttonLink}
              onChange={(e) => handleInputChange('buttonLink', e.target.value)}
              placeholder="Enter button link (e.g., #cards or https://example.com)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Use #cards to scroll to cards section, or enter a full URL for external links
            </p>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center justify-center"
          >
            <Save className="w-5 h-5 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Preview</h3>
        <div className="relative h-64 rounded-lg overflow-hidden">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${heroData.backgroundImage})` }}
          >
            <div className="absolute inset-0 bg-black bg-opacity-50"></div>
          </div>
          
          <div className="relative h-full flex items-center justify-center text-center text-white px-4">
            <div className="max-w-2xl">
              <h1 className="text-2xl md:text-4xl font-bold mb-2">
                {heroData.title}
              </h1>
              <p className="text-sm md:text-lg mb-4 text-gray-200">
                {heroData.subtitle}
              </p>
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-all duration-300">
                {heroData.buttonText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageHomepage;