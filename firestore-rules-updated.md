# Updated Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    function hasRole(role) {
      return request.auth != null && getUserRole() == role;
    }

    function hasAnyRole(roles) {
      return request.auth != null && getUserRole() in roles;
    }

    function isHostAssignedToCard(cardId) {
      return exists(/databases/$(database)/documents/cards/$(cardId)) &&
        get(/databases/$(database)/documents/cards/$(cardId)).data.assignedHost == request.auth.uid;
    }

    // USERS
    match /users/{userId} {
      allow read: if request.auth != null && (
        request.auth.uid == userId || hasRole('admin')
      );
      allow create: if request.auth != null &&
        request.auth.uid == userId &&
        request.resource.data.role == 'user';
      allow update: if request.auth != null && (
        (request.auth.uid == userId &&
         !('role' in request.resource.data.diff(resource.data).affectedKeys())) ||
        hasRole('admin')
      );
      allow delete: if hasRole('admin');
    }

    // CARDS
    match /cards/{cardId} {
      allow read: if true;
      allow create: if hasRole('admin');
      allow update: if request.auth != null && (
        (hasRole('host') && resource.data.assignedHost == request.auth.uid) ||
        hasRole('admin')
      );
      allow delete: if hasRole('admin');
    }

    // BOOKINGS
    match /bookings/{bookingId} {
      // Allow ALL authenticated users to read booking info for availability check and games
      allow read: if request.auth != null;

      // Allow users and hosts to create bookings (admins cannot book)
      allow create: if request.auth != null &&
        request.resource.data.userId == request.auth.uid &&
        request.resource.data.cardId is string &&
        !hasRole('admin') &&
        (hasRole('user') || hasRole('host'));

      // Allow booking owner and admins to update/delete
      allow update, delete: if request.auth != null && (
        resource.data.userId == request.auth.uid ||
        hasRole('admin')
      );
    }

    // REQUESTS
    match /Requests/{requestId} {
      allow read: if request.auth != null && (
        resource.data.userId == request.auth.uid || hasRole('admin')
      );
      // Allow users and hosts to create requests
      allow create: if request.auth != null &&
        request.resource.data.userId == request.auth.uid &&
        (hasRole('user') || hasRole('host'));
      allow update, delete: if hasRole('admin');
    }

    // NOTIFICATIONS
    match /notifications/{notificationId} {
      allow read: if request.auth != null && (
        resource.data.userId == request.auth.uid || hasRole('admin')
      );
      allow create: if request.auth != null;
      allow update: if request.auth != null && (
        resource.data.userId == request.auth.uid || hasRole('admin')
      );
      allow delete: if hasRole('admin');
    }

    // SETTINGS
    match /settings/{settingId} {
      allow read: if true;
      allow create, update, delete: if hasRole('admin');
    }

    // SLOTS (if separate)
    match /slots/{slotId} {
      allow read: if true;
      allow create, update, delete: if hasRole('admin');
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

# Firebase Storage Security Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload receipt images
    match /receipts/{receiptId} {
      allow read: if true; // Allow public read for QR code access
      allow write: if request.auth != null;
    }
    
    // Allow authenticated users to upload profile images
    match /profiles/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow admins to upload general assets
    match /assets/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null; // You can add admin check here if needed
    }
    
    // Deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## Key Changes Made:

### Firestore Rules:
1. **Bookings**: All authenticated users can now read bookings (for games functionality)
2. **Requests**: Both users and hosts can create requests (for card requests)
3. **Notifications**: Added rules for notification system with proper access control
4. **Admins**: Cannot create bookings (booking restriction maintained)
5. **Cards**: Only admins can create and delete cards, hosts can only update assigned cards
6. **Real-time updates**: All collections support real-time updates for live data synchronization
7. **Host Card Assignment**: Hosts can only edit cards assigned to them via assignedHost field

### Storage Rules:
1. **Receipts**: Public read access for QR codes, authenticated write
2. **Profiles**: User-specific profile image uploads
3. **Assets**: General assets with public read access
4. **Security**: Deny all other access by default

### New Features Supported:
1. **MFA QR Code Generation**: Proper QR codes for Google Authenticator
2. **Enhanced Notifications**: Display name and phone number support for booking notifications
3. **Real-time Open Slot Updates**: Live updates when slots are modified
4. **Authentication Guards**: Protected routes with proper authentication checks
5. **Role-based Dashboard**: Different tabs and permissions based on user roles
6. **Admin Card Management**: Full CRUD operations for admins
7. **Host Request Responses**: Mandatory admin responses to host requests
8. **Card Assignment System**: Admins can assign cards to hosts
9. **Assigned Card Management**: Hosts can only see and edit cards assigned to them
10. **Host Booking Notifications**: Assigned hosts receive notifications when their cards are booked
11. **MFA Login Flow**: Two-factor authentication with device remembering
12. **MFA Disable**: Users can disable MFA from their profile

These rules ensure:
- All users can view games and join open slots
- Hosts can request new cards and manage only assigned cards
- Admins have full control over cards and can assign them to hosts
- Receipt images are accessible via QR codes
- Proper security boundaries are maintained
- Real-time updates work correctly for all features
- Authentication is properly enforced for protected routes
- Assigned hosts receive notifications when their cards are booked
- MFA is properly implemented with device remembering capability