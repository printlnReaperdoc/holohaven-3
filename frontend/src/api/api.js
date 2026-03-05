import { getToken } from "../auth/token";
import { Platform } from 'react-native';
import axios from 'axios';

// Determine base URL with better platform detection
// Platform detection takes precedence over environment variables for reliability
let API_URL;

// Always use platform-specific URLs for mobile apps
if (Platform.OS === 'android') {
  // Use actual PC IP address for more reliable connection
  // This works better than 10.0.2.2 which can be unreliable
  API_URL = 'http://192.168.68.111:4000'; // Android emulator - use PC's actual IP
} else if (Platform.OS === 'ios') {
  API_URL = 'http://localhost:4000'; // iOS simulator
} else if (Platform.OS === 'web') {
  API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000'; // Web
} else {
  // Physical device or unknown platform
  API_URL = process.env.REACT_APP_API_URL || 'http://192.168.68.111:4000';
}

// Ensure URL doesn't have trailing slash
API_URL = API_URL.replace(/\/$/, '');

console.log('🔗 API_URL configured:', API_URL, 'Platform:', Platform.OS);

// Export API_URL for use in Redux slices
export { API_URL };

// Create axios instance with interceptor for auth token
export const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Increase timeout to 30s for FormData uploads
  // Do NOT set Content-Type header - let Axios handle it
  // This allows FormData to set multipart/form-data with proper boundary
});

// Add request interceptor to include auth token
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('✅ Token added to request:', config.method.toUpperCase(), config.url);
      } else {
        console.warn('⚠️ No token found for authenticated request:', config.method.toUpperCase(), config.url);
      }
      
      // For FormData, ensure Content-Type is NOT explicitly set (let Axios handle it)
      // For JSON, set Content-Type only if data is present
      if (config.data instanceof FormData) {
        // FormData - do not set Content-Type, Axios will handle it with proper boundary
        delete config.headers['Content-Type'];
        console.log('📦 FormData request detected:', {
          url: config.url,
          method: config.method,
          timeout: config.timeout,
          baseURL: config.baseURL,
        });
      } else if (config.data && typeof config.data === 'object') {
        // JSON request
        config.headers['Content-Type'] = 'application/json';
        console.log('🔗 JSON request:', {
          url: config.url,
          method: config.method,
          dataKeys: Object.keys(config.data),
        });
      }
      
    } catch (error) {
      console.error('❌ Error retrieving token:', error);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('✅ Response received:', response.status, response.config.method.toUpperCase(), response.config.url);
    return response;
  },
  (error) => {
    console.error('❌ Response error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method,
      baseURL: error.config?.baseURL,
      fullURL: error.config?.baseURL + error.config?.url,
    });

    if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Request timeout - API server may not be responding');
    } else if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      console.error('🌐 Network error - cannot connect to API at:', API_URL);
      console.error('📍 Ensure backend is running and accessible from your platform');
    } else if (error.request && !error.response) {
      console.error('❌ Request made but no response - server may be unreachable');
      console.error('🔗 Trying to reach:', error.config?.baseURL + error.config?.url);
    } else if (error.response?.status === 401) {
      console.error('🔐 Unauthorized - Token might be expired');
    } else if (error.response?.status === 403) {
      console.error('🚫 Forbidden - Access denied');
    }
    return Promise.reject(error);
  }
);

export const apiFetch = async (endpoint, options = {}) => {
  const token = await getToken();

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });
};
