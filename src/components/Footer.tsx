import React from 'react';
import { Mail } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-r from-gray-900 to-black text-white py-8 sm:py-12 mt-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Brand Section */}
          <div className="md:col-span-2">
            <h3 className="text-xl sm:text-2xl font-bold mb-4">TURFION</h3>
            <p className="text-gray-300 mb-4 leading-relaxed text-sm sm:text-base">
              Your premier destination for booking sports venues and activities. 
              Connect with fellow players and discover amazing facilities in your area.
            </p>
            <div className="flex items-center space-x-2 text-gray-300 mb-4">
              <Mail className="w-4 h-4 flex-shrink-0" />
              <a 
                href="mailto:info@turfion.com" 
                className="hover:text-blue-400 transition-colors duration-200 text-sm sm:text-base"
              >
                info@turfion.com
              </a>
            </div>
            <p className="text-gray-400 text-xs sm:text-sm">
              A product of Akxtral
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-base sm:text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-gray-300 hover:text-blue-400 transition-colors duration-200 text-sm sm:text-base">
                  Home
                </a>
              </li>
              <li>
                <a href="/games" className="text-gray-300 hover:text-blue-400 transition-colors duration-200 text-sm sm:text-base">
                  Join Games
                </a>
              </li>
              <li>
                <a href="/profile" className="text-gray-300 hover:text-blue-400 transition-colors duration-200 text-sm sm:text-base">
                  Profile
                </a>
              </li>
              <li>
                <a href="/dashboard" className="text-gray-300 hover:text-blue-400 transition-colors duration-200 text-sm sm:text-base">
                  Dashboard
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-700 mt-6 sm:mt-8 pt-6 sm:pt-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-gray-400 text-xs sm:text-sm text-center md:text-left">
            © {new Date().getFullYear()} TURFION. All rights reserved.
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-gray-400 text-xs sm:text-sm text-center">
              Made with ❤️ for sports enthusiasts
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;