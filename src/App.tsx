import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Calendar from './components/DatePicker/Calendar';
import Login from './components/Login';
import SignUp from './components/SignUp';
import SportsGroundDetails from './components/SportsGroundDetails';
import CardDetails from './components/CardDetails';
import BookingCalendar from './components/BookingCalendar';
import BookingReceipt from './components/BookingReceipt';
import Profile from './components/Profile';
import MfaSettings from './components/MfaSettings';
import Dashboard from './components/Dashboard';
import CommunityCards from './components/CommunityCards';
import Games from './components/Games';
import HeroSection from './components/HeroSection';
import Footer from './components/Footer';
import { useAuth } from './contexts/AuthContext';
import { LogOut, User, ChevronDown, BarChart3, LogIn, Menu, X, Shield, AlertTriangle } from 'lucide-react';
import { SportsGround } from './types';
import { isFirebaseInitialized } from './lib/firebase';

const sportsGrounds: SportsGround[] = [
  {
    id: '1',
    name: 'Victory Sports Arena',
    rating: 4.5,
    sports: ['Football'],
    location: 'Banjara Hills',
    area: 'Hyderabad',
    image: "https://img.olympics.com/images/image/private/t_s_pog_staticContent_hero_sm_2x/f_auto/primary/hsz5zl0ur6fuza7gfpx8",
    pricePerHour: 1200,
    distance: '3.2 km',
    openingTime: 'Opens tomorrow at 6:00am'
  },
  {
    id: '2',
    name: 'Champions Cricket Ground',
    rating: 4.3,
    sports: ['Cricket'],
    location: 'Jubilee Hills',
    area: 'Hyderabad',
    image: "https://images.pexels.com/photos/3657154/pexels-photo-3657154.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
    pricePerHour: 1500,
    distance: '5.1 km',
    openingTime: 'Opens tomorrow at 5:30am'
  },
  {
    id: '3',
    name: 'Elite Tennis Club',
    rating: 4.8,
    sports: ['Badminton'],
    location: 'Gachibowli',
    area: 'Hyderabad',
    image: "https://img.olympics.com/images/image/private/t_s_pog_staticContent_hero_sm_2x/f_auto/primary/hsz5zl0ur6fuza7gfpx8",
    pricePerHour: 800,
    distance: '7.4 km',
    openingTime: 'Opens tomorrow at 7:00am'
  }
];

// Protected routes that require authentication
const protectedRoutes = ['/games', '/profile', '/dashboard', '/book', '/receipt', '/mfa-settings'];

