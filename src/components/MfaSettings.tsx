import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, QrCode, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import QRCode from 'qrcode';

const MfaSettings: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaSecret, setMfaSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disableVerificationCode, setDisableVerificationCode] = useState('');

  useEffect(() => {
    const fetchMfaStatus = async () => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setMfaEnabled(userData.mfaEnabled || false);
          setMfaSecret(userData.mfaSecret || '');
        }
      } catch (error) {
        console.error('Error fetching MFA status:', error);
        setError('Failed to load MFA settings');
      } finally {
        setLoading(false);
      }
    };

    fetchMfaStatus();
  }, [user]);

  const generateMfaSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  };

  const generateQrCode = async (secret: string) => {
    if (!user) return;
    
    const issuer = 'TURFION';
    const accountName = user.email;
    const otpAuthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
    
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);
      setQrCodeUrl(qrCodeDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      setError('Failed to generate QR code');
    }
  };

  // Improved TOTP verification with proper base32 decoding
  const verifyMfaCode = async (secret: string, token: string): Promise<boolean> => {
  if (!secret || !token || token.length !== 6) return false;

  const window = Math.floor(Date.now() / 30000);
  for (let i = -2; i <= 2; i++) {
    const expectedToken = await generateTOTP(secret, window + i);
    if (expectedToken === token) return true;
  }

  return false;
};


  const generateTOTP = async (secret: string, timeWindow: number): Promise<string> => {
  const key = base32ToBytes(secret);

  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(4, timeWindow, false); // Big-endian, 8 bytes

  const hash = await hmacSha1(key, new Uint8Array(buffer));
  const offset = hash[hash.length - 1] & 0xf;

  const binary = ((hash[offset] & 0x7f) << 24) |
                 ((hash[offset + 1] & 0xff) << 16) |
                 ((hash[offset + 2] & 0xff) << 8) |
                 (hash[offset + 3] & 0xff);

  return (binary % 1000000).toString().padStart(6, '0');
};


  const base32ToBytes = (base32: string): Uint8Array => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let output = [];
    
    const cleanBase32 = base32.replace(/=/g, '').toUpperCase();
    
    for (let i = 0; i < cleanBase32.length; i++) {
      const char = cleanBase32[i];
      const index = alphabet.indexOf(char);
      if (index === -1) continue;
      
      value = (value << 5) | index;
      bits += 5;
      
      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 255);
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

  const isDeviceRemembered = (email: string): boolean => {
    try {
      const rememberedDevices = JSON.parse(localStorage.getItem('mfaRememberedDevices') || '{}');
      const deviceKey = `${email}_${navigator.userAgent.slice(0, 50)}`;
      const deviceData = rememberedDevices[deviceKey];
      
      if (deviceData && new Date(deviceData.expires) > new Date()) {
        return true;
      }
      
      if (deviceData && new Date(deviceData.expires) <= new Date()) {
        delete rememberedDevices[deviceKey];
        localStorage.setItem('mfaRememberedDevices', JSON.stringify(rememberedDevices));
      }
      
      return false;
    } catch (error) {
      console.error('Error checking remembered device:', error);
      return false;
    }
  };

  const rememberDeviceForMfa = (email: string) => {
    try {
      const rememberedDevices = JSON.parse(localStorage.getItem('mfaRememberedDevices') || '{}');
      const deviceKey = `${email}_${navigator.userAgent.slice(0, 50)}`;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      
      rememberedDevices[deviceKey] = {
        expires: expiryDate.toISOString(),
        created: new Date().toISOString()
      };
      
      localStorage.setItem('mfaRememberedDevices', JSON.stringify(rememberedDevices));
    } catch (error) {
      console.error('Error remembering device:', error);
    }
  };

  const handleEnableMfa = async () => {
    if (mfaEnabled && mfaSecret) {
  setError("MFA is already enabled. Please disable it first.");
  return;
}

  // Clear old state (important if enabling again)
  setVerificationCode('');
  setError('');
  setSuccess('');
  setQrCodeUrl('');
  setMfaSecret('');

  // Generate a fresh secret
  const secret = generateMfaSecret();
  setMfaSecret(secret);
  await generateQrCode(secret);

  // Show QR setup modal
  setShowSetup(true);
};


  const handleConfirmEnable = async () => {
    console.log('Verifying MFA with secret:', mfaSecret);
    console.log('Code entered:', verificationCode);

    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    if (!(await verifyMfaCode(mfaSecret, verificationCode))) {
  setError('Invalid verification code. Please check your authenticator app and try again.');
  return;
}


    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user!.uid), {
        mfaEnabled: true,
        mfaSecret: mfaSecret,
        updatedAt: new Date()
      });

      setMfaEnabled(true);
      setShowSetup(false);
      setVerificationCode('');
      setSuccess('MFA has been enabled successfully!');
    } catch (error) {
      console.error('Error enabling MFA:', error);
      setError('Failed to enable MFA. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDisableMfa = async () => {
    if (!disableVerificationCode || disableVerificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code to disable MFA');
      return;
    }

    if (!(await verifyMfaCode(mfaSecret, disableVerificationCode))) {
  setError('Invalid verification code. Please try again.');
  return;
}


    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user!.uid), {
        mfaEnabled: false,
        mfaSecret: '',
        updatedAt: new Date()
      });

      setMfaEnabled(false);
      setMfaSecret('');
      setShowDisableConfirm(false);
      setDisableVerificationCode('');
      setSuccess('MFA has been disabled successfully!');
    } catch (error) {
      console.error('Error disabling MFA:', error);
      setError('Failed to disable MFA. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Please log in to access MFA settings</h2>
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
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/profile')}
            className="mb-4 inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Multi-Factor Authentication</h1>
          <p className="text-gray-600">Secure your account with two-factor authentication</p>
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

        {/* MFA Status Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              mfaEnabled ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <Shield className={`w-8 h-8 ${mfaEnabled ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                MFA is {mfaEnabled ? 'Enabled' : 'Disabled'}
              </h2>
              <p className="text-gray-600">
                {mfaEnabled 
                  ? 'Your account is protected with two-factor authentication'
                  : 'Add an extra layer of security to your account'
                }
              </p>
            </div>
          </div>

          {!mfaEnabled ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">Why enable MFA?</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Protects your account even if your password is compromised</li>
                  <li>• Prevents unauthorized access to your bookings and personal data</li>
                  <li>• Required for certain administrative functions</li>
                  <li>• Industry standard security practice</li>
                </ul>
              </div>
              
              <button
                onClick={handleEnableMfa}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
              >
                Enable MFA
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">MFA is Active</h3>
                <p className="text-sm text-green-700">
                  Your account is protected with Google Authenticator. You'll need to enter a code from your authenticator app when signing in.
                </p>
              </div>
              
              <button
                onClick={() => setShowDisableConfirm(true)}
                className="w-full bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium"
              >
                Disable MFA
              </button>
            </div>
          )}
        </div>

        {/* Setup Modal */}
        {showSetup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <QrCode className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Setup Google Authenticator</h3>
                  <p className="text-gray-600 text-sm">
                    Scan this QR code with your Google Authenticator app
                  </p>
                </div>
                
                {/* QR Code */}
                <div className="bg-gray-100 rounded-lg p-8 text-center mb-6">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="MFA QR Code" className="mx-auto" />
                  ) : (
                    <div className="w-32 h-32 bg-white border-2 border-dashed border-gray-300 rounded-lg mx-auto flex items-center justify-center">
                      <QrCode className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Manual Entry */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">Manual Entry</h4>
                  <p className="text-xs text-gray-600 mb-2">If you can't scan the QR code, enter this secret manually:</p>
                  <code className="text-xs bg-white px-2 py-1 rounded border break-all">{mfaSecret}</code>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">Setup Instructions:</h4>
                  <ol className="text-sm text-blue-700 space-y-1">
                    <li>1. Download Google Authenticator app</li>
                    <li>2. Scan the QR code above or enter the secret manually</li>
                    <li>3. Enter the 6-digit code below</li>
                    <li>4. Click "Enable MFA" to complete setup</li>
                  </ol>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter 6-digit code from Google Authenticator
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="000000"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg font-mono"
                    autoFocus
                  />
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleConfirmEnable}
                    disabled={saving || verificationCode.length !== 6}
                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium disabled:opacity-50"
                  >
                    {saving ? 'Enabling...' : 'Enable MFA'}
                  </button>
                  <button
                    onClick={() => {
                      setShowSetup(false);
                      setVerificationCode('');
                      setError('');
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

        {/* Disable Confirmation Modal */}
        {showDisableConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Disable MFA</h3>
                  <p className="text-gray-600 text-sm">
                    Enter your current MFA code to disable two-factor authentication
                  </p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-red-700">
                    <strong>Warning:</strong> Disabling MFA will make your account less secure. 
                    You can re-enable it at any time.
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter 6-digit code from Google Authenticator
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="000000"
                    maxLength={6}
                    value={disableVerificationCode}
                    onChange={(e) => setDisableVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-center text-lg font-mono"
                  />
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleDisableMfa}
                    disabled={saving || disableVerificationCode.length !== 6}
                    className="w-full bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium disabled:opacity-50"
                  >
                    {saving ? 'Disabling...' : 'Disable MFA'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDisableConfirm(false);
                      setDisableVerificationCode('');
                      setError('');
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
    </div>
  );
};

export default MfaSettings;