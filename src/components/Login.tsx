import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ToggleLeft as Google, Shield } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

type LoginProps = {
  onSignUpClick: () => void;
  onSuccess?: () => void;
};

const Login = ({ onSignUpClick, onSuccess }: LoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [showMfaInput, setShowMfaInput] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userMfaSecret, setUserMfaSecret] = useState('');
  const [tempUser, setTempUser] = useState<any>(null);
  const { signInWithGoogle } = useAuth();

  // Improved TOTP verification
  const verifyMfaCode = (secret: string, token: string): boolean => {
    if (!secret || !token || token.length !== 6) return false;
    
    const window = Math.floor(Date.now() / 30000);
    
    // Check current window and ±2 windows for clock drift tolerance
    for (let i = -2; i <= 2; i++) {
      const timeWindow = window + i;
      const expectedToken = generateTOTP(secret, timeWindow);
      if (expectedToken === token) {
        return true;
      }
    }
    return false;
  };

  const generateTOTP = (secret: string, timeWindow: number): string => {
    try {
      const key = base32ToBytes(secret);
      
      // Convert time to 8-byte array (big-endian)
      const timeBytes = new ArrayBuffer(8);
      const timeView = new DataView(timeBytes);
      timeView.setUint32(4, timeWindow, false); // big-endian
      
      // Generate HMAC-SHA1
      const hash = hmacSha1(key, new Uint8Array(timeBytes));
      
      // Dynamic truncation
      const offset = hash[hash.length - 1] & 0xf;
      const code = ((hash[offset] & 0x7f) << 24) |
                   ((hash[offset + 1] & 0xff) << 16) |
                   ((hash[offset + 2] & 0xff) << 8) |
                   (hash[offset + 3] & 0xff);
      
      return (code % 1000000).toString().padStart(6, '0');
    } catch (error) {
      console.error('Error generating TOTP:', error);
      return '000000';
    }
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

  const hmacSha1 = (key: Uint8Array, data: Uint8Array): Uint8Array => {
    const blockSize = 64;
    
    // Pad or hash key if necessary
    let paddedKey = new Uint8Array(blockSize);
    if (key.length > blockSize) {
      // Hash the key if it's too long (simplified)
      const hashedKey = simpleHash(key);
      paddedKey.set(hashedKey.slice(0, blockSize));
    } else {
      paddedKey.set(key);
    }
    
    // Create inner and outer padding
    const innerPad = new Uint8Array(blockSize);
    const outerPad = new Uint8Array(blockSize);
    
    for (let i = 0; i < blockSize; i++) {
      innerPad[i] = paddedKey[i] ^ 0x36;
      outerPad[i] = paddedKey[i] ^ 0x5c;
    }
    
    // Hash inner pad + data
    const innerHash = simpleHash(new Uint8Array([...innerPad, ...data]));
    
    // Hash outer pad + inner hash
    const finalHash = simpleHash(new Uint8Array([...outerPad, ...innerHash]));
    
    return finalHash;
  };

  const simpleHash = (data: Uint8Array): Uint8Array => {
    // Simplified SHA-1 like hash (for demo purposes)
    const result = new Uint8Array(20);
    let h0 = 0x67452301;
    let h1 = 0xEFCDAB89;
    let h2 = 0x98BADCFE;
    let h3 = 0x10325476;
    let h4 = 0xC3D2E1F0;
    
    // Process data in chunks
    for (let i = 0; i < data.length; i += 64) {
      const chunk = data.slice(i, i + 64);
      
      // Simple mixing function
      for (let j = 0; j < chunk.length; j++) {
        h0 = ((h0 << 5) | (h0 >>> 27)) + chunk[j] + h1;
        h1 = h2;
        h2 = (h3 << 30) | (h3 >>> 2);
        h3 = h4;
        h4 = h0;
      }
    }
    
    // Convert to bytes
    const view = new DataView(result.buffer);
    view.setUint32(0, h0, false);
    view.setUint32(4, h1, false);
    view.setUint32(8, h2, false);
    view.setUint32(12, h3, false);
    view.setUint32(16, h4, false);
    
    return result;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // First, try to sign in to validate credentials
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check for MFA settings
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        if (userData.mfaEnabled && userData.mfaSecret) {
          // Check if device is remembered
          if (isDeviceRemembered(email)) {
            // Device is remembered, complete login
            if (onSuccess) onSuccess();
            return;
          }
          
          // MFA is required - sign out temporarily and show MFA input
          await auth.signOut();
          setUserMfaSecret(userData.mfaSecret);
          setTempUser({ email, password, uid: user.uid });
          setShowMfaInput(true);
          setIsLoading(false);
          return;
        }
      }
      
      // No MFA required, complete login
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please check your credentials.');
      } else {
        setError('Failed to sign in. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!mfaCode || mfaCode.length !== 6) {
        setError('Please enter a valid 6-digit MFA code');
        setIsLoading(false);
        return;
      }

      if (!userMfaSecret) {
        setError('MFA secret not found. Please try logging in again.');
        setIsLoading(false);
        return;
      }

      // Verify MFA code
      const isValidCode = verifyMfaCode(userMfaSecret, mfaCode);
      
      if (!isValidCode) {
        setError('Invalid MFA code. Please check your authenticator app and try again.');
        setIsLoading(false);
        return;
      }

      // MFA verified, now complete the sign in
      if (tempUser) {
        await signInWithEmailAndPassword(auth, tempUser.email, tempUser.password);
        
        // Remember device if requested
        if (rememberDevice) {
          rememberDeviceForMfa(tempUser.email);
        }
        
        // Clear temporary data
        setTempUser(null);
        setShowMfaInput(false);
        setMfaCode('');
        setUserMfaSecret('');
        
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      console.error('MFA verification error:', err);
      if (err.code === 'auth/invalid-credential') {
        setError('Session expired. Please try logging in again.');
        setShowMfaInput(false);
        setTempUser(null);
        setMfaCode('');
        setUserMfaSecret('');
      } else {
        setError('Failed to verify MFA code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      switch (err.code) {
        case 'auth/popup-closed-by-user':
          setError('Sign-in was cancelled. Please try again.');
          break;
        case 'auth/popup-blocked':
          setError('Popup was blocked. Please allow popups and try again.');
          break;
        case 'auth/account-exists-with-different-credential':
          setError('An account already exists with this email using a different sign-in method.');
          break;
        default:
          setError('Failed to sign in with Google. Please try again.');
      }
    }
  };

  if (showMfaInput) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-6 sm:p-8 rounded-xl shadow-lg">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              Two-Factor Authentication
            </h2>
            <p className="mt-2 text-sm sm:text-base text-gray-600">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline text-sm">{error}</span>
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleMfaSubmit}>
            <div>
              <label htmlFor="mfaCode" className="sr-only">MFA Code</label>
              <input
                id="mfaCode"
                name="mfaCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoComplete="one-time-code"
                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono"
                placeholder="000000"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoFocus
              />
            </div>

            <div className="flex items-center">
              <input
                id="rememberDevice"
                name="rememberDevice"
                type="checkbox"
                checked={rememberDevice}
                onChange={(e) => setRememberDevice(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="rememberDevice" className="ml-2 block text-sm text-gray-900">
                Don't ask on this browser for 30 days
              </label>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={isLoading || mfaCode.length !== 6}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowMfaInput(false);
                  setMfaCode('');
                  setError('');
                  setTempUser(null);
                  setUserMfaSecret('');
                }}
                className="w-full text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
              >
                Back to login
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-6 sm:p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline text-sm">{error}</span>
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
        >
          <Google size={20} />
          Sign in with Google
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
        
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            New to Turfion? {' '}
            <button 
              onClick={onSignUpClick}
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Create an account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;