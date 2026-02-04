import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Calendar as CalendarIcon, Clock, MapPin, Globe, Users, Loader2, ArrowLeft, Image } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const CATEGORIES = [
  "Conférence", "Workshop", "Networking", "Formation", 
  "Salon", "Concert", "Fête", "Sport", "Culture", "Autre"
];

const CreateEvent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [locationType, setLocationType] = useState<"physical" | "online">("physical");
  const [location, setLocation] = useState("");
  const [eventUrl, setEventUrl] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [startTime, setStartTime] = useState("10:00");
  const [endDate, setEndDate] = useState<Date>();
  const [endTime, setEndTime] = useState("18:00");
  const [maxAttendees, setMaxAttendees] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    if (!title || !startDate) {
      toast.error("Titre et date de début requis");
      return;
    }

    setLoading(true);

    try {
      let coverUrl = null;

      // Upload cover image if provided
      if (coverImage) {
        const fileExt = coverImage.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, coverImage);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('posts')
            .getPublicUrl(fileName);
          coverUrl = publicUrl;
        }
      }

      // Combine date and time
      const [startHours, startMinutes] = startTime.split(':');
      const startDateTime = new Date(startDate);
      startDateTime.setHours(parseInt(startHours), parseInt(startMinutes));

      let endDateTime = null;
      if (endDate) {
        const [endHours, endMinutes] = endTime.split(':');
        endDateTime = new Date(endDate);
        endDateTime.setHours(parseInt(endHours), parseInt(endMinutes));
      }

      const { error } = await supabase.from("events").insert({
        created_by: user.id,
        title,
        description,
        category,
        location_type: locationType,
        location: locationType === "physical" ? location : null,
        event_url: locationType === "online" ? eventUrl : null,
        start_date: startDateTime.toISOString(),
        end_date: endDateTime?.toISOString() || null,
        max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
        privacy: isPrivate ? "private" : "public",
        cover_image: coverUrl,
      });

      if (error) throw error;

      toast.success("Événement créé avec succès!");
      navigate("/events");
    } catch (error: any) {
      console.error("Error creating event:", error);
      toast.error("Erreur lors de la création de l'événement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
      <Header />
      <main className="container py-6">
        <div className="max-w-2xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-6 w-6 text-primary" />
                Créer un événement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Cover Image */}
                <div className="space-y-2">
                  <Label>Image de couverture</Label>
                  <div className="relative">
                    {coverPreview ? (
                      <div className="relative aspect-video rounded-lg overflow-hidden">
                        <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="absolute bottom-2 right-2"
                          onClick={() => { setCoverImage(null); setCoverPreview(""); }}
                        >
                          Changer
                        </Button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                        <Image className="h-12 w-12 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Ajouter une image</span>
                        <input type="file" accept="image/*" onChange={handleCoverChange} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Titre de l'événement *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Conférence Tech Innovation 2025"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Décrivez votre événement..."
                    rows={4}
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date de début *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, 'PPP', { locale: fr }) : 'Choisir une date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Heure de début</Label>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date de fin</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, 'PPP', { locale: fr }) : 'Choisir une date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          disabled={(date) => date < (startDate || new Date())}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Heure de fin</Label>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Location Type */}
                <div className="space-y-2">
                  <Label>Type de lieu</Label>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant={locationType === "physical" ? "default" : "outline"}
                      onClick={() => setLocationType("physical")}
                      className="flex-1"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      Présentiel
                    </Button>
                    <Button
                      type="button"
                      variant={locationType === "online" ? "default" : "outline"}
                      onClick={() => setLocationType("online")}
                      className="flex-1"
                    >
                      <Globe className="mr-2 h-4 w-4" />
                      En ligne
                    </Button>
                  </div>
                </div>

                {/* Location or URL */}
                {locationType === "physical" ? (
                  <div className="space-y-2">
                    <Label>Adresse</Label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Ex: Centre de conférences, Abidjan"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Lien de l'événement</Label>
                    <Input
                      value={eventUrl}
                      onChange={(e) => setEventUrl(e.target.value)}
                      placeholder="https://meet.google.com/..."
                    />
                  </div>
                )}

                {/* Max Attendees */}
                <div className="space-y-2">
                  <Label>Nombre maximum de participants</Label>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={maxAttendees}
                      onChange={(e) => setMaxAttendees(e.target.value)}
                      placeholder="Illimité"
                    />
                  </div>
                </div>

                {/* Privacy */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Événement privé</p>
                    <p className="text-sm text-muted-foreground">Seuls les invités peuvent voir l'événement</p>
                  </div>
                  <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      Créer l'événement
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <MobileNav />
    </div>
  );
};

export default CreateEvent;
