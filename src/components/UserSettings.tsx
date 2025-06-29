import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Users, Shield, ShieldOff, AlertTriangle, Search, UserX } from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: string;
  displayName?: string;
  mfaEnabled?: boolean;
  mfaSecret?: string;
  createdAt: any;
  updatedAt: any;
  phoneNumber?: string;
}

const UserSettings: React.FC = () => {
  const { hasRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!hasRole('admin')) return;

    const q = query(collection(db, 'users'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];

      // Sort by creation date (most recent first)
      usersData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setUsers(usersData);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
      setLoading(false);
    });

    return unsubscribe;
  }, [hasRole]);

  const handleResetMfa = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to reset MFA for ${userEmail}? This will disable their MFA and remove their secret key.`)) {
      return;
    }

    setProcessing(userId);
    setError('');
    setSuccess('');

    try {
      await updateDoc(doc(db, 'users', userId), {
        mfaEnabled: false,
        mfaSecret: '',
        updatedAt: serverTimestamp()
      });

      // Create notification for the user
      await addDoc(collection(db, 'notifications'), {
        userId: userId,
        type: 'mfa_reset',
        title: 'MFA Reset by Administrator',
        message: 'Your Multi-Factor Authentication has been reset by an administrator. You can set up MFA again from your profile settings if needed.',
        read: false,
        createdAt: serverTimestamp()
      });

      setSuccess(`MFA has been reset for ${userEmail}`);
    } catch (error) {
      console.error('Error resetting MFA:', error);
      setError('Failed to reset MFA. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleChangeRole = async (userId: string, userEmail: string, currentRole: string) => {
    const roles = ['user', 'host', 'admin'];
    const newRole = prompt(`Change role for ${userEmail}. Current role: ${currentRole}\n\nEnter new role (user/host/admin):`, currentRole);
    
    if (!newRole || !roles.includes(newRole.toLowerCase()) || newRole.toLowerCase() === currentRole) {
      return;
    }

    if (!confirm(`Are you sure you want to change ${userEmail}'s role from ${currentRole} to ${newRole.toLowerCase()}?`)) {
      return;
    }

    setProcessing(userId);
    setError('');
    setSuccess('');

    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole.toLowerCase(),
        updatedAt: serverTimestamp()
      });

      // Create notification for the user
      await addDoc(collection(db, 'notifications'), {
        userId: userId,
        type: 'role_changed',
        title: 'Account Role Updated',
        message: `Your account role has been changed from ${currentRole} to ${newRole.toLowerCase()} by an administrator.`,
        read: false,
        createdAt: serverTimestamp()
      });

      setSuccess(`Role changed for ${userEmail} from ${currentRole} to ${newRole.toLowerCase()}`);
    } catch (error) {
      console.error('Error changing role:', error);
      setError('Failed to change role. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp?.toDate) return 'Unknown';
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'host': return 'bg-purple-100 text-purple-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!hasRole('admin')) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
        Only administrators can access user settings.
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
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold flex items-center">
            <Users className="w-6 h-6 mr-2 text-blue-600" />
            User Settings ({users.length} users)
          </h3>
        </div>

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

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search users by email, name, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              {searchTerm ? 'No users match your search' : 'No users found'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {user.displayName || user.email}
                          </h4>
                          {user.displayName && (
                            <p className="text-sm text-gray-600">{user.email}</p>
                          )}
                          {user.phoneNumber && (
                            <p className="text-sm text-gray-500">📞 {user.phoneNumber}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user.role)}`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                        
                        <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center ${
                          user.mfaEnabled 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.mfaEnabled ? (
                            <>
                              <Shield className="w-3 h-3 mr-1" />
                              MFA Enabled
                            </>
                          ) : (
                            <>
                              <ShieldOff className="w-3 h-3 mr-1" />
                              MFA Disabled
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-500 space-y-1">
                      <p>User ID: {user.id}</p>
                      <p>Created: {formatDate(user.createdAt)}</p>
                      {user.updatedAt && (
                        <p>Updated: {formatDate(user.updatedAt)}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                    <button
                      onClick={() => handleChangeRole(user.id, user.email, user.role)}
                      disabled={processing === user.id}
                      className="flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      <UserX className="w-4 h-4" />
                      <span>Change Role</span>
                    </button>
                    
                    {user.mfaEnabled && (
                      <button
                        onClick={() => handleResetMfa(user.id, user.email)}
                        disabled={processing === user.id}
                        className="flex items-center justify-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {processing === user.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Resetting...</span>
                          </>
                        ) : (
                          <>
                            <ShieldOff className="w-4 h-4" />
                            <span>Reset MFA</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-yellow-800">Admin Actions</h4>
              <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                <li>• Reset MFA: Disables MFA and removes secret key for the user</li>
                <li>• Change Role: Modify user permissions (user/host/admin)</li>
                <li>• Users will be notified of any changes made to their account</li>
                <li>• All actions are logged and cannot be undone</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;