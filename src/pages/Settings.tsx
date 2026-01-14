import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useTheme } from "@/hooks/useTheme";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import NotificationSettings from "@/components/NotificationSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Lock, Bell, Shield, Eye, EyeOff, User, Palette, Globe, Sun, Moon, Monitor } from "lucide-react";

const LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, language, setLanguage } = useTranslation();
  const { theme, setTheme, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: true,
    messageSound: true,
    showOnlineStatus: true,
    showReadReceipts: true,
  });

  const handleLanguageChange = (newLang: string) => {
    const validLangs = ['fr', 'en', 'ar', 'zh', 'de', 'es'] as const;
    if (validLangs.includes(newLang as any)) {
      setLanguage(newLang as typeof validLangs[number]);
      toast.success(t('settings.languageChanged') || 'Langue changée avec succès');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwords.new !== passwords.confirm) {
      toast.error("Les nouveaux mots de passe ne correspondent pas");
      return;
    }

    if (passwords.new.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new,
      });

      if (error) throw error;

      toast.success("Mot de passe modifié avec succès");
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (error: any) {
      toast.error("Erreur lors de la modification du mot de passe");
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
      <Header />
      <main className="container py-6">
        <div className="max-w-3xl mx-auto">
          <Button
            variant="ghost"
            className="mb-4 gap-2"
            onClick={() => navigate(`/profile/${user?.id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au profil
          </Button>

          <h1 className="text-3xl font-bold mb-6">Paramètres</h1>

          <Tabs defaultValue="security" className="space-y-6">
            <TabsList className="w-full grid grid-cols-5">
              <TabsTrigger value="security" className="gap-2">
                <Lock className="h-4 w-4" />
                <span className="hidden sm:inline">{t('settings.security') || 'Sécurité'}</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">{t('settings.notifications') || 'Notifications'}</span>
              </TabsTrigger>
              <TabsTrigger value="privacy" className="gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">{t('settings.privacy') || 'Confidentialité'}</span>
              </TabsTrigger>
              <TabsTrigger value="language" className="gap-2">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">{t('settings.language') || 'Langue'}</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="gap-2">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">{t('settings.appearance') || 'Apparence'}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Sécurité du compte
                  </CardTitle>
                  <CardDescription>
                    Gérez vos paramètres de sécurité et votre mot de passe
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="current">Mot de passe actuel</Label>
                      <div className="relative">
                        <Input
                          id="current"
                          type={showPasswords.current ? "text" : "password"}
                          value={passwords.current}
                          onChange={(e) =>
                            setPasswords({ ...passwords, current: e.target.value })
                          }
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => togglePasswordVisibility('current')}
                        >
                          {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new">Nouveau mot de passe</Label>
                      <div className="relative">
                        <Input
                          id="new"
                          type={showPasswords.new ? "text" : "password"}
                          value={passwords.new}
                          onChange={(e) =>
                            setPasswords({ ...passwords, new: e.target.value })
                          }
                          required
                          minLength={6}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => togglePasswordVisibility('new')}
                        >
                          {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm">Confirmer le nouveau mot de passe</Label>
                      <div className="relative">
                        <Input
                          id="confirm"
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwords.confirm}
                          onChange={(e) =>
                            setPasswords({ ...passwords, confirm: e.target.value })
                          }
                          required
                          minLength={6}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => togglePasswordVisibility('confirm')}
                        >
                          {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? "Modification..." : "Modifier le mot de passe"}
                    </Button>
                  </form>

                  <div className="mt-8 pt-6 border-t">
                    <h3 className="font-semibold mb-2">Email actuel</h3>
                    <p className="text-muted-foreground">{user?.email}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications">
              <div className="space-y-6">
                <NotificationSettings />
                
                <Card>
                  <CardHeader>
                    <CardTitle>Préférences de notification</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Notifications par email</Label>
                        <p className="text-sm text-muted-foreground">
                          Recevoir des notifications importantes par email
                        </p>
                      </div>
                      <Switch
                        checked={preferences.emailNotifications}
                        onCheckedChange={(checked) => 
                          setPreferences({ ...preferences, emailNotifications: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Sons de message</Label>
                        <p className="text-sm text-muted-foreground">
                          Jouer un son pour les nouveaux messages
                        </p>
                      </div>
                      <Switch
                        checked={preferences.messageSound}
                        onCheckedChange={(checked) => 
                          setPreferences({ ...preferences, messageSound: checked })
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="privacy">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Confidentialité
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Afficher mon statut en ligne</Label>
                      <p className="text-sm text-muted-foreground">
                        Permettre aux autres de voir quand vous êtes en ligne
                      </p>
                    </div>
                    <Switch
                      checked={preferences.showOnlineStatus}
                      onCheckedChange={(checked) => 
                        setPreferences({ ...preferences, showOnlineStatus: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Accusés de lecture</Label>
                      <p className="text-sm text-muted-foreground">
                        Montrer quand vous avez lu les messages
                      </p>
                    </div>
                    <Switch
                      checked={preferences.showReadReceipts}
                      onCheckedChange={(checked) => 
                        setPreferences({ ...preferences, showReadReceipts: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="language">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    {t('settings.language') || 'Langue'}
                  </CardTitle>
                  <CardDescription>
                    {t('settings.languageDescription') || 'Choisissez la langue de l\'interface'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('settings.selectLanguage') || 'Sélectionner une langue'}</Label>
                    <Select value={language} onValueChange={handleLanguageChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choisir une langue" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            <span className="flex items-center gap-2">
                              <span>{lang.flag}</span>
                              <span>{lang.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-4">
                    {LANGUAGES.map((lang) => (
                      <Button
                        key={lang.code}
                        variant={language === lang.code ? "default" : "outline"}
                        className="justify-start gap-2"
                        onClick={() => handleLanguageChange(lang.code)}
                      >
                        <span className="text-lg">{lang.flag}</span>
                        <span>{lang.name}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    {t('settings.appearance') || 'Apparence'}
                  </CardTitle>
                  <CardDescription>
                    {t('settings.appearanceDescription') || 'Personnalisez l\'apparence de l\'application'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-base">{t('settings.theme') || 'Thème'}</Label>
                    <div className="grid grid-cols-3 gap-3">
                      <Button
                        variant={theme === 'light' ? 'default' : 'outline'}
                        className="flex flex-col items-center gap-2 h-auto py-4"
                        onClick={() => setTheme('light')}
                      >
                        <Sun className="h-6 w-6" />
                        <span className="text-sm">{t('settings.light') || 'Clair'}</span>
                      </Button>
                      <Button
                        variant={theme === 'dark' ? 'default' : 'outline'}
                        className="flex flex-col items-center gap-2 h-auto py-4"
                        onClick={() => setTheme('dark')}
                      >
                        <Moon className="h-6 w-6" />
                        <span className="text-sm">{t('settings.dark') || 'Sombre'}</span>
                      </Button>
                      <Button
                        variant={theme === 'system' ? 'default' : 'outline'}
                        className="flex flex-col items-center gap-2 h-auto py-4"
                        onClick={() => setTheme('system')}
                      >
                        <Monitor className="h-6 w-6" />
                        <span className="text-sm">{t('settings.system') || 'Système'}</span>
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.themeDescription') || 'Le mode système utilise automatiquement le thème de votre appareil'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <MobileNav />
    </div>
  );
};

export default Settings;
