"use client";

/**
 * Extract user information from JWT token stored in cookies
 * Returns userId, restaurantId, email, role, firstName, lastName
 */
export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  
  try {
    // Try to get token from HttpOnly cookie first
    let token = null
    try {
      const cookies = document.cookie ? document.cookie.split(';') : [];
      const tokenCookie = cookies.find(c => c.trim().startsWith('token='));
      if (tokenCookie) {
        token = tokenCookie.split('=')[1];
      }
    } catch (e) {
      console.warn('Error reading document.cookie', e);
    }

    // If cookie is not present (HttpOnly), fallback to localStorage-stored token
    if (!token) {
      try {
        token = localStorage.getItem('token') || null;
        if (token) {
          // note: this token is stored client-side as a fallback
        }
      } catch (e) {
        console.warn('Unable to read token from localStorage', e);
      }
    }

    if (!token) {
      console.warn('No token found in cookies or localStorage');
      return null;
    }
    
    // Decode JWT (simple base64 decode of payload)
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT format');
      return null;
    }
    
    // Decode the payload (second part)
    // JWT uses base64url encoding, convert to standard base64 first
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // Add padding if needed
    const paddedPayload = payload + '='.repeat((4 - (payload.length % 4)) % 4);
    
    const decoded = JSON.parse(atob(paddedPayload));
    
    return {
      userId: decoded.userId,
      restaurantId: decoded.restaurantId,
      email: decoded.email,
      role: decoded.role,
      firstName: decoded.firstName,
      lastName: decoded.lastName
    };
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return getCurrentUser() !== null;
}

/**
 * Get user ID from JWT token
 */
export function getUserId() {
  const user = getCurrentUser();
  return user?.userId || null;
}

/**
 * Get restaurant ID from JWT token
 */
export function getRestaurantId() {
  const user = getCurrentUser();
  return user?.restaurantId || null;
}
