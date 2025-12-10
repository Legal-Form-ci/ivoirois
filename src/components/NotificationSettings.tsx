import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, BellOff, Smartphone } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const NotificationSettings = () => {
  const {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
    showNotification,
  } = usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const testNotification = () => {
    showNotification("Test de notification", {
      body: "Les notifications fonctionnent correctement ! 🎉",
      tag: "test-notification",
    });
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Notifications Push
          </CardTitle>
          <CardDescription>
            Les notifications push ne sont pas supportées sur ce navigateur.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications Push
        </CardTitle>
        <CardDescription>
          Recevez des notifications même lorsque l'application est fermée
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-notifications">Activer les notifications</Label>
            <p className="text-sm text-muted-foreground">
              {permission === "denied"
                ? "Les notifications sont bloquées dans votre navigateur"
                : isSubscribed
                ? "Vous recevrez des notifications"
                : "Activez pour recevoir des alertes"}
            </p>
          </div>
          <Switch
            id="push-notifications"
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={permission === "denied"}
          />
        </div>

        {isSubscribed && (
          <Button variant="outline" onClick={testNotification} className="w-full">
            <Smartphone className="h-4 w-4 mr-2" />
            Tester les notifications
          </Button>
        )}

        {permission === "denied" && (
          <div className="p-3 bg-destructive/10 rounded-lg">
            <p className="text-sm text-destructive">
              Les notifications sont bloquées. Veuillez les autoriser dans les
              paramètres de votre navigateur.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
