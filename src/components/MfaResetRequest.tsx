import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface MfaResetRequestProps {
  onSuccess?: () => void;
}

const MfaResetRequest: React.FC<MfaResetRequestProps> = ({ onSuccess }) => {
  const { user, userProfile } = useAuth();
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to submit a request');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for your MFA reset request');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await addDoc(collection(db, 'Requests'), {
        userId: user.uid,
        userEmail: user.email,
        userDisplayName: userProfile?.displayName || '',
        userPhoneNumber: userProfile?.phoneNumber || '',
        message: reason,
        status: 'pending',
        requestType: 'mfa-reset',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setReason('');
      setSuccess(true);

      setTimeout(() => setSuccess(false), 5000);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error submitting MFA reset request:', error);
      setError('Failed to submit request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!userProfile?.mfaEnabled) {
    return (
      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg">
        <div className="flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          <span>MFA is not enabled on your account. You can enable it from your profile settings.</span>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">MFA Reset Request Submitted!</h3>
        <p className="text-gray-600 mb-6">
          Your request to reset Multi-Factor Authentication has been sent to the administrators. 
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
      <div className="flex items-center mb-6">
        <Shield className="w-6 h-6 mr-2 text-red-600" />
        <h3 className="text-xl font-semibold">Request MFA Reset</h3>
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-yellow-800">Important Notice</h4>
            <p className="text-sm text-yellow-700 mt-1">
              This request will be reviewed by administrators. Only submit this request if you've lost access to your authenticator app or device.
              Once approved, your MFA will be completely reset and you'll need to set it up again.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for MFA Reset Request *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please explain why you need your MFA reset (e.g., lost device, new phone, authenticator app issues, etc.)"
            rows={4}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">What happens next?</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Your request will be reviewed by an administrator</li>
            <li>• You'll receive a notification with the decision</li>
            <li>• If approved, your MFA will be reset immediately</li>
            <li>• You can then set up MFA again from your profile</li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
        >
          {isLoading ? 'Submitting Request...' : 'Submit MFA Reset Request'}
        </button>
      </form>
    </div>
  );
};

export default MfaResetRequest;