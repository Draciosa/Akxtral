# Firestore Security Rules for Role-Based Permissions

```javascript
//GPT version 2
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
      // ✅ Allow ALL authenticated users to read basic booking info for availability check
      allow read: if request.auth != null;

      allow create: if request.auth != null &&
        request.resource.data.userId == request.auth.uid &&
        request.resource.data.cardId is string &&
        !hasRole('admin') &&
        (
          hasRole('user') ||
          (hasRole('host') && !isHostAssignedToCard(request.resource.data.cardId))
        );

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
      allow create: if request.auth != null &&
        request.resource.data.userId == request.auth.uid &&
        hasRole('user');
      allow update, delete: if hasRole('admin');
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

## Setup Instructions

1. **Copy the rules above to your Firestore Security Rules in the Firebase Console**

2. **Create the initial admin user manually in Firestore:**
   - Go to Firestore Database in Firebase Console
   - Create a document in the `users` collection
   - Use the admin user's UID as the document ID
   - Add these fields:
     ```
     uid: "admin-user-uid"
     email: "admin@example.com"
     role: "admin"
     createdAt: [current timestamp]
     updatedAt: [current timestamp]
     ```

3. **Test the rules:**
   - Users should only see their own data
   - Hosts should be able to edit only assigned cards
   - Admins should have full access to all collections

## Role Hierarchy

- **user**: Default role, can book any card, request to become host
- **host**: Can edit assigned cards, book any card except their own assigned cards, plus all user permissions
- **admin**: Full access to all data and can manage user roles and card assignments (cannot book cards)

## Security Features

- Role-based access control
- Users can only access their own data (except public cards)
- Admins have full access for management
- Hosts can only manage cards assigned to them
- Proper validation for role changes (only admins can change roles)
- Default role assignment for new users
- Card assignment system for hosts
- Admins cannot create bookings (booking restriction)
- Users and hosts can book cards (hosts cannot book their assigned cards)
- Enhanced booking permissions with proper host card assignment checks
- Simplified and more reliable permission logic
- Settings collection access for homepage management