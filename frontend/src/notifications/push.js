import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { axiosInstance } from '../api/api';
import { getToken } from '../auth/token';
import { navigationRef } from '../navigation/RootNavigator';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const registerForPush = async () => {
  if (!Device.isDevice) return null;

  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return null;

    const token = (await Notifications.getExpoPushTokenAsync()).data;

    // Save token to backend
    if (token) {
      await axiosInstance.post(
        '/users/push-token',
        { token }
      );
    }

    return token;
  } catch (error) {
    console.log('Error registering for push notifications:', error);
    return null;
  }
};

/**
 * Handle notification tap — navigate to appropriate screen
 */
export const handleNotificationResponse = (response) => {
  const data = response.notification?.request?.content?.data || response.notification?.data || {};
  console.log('[PUSH] Notification tapped, data:', data);

  if (data.type === 'order' && data.orderId) {
    // Navigate to order detail screen
    console.log(`[PUSH] Navigating to OrderDetail for order ${data.orderId}`);
    if (navigationRef.current) {
      navigationRef.current.navigate('MainApp', {
        screen: 'OrdersDrawer',
        params: {
          screen: 'OrderDetail',
          params: { orderId: data.orderId },
        },
      });
    }
  } else if (data.type === 'promotion' && data.productId) {
    // Navigate to product detail screen
    console.log(`[PUSH] Navigating to ProductDetail for product ${data.productId}`);
    if (navigationRef.current) {
      navigationRef.current.navigate('MainApp', {
        screen: 'HomeDrawer',
        params: {
          screen: 'ProductDetail',
          params: { productId: data.productId },
        },
      });
    }
  }
};

/**
 * Set up listeners for notification taps (call once on app mount)
 */
export const setupNotificationResponseListener = () => {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    handleNotificationResponse
  );
  return subscription;
};

