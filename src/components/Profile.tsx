import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Calendar, Settings } from 'lucide-react';

const Profile: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Please log in to view your profile</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-8 mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Welcome back!</h1>
              <p className="text-blue-100 text-lg">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Profile Card */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Profile Information</h2>
              
              <div className="space-y-6">
                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Email Address</h3>
                    <p className="text-gray-600">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">User ID</h3>
                    <p className="text-gray-600 font-mono text-sm">{user.uid}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Account Created</h3>
                    <p className="text-gray-600">
                      {user.metadata.creationTime 
                        ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : 'Recently'
                      }
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <Settings className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Last Sign In</h3>
                    <p className="text-gray-600">
                      {user.metadata.lastSignInTime 
                        ? new Date(user.metadata.lastSignInTime).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'Recently'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Status */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Email Verified</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.emailVerified 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {user.emailVerified ? 'Verified' : 'Pending'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Account Type</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    Standard
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200">
                  <div className="font-medium text-blue-900">Update Profile</div>
                  <div className="text-sm text-blue-600">Edit your account information</div>
                </button>
                <button className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors duration-200">
                  <div className="font-medium text-green-900">Security Settings</div>
                  <div className="text-sm text-green-600">Manage password and security</div>
                </button>
                <button className="w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors duration-200">
                  <div className="font-medium text-purple-900">Privacy Settings</div>
                  <div className="text-sm text-purple-600">Control your privacy preferences</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;