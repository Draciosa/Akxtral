import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface HeroData {
  title: string;
  subtitle: string;
  backgroundImage: string;
  buttonText: string;
  buttonLink: string;
}

const HeroSection: React.FC = () => {
  const [heroData, setHeroData] = useState<HeroData>({
    title: 'Welcome to TURFION',
    subtitle: 'Discover and book amazing sports venues and activities',
    backgroundImage: 'https://images.pexels.com/photos/3657154/pexels-photo-3657154.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    buttonText: 'Explore Now',
    buttonLink: '#cards'
  });
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
      }
    };

    fetchHeroData();
  }, []);

  const handleButtonClick = () => {
    if (heroData.buttonLink.startsWith('#')) {
      const element = document.querySelector(heroData.buttonLink);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      window.open(heroData.buttonLink, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="relative h-64 sm:h-80 md:h-96 bg-gray-200 animate-pulse rounded-xl mb-12">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-64 sm:h-80 md:h-96 rounded-xl overflow-hidden mb-12 shadow-2xl">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroData.backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      </div>
      
      {/* Content */}
      <div className="relative h-full flex items-center justify-center text-center text-white px-4">
        <div className="max-w-4xl">
          <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold mb-4 leading-tight">
            {heroData.title}
          </h1>
          <p className="text-sm sm:text-xl md:text-2xl mb-6 sm:mb-8 text-gray-200 leading-relaxed px-4">
            {heroData.subtitle}
          </p>
          <button
            onClick={handleButtonClick}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 sm:py-4 sm:px-8 rounded-lg text-sm sm:text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            {heroData.buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;