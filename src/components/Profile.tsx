import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Edit, Save, X, Shield, Settings, Camera, Image, AlertTriangle } from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface UserProfile {
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  mfaEnabled?: boolean;
  mfaSecret?: string;
}

const Profile: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    displayName: '',
    phoneNumber: '',
    photoURL: '',
    mfaEnabled: false
  });
  const [editForm, setEditForm] = useState<UserProfile>({
    displayName: '',
    phoneNumber: '',
    photoURL: '',
    mfaEnabled: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showMfaVerification, setShowMfaVerification] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [pendingChanges, setPendingChanges] = useState<UserProfile | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const profileData = {
            displayName: userData.displayName || '',
            phoneNumber: userData.phoneNumber || '',
            photoURL: userData.photoURL || '',
            mfaEnabled: userData.mfaEnabled || false,
            mfaSecret: userData.mfaSecret || ''
          };
          setProfile(profileData);
          setEditForm(profileData);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const verifyMfaCode = async (secret: string, token: string): Promise<boolean> => {
  const time = Math.floor(Date.now() / 30000);

  for (let i = -1; i <= 1; i++) {
    const expected = await generateTOTP(secret, time + i);
    console.log(`TOTP window [${i}]: ${expected}`);
    if (expected === token) return true;
  }

  return false;
};


  const generateTOTP = async (secret: string, timeWindow: number): Promise<string> => {
  const key = base32Decode(secret);
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(4, timeWindow, false);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const hmac = await crypto.subtle.sign('HMAC', cryptoKey, new Uint8Array(buffer));
  const hash = new Uint8Array(hmac);

  const offset = hash[hash.length - 1] & 0x0f;
  const code = ((hash[offset] & 0x7f) << 24) |
               ((hash[offset + 1] & 0xff) << 16) |
               ((hash[offset + 2] & 0xff) << 8) |
               (hash[offset + 3] & 0xff);

  const token = (code % 1_000_000).toString().padStart(6, '0');
  return token;
};


  const base32Decode = (input: string): Uint8Array => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = input.replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const output = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = alphabet.indexOf(cleaned[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
};

  const hmacSha1 = async (key: Uint8Array, data: Uint8Array): Promise<Uint8Array> => {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
  return new Uint8Array(signature);
};


  const handleEdit = () => {
    setIsEditing(true);
    setError('');
    setSuccess('');
    setImageError(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm(profile);
    setError('');
    setSuccess('');
    setImageError(false);
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate image URL if provided
    if (editForm.photoURL && editForm.photoURL.trim()) {
      try {
        const url = new URL(editForm.photoURL.trim());
        if (!url.protocol.startsWith('http')) {
          setError('Please enter a valid image URL (must start with http:// or https://)');
          return;
        }
      } catch {
        setError('Please enter a valid image URL');
        return;
      }
    }

    // Check if MFA is enabled and changes are being made
    if (profile.mfaEnabled && profile.mfaSecret) {
      setPendingChanges(editForm);
      setShowMfaVerification(true);
      return;
    }

    // If no MFA, save directly
    await saveChanges(editForm);
  };

  const saveChanges = async (changes: UserProfile) => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateDoc(doc(db, 'users', user!.uid), {
        displayName: changes.displayName || '',
        phoneNumber: changes.phoneNumber || '',
        photoURL: changes.photoURL || '',
        updatedAt: new Date()
      });

      setProfile(changes);
      setIsEditing(false);
      setImageError(false);
      setSuccess('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleMfaVerification = async () => {
  if (!mfaCode || mfaCode.length !== 6) {
    setError('Please enter a valid 6-digit MFA code');
    return;
  }

  if (!profile.mfaSecret || !(await verifyMfaCode(profile.mfaSecret, mfaCode))) {
    setError('Invalid MFA code. Please try again.');
    return;
  }

  if (pendingChanges) {
    await saveChanges(pendingChanges);
    setPendingChanges(null);
    setShowMfaVerification(false);
    setMfaCode('');
  }
};


  const handleInputChange = (field: keyof UserProfile, value: string | boolean) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
    if (field === 'photoURL') {
      setImageError(false);
    }
  };

  const handleMfaSettings = () => {
    navigate('/mfa-settings');
  };

  const handleMfaResetRequest = () => {
    navigate('/dashboard');
    // Set the active tab to MFA reset after navigation
    setTimeout(() => {
      const event = new CustomEvent('setDashboardTab', { detail: 'mfa-reset' });
      window.dispatchEvent(event);
    }, 100);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageError(false);
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Please log in to view your profile</h2>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
            {/* Profile Picture */}
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-white/20">
                {profile.photoURL && !imageError ? (
                  <img
                    src={profile.photoURL}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                    onLoad={handleImageLoad}
                  />
                ) : (
                  <div className="w-full h-full bg-white/20 flex items-center justify-center">
                    <User className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                  </div>
                )}
              </div>
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold">Welcome back!</h1>
              <p className="text-blue-100 text-lg">{profile.displayName || user.email}</p>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Profile Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Profile Card */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Profile Information</h2>
                {!isEditing ? (
                  <button
                    onClick={handleEdit}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{saving ? 'Saving...' : 'Save'}</span>
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  </div>
                )}
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Email Address</h3>
                    <p className="text-gray-600 break-all">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Camera className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Profile Picture</h3>
                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          type="url"
                          value={editForm.photoURL || ''}
                          onChange={(e) => handleInputChange('photoURL', e.target.value)}
                          placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {editForm.photoURL && (
                          <div className="flex items-center space-x-3">
                            <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                              {!imageError ? (
                                <img
                                  src={editForm.photoURL}
                                  alt="Preview"
                                  className="w-full h-full object-cover"
                                  onError={handleImageError}
                                  onLoad={handleImageLoad}
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                  <Image className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="text-sm">
                              {imageError ? (
                                <span className="text-red-600">Invalid image URL</span>
                              ) : (
                                <span className="text-green-600">Preview</span>
                              )}
                            </div>
                          </div>
                        )}
                        <p className="text-xs text-gray-500">
                          Enter a direct link to an image (JPG, PNG, GIF). The image should be publicly accessible.
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3">
                        {profile.photoURL && !imageError ? (
                          <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                            <img
                              src={profile.photoURL}
                              alt="Profile"
                              className="w-full h-full object-cover"
                              onError={handleImageError}
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                            <User className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        <p className="text-gray-600">{profile.photoURL ? 'Custom image set' : 'No image set'}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Display Name</h3>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.displayName || ''}
                        onChange={(e) => handleInputChange('displayName', e.target.value)}
                        placeholder="Enter your display name"
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-600">{profile.displayName || 'Not set'}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Phone className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Phone Number</h3>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editForm.phoneNumber || ''}
                        onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                        placeholder="Enter your phone number"
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-600">{profile.phoneNumber || 'Not set'}</p>
                    )}
                  </div>
                </div>

                {/* MFA Section */}
                <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <Shield className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Multi-Factor Authentication</h3>
                    <p className="text-gray-600 text-sm mb-2">
                      Add an extra layer of security to your account
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        profile.mfaEnabled 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {profile.mfaEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <button
                        onClick={handleMfaSettings}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Manage MFA</span>
                      </button>
                      {profile.mfaEnabled && (
                        <button
                          onClick={handleMfaResetRequest}
                          className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 text-sm"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          <span>Request Reset</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Security Info */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Security</h3>
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
                  <span className="text-gray-600">MFA Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    profile.mfaEnabled 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {profile.mfaEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* MFA Help */}
            {profile.mfaEnabled && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-yellow-800">MFA Issues?</h4>
                    <p className="text-sm text-yellow-700 mt-1 mb-3">
                      If you've lost access to your authenticator app or device, you can request an MFA reset from administrators.
                    </p>
                    <button
                      onClick={handleMfaResetRequest}
                      className="text-sm bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 transition-colors duration-200"
                    >
                      Request MFA Reset
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MFA Verification Modal */}
      {showMfaVerification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Verify Changes</h2>
              <button
                onClick={() => {
                  setShowMfaVerification(false);
                  setMfaCode('');
                  setPendingChanges(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">MFA Verification Required</h3>
                <p className="text-gray-600">
                  Enter your MFA code to confirm profile changes
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter 6-digit code from Google Authenticator
                </label>
                <input
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg font-mono"
                />
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleMfaVerification}
                  disabled={saving}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium disabled:opacity-50"
                >
                  {saving ? 'Verifying...' : 'Verify & Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setShowMfaVerification(false);
                    setMfaCode('');
                    setPendingChanges(null);
                  }}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;