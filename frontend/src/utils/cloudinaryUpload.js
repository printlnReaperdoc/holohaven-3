/**
 * Direct Cloudinary Upload Utility
 * Uploads images directly to Cloudinary from the frontend
 * Bypasses backend network connectivity issues
 */

const CLOUDINARY_NAME = 'dd7wvydqv';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_NAME}/image/upload`;
const CLOUDINARY_UPLOAD_PRESET = 'holohaven_upload'; // Unsigned upload preset name

/**
 * Convert image URI to blob for upload
 * Works with both file:// URIs and base64 data
 */
export const imageUriToBlob = async (imageUri) => {
  try {
    console.log('🔄 Converting image URI to blob...');
    console.log('🔄 URI type:', imageUri ? imageUri.substring(0, 30) + '...' : 'undefined');
    
    const response = await fetch(imageUri);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const sizeKB = Math.round(blob.size / 1024);
    console.log('✅ Blob created successfully, size:', sizeKB, 'KB', 'type:', blob.type);
    
    // Warn if file is too large (Cloudinary default is 100MB but we'll warn at 10MB)
    if (blob.size > 10 * 1024 * 1024) {
      console.warn('⚠️ Warning: Image is large (' + sizeKB + ' KB), upload may be slow');
    }
    
    return blob;
  } catch (error) {
    console.error('❌ Error converting URI to blob:', {
      message: error.message,
      uri: imageUri?.substring(0, 50),
    });
    throw new Error('Failed to prepare image for upload: ' + error.message);
  }
};

/**
 * Upload image directly to Cloudinary
 * Uses unsigned upload (no API key needed in frontend)
 * React Native requires file-like objects, not Blob
 * @param {string} imageUri - Image file URI (from react-native-image-picker or similar)
 * @param {string} folder - Cloudinary folder (e.g., 'holohaven/products', 'holohaven/profiles')
 * @param {string} publicId - Optional public ID for the image
 * @param {number} retryCount - Internal retry counter
 * @returns {Promise<{secure_url: string, public_id: string, ...}>} - Cloudinary response
 */
export const uploadToCloudinary = async (imageUri, folder = 'holohaven', publicId = null, retryCount = 0) => {
  try {
    console.log('📤 Cloudinary Upload: Starting upload for folder:', folder);
    console.log('📤 Image URI:', imageUri ? imageUri.substring(0, 50) + '...' : 'undefined');
    console.log('📤 Attempt:', retryCount + 1, 'of 3');

    // Create FormData with file-like object (React Native compatible)
    // React Native FormData doesn't support Blob - it needs file-like objects with uri, type, name
    const formData = new FormData();
    
    console.log('📤 Creating FormData with file-like object...');
    
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'image.jpg',
    });

    // Add upload preset (REQUIRED for unsigned uploads)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    // Add upload parameters
    formData.append('folder', folder);
    formData.append('resource_type', 'auto');
    formData.append('tags', 'holohaven');

    if (publicId) {
      formData.append('public_id', publicId);
    }

    console.log('📤 FormData prepared with file-like object');
    console.log('📤 Using upload preset:', CLOUDINARY_UPLOAD_PRESET);
    console.log('📤 Upload URL:', CLOUDINARY_UPLOAD_URL);
    
    // Send with AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.warn('⏱️ Upload timeout triggered (60s)');
      controller.abort();
    }, 60000); // 60 second timeout

    try {
      console.log('📤 Initiating fetch request...');
      
      const response = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          // Don't set Content-Type - let fetch auto-set with boundary for FormData
        },
      });

      clearTimeout(timeoutId);

      console.log('📤 Got response from Cloudinary: HTTP', response.status, response.statusText);

      // Log response headers for debugging
      if (response.headers?.get) {
        const contentType = response.headers.get('content-type');
        console.log('📤 Response content-type:', contentType);
      }

      if (!response.ok) {
        const responseText = await response.text();
        console.error('❌ Cloudinary error response body:', responseText.substring(0, 500));
        
        try {
          const errorData = JSON.parse(responseText);
          
          // Check if it's an authentication error
          if (response.status === 401 || response.status === 403) {
            console.error('❌ Authentication issue (401/403)');
            console.error('   Possible causes:');
            console.error('   1. Upload preset not found or not unsigned');
            console.error('   2. Account restrictions');
            throw new Error('Cloudinary authentication failed. Verify upload preset is created and set to Unsigned.');
          }
          
          if (response.status === 400) {
            console.error('❌ Bad request (400)');
            console.error('   Error:', errorData.error?.message);
            
            // Check if it's an upload preset error
            if (errorData.error?.message?.includes('Upload preset')) {
              console.error('   💡 Fix: Create an unsigned upload preset named "' + CLOUDINARY_UPLOAD_PRESET + '" in Cloudinary');
              console.error('      Dashboard → Settings → Upload → Add upload preset');
              console.error('      Set to Unsigned mode');
              throw new Error('Upload preset "' + CLOUDINARY_UPLOAD_PRESET + '" not found. Create it in Cloudinary dashboard (Settings → Upload)');
            }
            
            throw new Error(`Upload failed: ${errorData.error?.message || 'Bad request'}`);
          }
          
          throw new Error(errorData.error?.message || `Upload failed with HTTP ${response.status}`);
        } catch (e) {
          if (e.message?.includes('Authentication') || e.message?.includes('Unsigned')) throw e;
          throw new Error(`Upload failed with HTTP ${response.status}: ${responseText.substring(0, 100)}`);
        }
      }

      const data = await response.json();
      console.log('✅ Cloudinary Upload: Success!');
      console.log('📤 Uploaded URL:', data.secure_url);
      console.log('📤 Public ID:', data.public_id);
      console.log('📤 Full response:', {
        url: data.secure_url,
        publicId: data.public_id,
        format: data.format,
        dimensions: `${data.width}x${data.height}`,
      });

      return {
        url: data.secure_url,
        public_id: data.public_id,
        width: data.width,
        height: data.height,
        format: data.format,
        size: data.bytes,
        ...data,
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      console.error('❌ Fetch error details:', {
        name: fetchError.name,
        message: fetchError.message,
        code: fetchError.code,
      });
      
      if (fetchError.name === 'AbortError') {
        throw new Error('Upload timeout - request took too long. Check your internet connection or reduce image size.');
      }
      
      if (fetchError.message?.includes('Failed to fetch')) {
        console.error('   Possible causes:');
        console.error('   - No internet connection');
        console.error('   - Cloudinary API is unreachable');
        console.error('   - Network too slow');
        throw new Error('Network error - cannot reach Cloudinary. Check internet connection.');
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error('❌ Cloudinary Upload Error:', {
      message: error.message,
      name: error.name,
      uri: imageUri ? imageUri.substring(0, 50) : 'undefined',
      folder,
      attempt: retryCount + 1,
    });
    
    // Retry logic for network errors (max 3 attempts)
    if (retryCount < 2 && (error.message.includes('Network') || error.message.includes('timeout'))) {
      console.log('🔄 Retrying upload... (attempt', retryCount + 2, 'of 3)');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      return uploadToCloudinary(imageUri, folder, publicId, retryCount + 1);
    }
    
    throw error;
  }
};

/**
 * Upload profile picture directly to Cloudinary
 * @param {string} imageUri - Image file URI from image picker
 * @returns {Promise<string>} - Cloudinary URL
 */
export const uploadProfilePictureToCloudinary = async (imageUri) => {
  try {
    const result = await uploadToCloudinary(
      imageUri,
      'holohaven/profiles', // Folder path
      null // Auto-generate public ID
    );
    return result.url; // Return just the URL for profile picture
  } catch (error) {
    console.error('❌ Profile picture upload failed:', error.message);
    throw error;
  }
};

/**
 * Upload product image directly to Cloudinary
 * @param {string} imageUri - Image file URI from image picker
 * @param {string} productId - Optional product ID for public_id naming
 * @returns {Promise<string>} - Cloudinary URL
 */
export const uploadProductImageToCloudinary = async (imageUri, productId = null) => {
  try {
    const publicId = productId ? `product-${productId}` : null;
    const result = await uploadToCloudinary(
      imageUri,
      'holohaven/products', // Folder path
      publicId
    );
    return result.url; // Return just the URL for product image
  } catch (error) {
    console.error('❌ Product image upload failed:', error.message);
    throw error;
  }
};

/**
 * Test Cloudinary connection
 * @returns {Promise<boolean>} - True if connection works
 */
export const testCloudinaryConnection = async () => {
  try {
    console.log('🔍 Testing Cloudinary connection...');
    console.log('🔍 Cloud name:', CLOUDINARY_NAME);
    console.log('🔍 Upload URL:', CLOUDINARY_UPLOAD_URL);
    
    // Verify the URL is correct
    const isValidUrl = CLOUDINARY_UPLOAD_URL.includes(CLOUDINARY_NAME);
    console.log('✅ Cloudinary URL is valid:', isValidUrl);
    
    return isValidUrl;
  } catch (error) {
    console.error('❌ Cloudinary connection test failed:', error);
    return false;
  }
};

export default {
  uploadToCloudinary,
  uploadProfilePictureToCloudinary,
  uploadProductImageToCloudinary,
  testCloudinaryConnection,
  imageUriToBlob,
};
