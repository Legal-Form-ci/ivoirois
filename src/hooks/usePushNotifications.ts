import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const VAPID_PUBLIC_KEY = ""; // You'll need to generate this

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    // Check if push notifications are supported
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, [user]);

  const checkSubscription = async () => {
    if (!user?.id) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

  const requestPermission = async () => {
    if (!isSupported) {
      toast.error("Les notifications push ne sont pas supportées sur ce navigateur");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch (error) {
      console.error("Error requesting permission:", error);
      return false;
    }
  };

  const subscribe = async () => {
    if (!user?.id || !isSupported) return false;

    try {
      // Request permission first
      const granted = await requestPermission();
      if (!granted) {
        toast.error("Permission refusée pour les notifications");
        return false;
      }

      // Register service worker if not already registered
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Check if VAPID key is configured
      if (!VAPID_PUBLIC_KEY) {
        // Use local notifications instead
        toast.success("Notifications locales activées");
        setIsSubscribed(true);
        return true;
      }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_PUBLIC_KEY,
      });

      // Save subscription to database
      const subscriptionJson = subscription.toJSON();
      await supabase.from("push_subscriptions" as any).upsert({
        user_id: user.id,
        endpoint: subscriptionJson.endpoint,
        p256dh: subscriptionJson.keys?.p256dh || "",
        auth: subscriptionJson.keys?.auth || "",
      });

      setIsSubscribed(true);
      toast.success("Notifications push activées");
      return true;
    } catch (error: any) {
      console.error("Error subscribing to push:", error);
      toast.error("Erreur lors de l'activation des notifications");
      return false;
    }
  };

  const unsubscribe = async () => {
    if (!user?.id) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database
        await supabase
          .from("push_subscriptions" as any)
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", subscription.endpoint);
      }

      setIsSubscribed(false);
      toast.success("Notifications push désactivées");
      return true;
    } catch (error: any) {
      console.error("Error unsubscribing:", error);
      return false;
    }
  };

  // Show local notification
  const showNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (permission !== "granted") return;

      // Use service worker notification if available
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          icon: "/logo.png",
          badge: "/logo.png",
          ...options,
        });
      });
    },
    [permission]
  );

  return {
    isSupported,
    isSubscribed,
    permission,
    requestPermission,
    subscribe,
    unsubscribe,
    showNotification,
  };
};
