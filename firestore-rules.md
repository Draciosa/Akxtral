# Firestore Security Rules for Role-Based Permissions

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to get user role
    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }
    
    // Helper function to check if user has specific role
    function hasRole(role) {
      return request.auth != null && getUserRole() == role;
    }
    
    // Helper function to check if user has any of the specified roles
    function hasAnyRole(roles) {
      return request.auth != null && getUserRole() in roles;
    }
    
    // Users collection - stores user profiles and roles
    match /users/{userId} {
      // Users can read their own profile, admins can read all
      allow read: if request.auth != null && 
        (request.auth.uid == userId || hasRole('admin'));
      
      // Users can create their own profile (on signup)
      allow create: if request.auth != null && 
        request.auth.uid == userId &&
        resource.data.role == 'user'; // Default role is user
      
      // Users can update their own profile (except role), admins can update any profile
      allow update: if request.auth != null && (
        (request.auth.uid == userId && 
         !('role' in request.resource.data.diff(resource.data).affectedKeys())) ||
        hasRole('admin')
      );
      
      // Only admins can delete user profiles
      allow delete: if hasRole('admin');
    }
    
    // Cards collection
    match /cards/{cardId} {
      // Anyone can read cards
      allow read: if true;
      
      // Hosts and admins can create cards
      allow create: if hasAnyRole(['host', 'admin']);
      
      // Card owners and admins can update cards
      allow update: if request.auth != null && (
        resource.data.userId == request.auth.uid ||
        hasRole('admin')
      );
      
      // Card owners and admins can delete cards
      allow delete: if request.auth != null && (
        resource.data.userId == request.auth.uid ||
        hasRole('admin')
      );
    }
    
    // Bookings collection
    match /bookings/{bookingId} {
      // Users can read their own bookings, admins can read all
      allow read: if request.auth != null && (
        resource.data.userId == request.auth.uid ||
        hasRole('admin')
      );
      
      // Authenticated users can create bookings
      allow create: if request.auth != null &&
        request.resource.data.userId == request.auth.uid;
      
      // Booking owners and admins can update bookings
      allow update: if request.auth != null && (
        resource.data.userId == request.auth.uid ||
        hasRole('admin')
      );
      
      // Booking owners and admins can delete bookings
      allow delete: if request.auth != null && (
        resource.data.userId == request.auth.uid ||
        hasRole('admin')
      );
    }
    
    // Host requests collection
    match /Requests/{requestId} {
      // Users can read their own requests, admins can read all
      allow read: if request.auth != null && (
        resource.data.userId == request.auth.uid ||
        hasRole('admin')
      );
      
      // Users can create host requests
      allow create: if request.auth != null &&
        request.resource.data.userId == request.auth.uid &&
        hasRole('user'); // Only users can request to become hosts
      
      // Only admins can update requests (approve/reject)
      allow update: if hasRole('admin');
      
      // Only admins can delete requests
      allow delete: if hasRole('admin');
    }
    
    // Deny all other operations
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
   - Hosts should be able to create and manage their own cards
   - Admins should have full access to all collections

## Role Hierarchy

- **user**: Default role, can book slots, request to become host
- **host**: Can create and manage cards, plus all user permissions
- **admin**: Full access to all data and can manage user roles

## Security Features

- Role-based access control
- Users can only access their own data (except public cards)
- Admins have full access for management
- Hosts can manage their own cards
- Proper validation for role changes (only admins can change roles)
- Default role assignment for new users