function App() {
  const { user, logout, userProfile, firebaseError } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Check if current route requires authentication
  const requiresAuth = protectedRoutes.some(route => 
    location.pathname.startsWith(route)
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle authentication for protected routes
  useEffect(() => {
    if (requiresAuth && !user && !showLogin && !showSignUp) {
      setShowLogin(true);
    }
  }, [requiresAuth, user, showLogin, showSignUp]);

  // Show Firebase configuration error if present
  if (firebaseError) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600 mr-3" />
            <h1 className="text-xl font-bold text-red-800">Configuration Error</h1>
          </div>
          <p className="text-red-700 mb-4">{firebaseError}</p>
          <div className="bg-red-100 border border-red-300 rounded-lg p-4">
            <h3 className="font-semibold text-red-800 mb-2">For Netlify Deployment:</h3>
            <p className="text-sm text-red-700 mb-2">
              Go to your Netlify dashboard → Site settings → Environment variables and add:
            </p>
            <ul className="text-xs text-red-600 space-y-1 font-mono">
              <li>VITE_FIREBASE_API_KEY</li>
              <li>VITE_FIREBASE_AUTH_DOMAIN</li>
              <li>VITE_FIREBASE_PROJECT_ID</li>
              <li>VITE_FIREBASE_STORAGE_BUCKET</li>
              <li>VITE_FIREBASE_MESSAGING_SENDER_ID</li>
              <li>VITE_FIREBASE_APP_ID</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Show loading screen if Firebase is not initialized
  if (!isFirebaseInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing application...</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();
      setShowLogin(false);
      setShowSignUp(false);
      setShowMobileMenu(false);
      setShowUserDropdown(false);
      navigate('/');
    } catch (error) {
      console.error('Failed to log out');
    }
  };

  const handleProfileClick = () => {
    setShowMobileMenu(false);
    setShowUserDropdown(false);
    navigate('/profile');
  };

  const handleDashboardClick = () => {
    setShowMobileMenu(false);
    setShowUserDropdown(false);
    navigate('/dashboard');
  };

  const handleGamesClick = () => {
    setShowMobileMenu(false);
    navigate('/games');
  };

  const handleLoginSuccess = () => {
    setShowLogin(false);
    setShowSignUp(false);
  };

  const toggleUserDropdown = () => {
    setShowUserDropdown(!showUserDropdown);
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

  const UserDropdownCard = () => (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-6 z-50">
      <div className="flex items-start space-x-4">
        {/* Profile Picture */}
        <div className="flex-shrink-0">
          {userProfile?.photoURL ? (
            <img
              src={userProfile.photoURL}
              alt="Profile"
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center ${userProfile?.photoURL ? 'hidden' : ''}`}>
            <User className="w-8 h-8 text-white" />
          </div>
        </div>
        
        {/* User Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {userProfile?.displayName || 'User'}
          </h3>
          <p className="text-sm text-gray-600 truncate mb-2">{user?.email}</p>
          
          {/* Role Badge */}
          <div className="flex items-center space-x-2 mb-3">
            {userProfile?.role && getRoleTag(userProfile.role)}
            {userProfile?.mfaEnabled && (
              <div className="flex items-center space-x-1 text-xs text-green-600">
                <Shield className="w-3 h-3" />
                <span>MFA</span>
              </div>
            )}
          </div>
          
          {/* Additional Info */}
          {userProfile?.phoneNumber && (
            <p className="text-xs text-gray-500 mb-2">
              📞 {userProfile.phoneNumber}
            </p>
          )}
          
          {/* Quick Actions */}
          <div className="flex flex-col space-y-2">
            <button
              onClick={handleProfileClick}
              className="w-full bg-blue-600 text-white text-xs py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              View Profile
            </button>
            <button
              onClick={handleDashboardClick}
              className="w-full bg-gray-100 text-gray-700 text-xs py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors duration-200"
            >
              Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 text-white text-xs py-2 px-3 rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center justify-center space-x-1"
            >
              <LogOut className="w-3 h-3" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const MobileMenu = () => (
    <div className="lg:hidden">
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setShowMobileMenu(false)}>
        <div 
          ref={mobileMenuRef}
          className="fixed right-0 top-0 h-full w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center p-4 border-b border-gray-200">
            <span className="text-lg font-semibold text-gray-900">Menu</span>
            <button
              onClick={() => setShowMobileMenu(false)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          <div className="py-4">
            <button
              onClick={handleGamesClick}
              className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors duration-200"
            >
              Join Games
            </button>
            
            {user ? (
              <>
                <button
                  onClick={handleDashboardClick}
                  className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center space-x-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={handleProfileClick}
                  className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center space-x-2"
                >
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </button>
                <hr className="my-2 border-gray-200" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  setShowLogin(true);
                  setShowSignUp(false);
                }}
                className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                data-login-trigger
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Show login prompt for protected routes when not authenticated
  const LoginPrompt = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full text-center bg-white p-6 sm:p-8 rounded-xl shadow-lg">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <LogIn className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
        <p className="text-gray-600 mb-6 text-sm sm:text-base">
          You need to be signed in to access this page. Please log in to continue.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => setShowLogin(true)}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <nav className="sticky top-4 z-40 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-white/90 backdrop-blur-sm rounded-full shadow-xl px-4 sm:px-8 py-4 border border-white/20">
            <div className="flex justify-between items-center">
              <a 
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/');
                  setShowLogin(false);
                  setShowSignUp(false);
                }} 
                className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-purple-600 hover:to-blue-600 px-2 sm:px-4 py-2 rounded-full transition-all duration-200"
              >
                TURFION
              </a>
              
              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center space-x-2">
                <button
                  onClick={() => navigate('/games')}
                  className="text-gray-700 hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 hover:text-white px-4 py-2 rounded-full transition-all duration-200"
                >
                  Join Games
                </button>
                {user ? (
                  <div className="relative" ref={userDropdownRef}>
                    <button 
                      onClick={toggleUserDropdown}
                      className="flex items-center space-x-2 text-gray-700 hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 hover:text-white px-4 py-2 rounded-full transition-all duration-200"
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                        {userProfile?.photoURL ? (
                          <img
                            src={userProfile.photoURL}
                            alt="Profile"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`w-full h-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center ${userProfile?.photoURL ? 'hidden' : ''}`}>
                          <User className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showUserDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* Dropdown Card */}
                    {showUserDropdown && <UserDropdownCard />}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setShowLogin(true);
                      setShowSignUp(false);
                    }}
                    className="text-gray-700 hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 hover:text-white px-4 py-2 rounded-full transition-all duration-200"
                    data-login-trigger
                  >
                    Login
                  </button>
                )}
              </div>

              {/* Mobile Menu Button */}
              <div className="lg:hidden">
                <button
                  onClick={() => setShowMobileMenu(true)}
                  className="p-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors duration-200"
                >
                  <Menu className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {showMobileMenu && <MobileMenu />}

      <div className="pt-4">
        {showLogin && !user ? (
          <Login 
            onSignUpClick={() => {
              setShowLogin(false);
              setShowSignUp(true);
            }}
            onSuccess={handleLoginSuccess}
          />
        ) : showSignUp && !user ? (
          <SignUp 
            onLoginClick={() => {
              setShowSignUp(false);
              setShowLogin(true);
            }}
            onSuccess={handleLoginSuccess}
          />
        ) : requiresAuth && !user ? (
          <LoginPrompt />
        ) : (
          <Routes>
            <Route path="/ground/:id" element={<SportsGroundDetails grounds={sportsGrounds} />} />
            <Route path="/card/:id" element={<CardDetails />} />
            <Route path="/book/:id" element={<BookingCalendar />} />
            <Route path="/receipt/:id" element={<BookingReceipt isModal={false} />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/mfa-settings" element={<MfaSettings />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/games" element={<Games />} />
            <Route path="/" element={
              <div className="container mx-auto px-4 py-8">
                {/* Hero Section */}
                <HeroSection />
                
                {/* Community Cards Section */}
                <div id="cards">
                  <CommunityCards />
                </div>
              </div>
            } />
          </Routes>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default App;