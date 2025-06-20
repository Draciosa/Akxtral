import React, { useState, useRef, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Calendar from './components/DatePicker/Calendar';
import Login from './components/Login';
import SignUp from './components/SignUp';
import SportsGroundDetails from './components/SportsGroundDetails';
import CardDetails from './components/CardDetails';
import BookingCalendar from './components/BookingCalendar';
import Profile from './components/Profile';
import Dashboard from './components/Dashboard';
import CommunityCards from './components/CommunityCards';
import Games from './components/Games';
import { useAuth } from './contexts/AuthContext';
import { LogOut, User, ChevronDown } from 'lucide-react';
import { SportsGround } from './types';

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

function App() {
  const { user, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAccountDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setShowLogin(false);
      setShowSignUp(false);
      setShowAccountDropdown(false);
      navigate('/');
    } catch (error) {
      console.error('Failed to log out');
    }
  };

  const handleProfileClick = () => {
    setShowAccountDropdown(false);
    navigate('/profile');
  };

  const handleDashboardClick = () => {
    setShowAccountDropdown(false);
    navigate('/dashboard');
  };

  const AccountDropdown = () => (
    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
      <button
        onClick={handleDashboardClick}
        className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center space-x-2"
      >
        <span>Dashboard</span>
      </button>
      <button
        onClick={handleProfileClick}
        className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center space-x-2"
      >
        <User className="w-4 h-4" />
        <span>Profile</span>
      </button>
      <hr className="my-1 border-gray-200" />
      <button
        onClick={handleLogout}
        className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors duration-200 flex items-center space-x-2"
      >
        <LogOut className="w-4 h-4" />
        <span>Logout</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 bg-black text-white p-4 shadow-lg z-50">
        <div className="container mx-auto flex justify-between items-center">
          <a 
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
              setShowLogin(false);
              setShowSignUp(false);
            }} 
            className="text-2xl font-bold hover:text-gray-300 transition-colors"
          >
            AKXTRAL
          </a>
          <div className="space-x-6 flex items-center">
            <button
              onClick={() => navigate('/games')}
              className="hover:text-gray-300 transition-colors"
            >
              Games
            </button>
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                  className="flex items-center space-x-2 hover:text-gray-300 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-gray-800"
                >
                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAccountDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showAccountDropdown && <AccountDropdown />}
              </div>
            ) : (
              <button
                onClick={() => {
                  setShowLogin(true);
                  setShowSignUp(false);
                }}
                className="hover:text-gray-300 transition-colors"
                data-login-trigger
              >
                Login
              </button>
            )}
          </div>
        </div>
      </nav>

      {showLogin && !user ? (
        <Login onSignUpClick={() => {
          setShowLogin(false);
          setShowSignUp(true);
        }} />
      ) : showSignUp && !user ? (
        <SignUp onLoginClick={() => {
          setShowSignUp(false);
          setShowLogin(true);
        }} />
      ) : (
        <Routes>
          <Route path="/ground/:id" element={<SportsGroundDetails grounds={sportsGrounds} />} />
          <Route path="/card/:id" element={<CardDetails />} />
          <Route path="/book/:id" element={<BookingCalendar />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/games" element={<Games />} />
          <Route path="/" element={
            <div className="container mx-auto px-4 py-8">
              {/* Community Cards Section - Now the main section */}
              <CommunityCards />
            </div>
          } />
        </Routes>
      )}
    </div>
  );
}

export default App;