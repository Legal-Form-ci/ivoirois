import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, BellOff, Smartphone, Calendar, MessageSquare, Heart, UserPlus, Video } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";

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
    try {
      if (isSubscribed) {
        await unsubscribe();
        toast.success("Notifications désactivées");
      } else {
        await subscribe();
        toast.success("Notifications activées");
      }
    } catch (error) {
      toast.error("Erreur lors de la configuration des notifications");
    }
  };

  const testNotification = () => {
    showNotification("Test Ivoi'Rois 👑", {
      body: "Vos notifications fonctionnent correctement !",
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
          <div className="space-y-3">
            <p className="text-sm font-medium">Types de notifications:</p>
            <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span>Nouveaux messages</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Messages et publications programmés</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" />
                <span>Commentaires et réactions</span>
              </div>
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                <span>Demandes d'amis</span>
              </div>
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                <span>Appels entrants</span>
              </div>
            </div>
          </div>
        )}

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
