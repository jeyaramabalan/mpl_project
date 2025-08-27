// mpl-project/mpl-frontend/src/services/api.js
import axios from 'axios';

// Determine the base URL for the API from environment variables or use a default
const API_URL = import.meta.env.VITE_API_URL || 'https://mpl.supersalessoft.com/api';
//const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
console.log(`API Service configured for URL: ${API_URL}`);

// Create an Axios instance with default configuration
const api = axios.create({
    baseURL: API_URL, // Base URL for all requests made with this instance
    headers: {
        'Content-Type': 'application/json', // Default content type for POST/PUT requests
    },
    timeout: 10000, // Optional: Set a timeout for requests (e.g., 10 seconds)
});

// --- Request Interceptor ---
// This function runs before each request is sent
api.interceptors.request.use(
    (config) => {
        // Attempt to retrieve admin authentication info (token) from local storage
        try {
            const adminInfoString = localStorage.getItem('adminInfo');
            if (adminInfoString) {
                const adminInfo = JSON.parse(adminInfoString);
                // If token exists, add it to the Authorization header using the Bearer scheme
                if (adminInfo && adminInfo.token) {
                    config.headers.Authorization = `Bearer ${adminInfo.token}`;
                     // console.log('Interceptor: Attaching token to request headers.');
                }
            }
        } catch (error) {
            // Handle potential errors parsing JSON from local storage
            console.error("Interceptor: Error reading/parsing adminInfo from localStorage:", error);
            // Optionally clear invalid item: localStorage.removeItem('adminInfo');
        }
        // Must return the config object for the request to proceed
        return config;
    },
    (error) => {
        // Handle errors that occur during request setup
        console.error("Interceptor: Request Error:", error);
        // Reject the promise to propagate the error
        return Promise.reject(error);
    }
);

// --- Response Interceptor ---
// This function runs when a response is received
api.interceptors.response.use(
  (response) => {
      // Any status code within the range of 2xx causes this function to trigger
      // Simply return the successful response
      return response;
  },
  (error) => {
    // Any status codes outside the range of 2xx cause this function to trigger
    console.error('API Response Error Interceptor Caught:', error);

    // Check if the error has a response object (meaning the server responded with an error status)
    if (error.response) {
      console.error('Error Data:', error.response.data);
      console.error('Error Status:', error.response.status);
      // console.error('Error Headers:', error.response.headers);

      // Handle specific error statuses globally
      if (error.response.status === 401) {
        // --- Unauthorized Access ---
        console.warn('Unauthorized (401) detected by interceptor.');
        // Remove potentially invalid authentication info from storage
        localStorage.removeItem('adminInfo');
        // Redirect to login page to force re-authentication
        // Prevent redirect loop if already on login page
        if (!window.location.pathname.includes('/admin/login')) {
            // Preserve the page the user was trying to access for redirection after login
            const intendedPath = window.location.pathname + window.location.search;
            console.log(`Redirecting to login, intended path: ${intendedPath}`);
            // Use window.location.href for a full page reload, clearing state
            window.location.href = `/admin/login?redirect=${encodeURIComponent(intendedPath)}`;
            // Or use react-router's navigate function if available globally (more complex setup)
        }
        // Return a specific rejected promise to prevent further processing in the original caller
        return Promise.reject({ status: 401, message: 'Unauthorized. Please login again.' });

      } else if (error.response.status === 403) {
        // --- Forbidden Access ---
        console.warn('Forbidden (403) detected by interceptor.');
        // User is authenticated but lacks permission for the specific resource
        // Maybe show a notification or redirect to a "permission denied" page
        // Return a specific rejected promise
         return Promise.reject({ status: 403, message: error.response.data?.message || 'Permission Denied.' });
      }

      // For other server errors (4xx, 5xx), extract the message from the response data if possible
      const message = error.response.data?.message || error.message || 'An error occurred processing your request.';
      return Promise.reject({ status: error.response.status, message });


    } else if (error.request) {
      // --- Network Error ---
      // The request was made but no response was received (e.g., server down, network issue)
      console.error('API Network Error:', error.request);
       return Promise.reject({ status: null, message: 'Network Error: Could not connect to the server. Please check your connection.' });

    } else {
      // --- Request Setup Error ---
      // Something happened in setting up the request that triggered an error
      console.error('API Request Setup Error:', error.message);
      return Promise.reject({ status: null, message: error.message || 'An unexpected error occurred while setting up the request.' });
    }

    // Fallback rejection (should ideally be handled above)
    // return Promise.reject(error);
  }
);


export default api; // Export the configured Axios instance