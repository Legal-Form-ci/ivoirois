import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Calendar, Clock, Users, Globe, Lock, Video, Trash2, Pencil, Loader2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AdaptiveImage } from "@/components/ui/adaptive-media";

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [creator, setCreator] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (id) load(); }, [id, user?.id]);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("events").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      if (!data) { toast.error("Événement introuvable"); navigate("/events"); return; }
      setEvent(data);
      const { data: c } = await supabase.from("profiles").select("id, full_name, avatar_url, username").eq("id", data.created_by).maybeSingle();
      setCreator(c);
      const { data: atts } = await supabase.from("event_attendees").select("user_id, status").eq("event_id", data.id).eq("status", "going").limit(50);
      if (atts && atts.length) {
        const ids = atts.map((a: any) => a.user_id);
        const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
        setAttendees(profs || []);
      } else setAttendees([]);
      if (user) {
        const { data: me } = await supabase.from("event_attendees").select("status").eq("event_id", data.id).eq("user_id", user.id).maybeSingle();
        setUserStatus(me?.status || null);
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur de chargement");
    } finally { setLoading(false); }
  };

  const rsvp = async (status: "going" | "interested") => {
    if (!user) { toast.error("Connectez-vous"); return; }
    const { error } = await supabase.from("event_attendees").upsert({ event_id: event.id, user_id: user.id, status });
    if (error) { toast.error("Erreur"); return; }
    toast.success(status === "going" ? "Vous participez !" : "Intéressé enregistré");
    setUserStatus(status);
    load();
  };

  const cancelRsvp = async () => {
    if (!user) return;
    await supabase.from("event_attendees").delete().eq("event_id", event.id).eq("user_id", user.id);
    setUserStatus(null);
    load();
  };

  const deleteEvent = async () => {
    const { error } = await supabase.from("events").delete().eq("id", event.id);
    if (error) { toast.error("Suppression échouée"); return; }
    toast.success("Événement supprimé");
    navigate("/events");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!event) return null;

  const isOwner = user?.id === event.created_by;

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
      <Header />
      <main className="container py-6">
        <div className="max-w-screen-xl mx-auto space-y-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />Retour
          </Button>

          <Card className="overflow-hidden">
            {event.cover_image && (
              <div className="aspect-[16/6] min-h-40 bg-muted">
                <AdaptiveImage src={event.cover_image} alt={event.title} className="h-full rounded-none" rounded="none" />
              </div>
            )}
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <h1 className="text-2xl md:text-3xl font-bold">{event.title}</h1>
                  <p className="text-primary font-medium mt-1">
                    {format(new Date(event.start_date), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
                  </p>
                </div>
                <div className="flex gap-2">
                  {event.privacy === "private" ? <Badge variant="outline" className="gap-1"><Lock className="h-3 w-3" />Privé</Badge> : <Badge variant="outline" className="gap-1"><Globe className="h-3 w-3" />Public</Badge>}
                  {event.category && <Badge variant="secondary">{event.category}</Badge>}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {event.end_date && (
                  <div className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" />Fin : {format(new Date(event.end_date), "PPp", { locale: fr })}</div>
                )}
                {event.location_type === "online" ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Video className="h-4 w-4" />
                    {event.event_url ? (
                      <a href={event.event_url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">Lien <ExternalLink className="h-3 w-3" /></a>
                    ) : <span>Événement en ligne</span>}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" />{event.location || "Lieu à confirmer"}</div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground"><Users className="h-4 w-4" />{attendees.length} participant{attendees.length > 1 ? "s" : ""}{event.max_attendees ? ` / ${event.max_attendees}` : ""}</div>
              </div>

              {creator && (
                <div className="flex items-center gap-3 pt-2 border-t">
                  <Avatar className="h-10 w-10 cursor-pointer" onClick={() => navigate(`/profile/${creator.id}`)}>
                    <AvatarImage src={creator.avatar_url} />
                    <AvatarFallback>{creator.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs text-muted-foreground">Organisé par</p>
                    <p className="font-semibold">{creator.full_name}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                {!isOwner && (
                  userStatus === "going" ? (
                    <Button variant="outline" onClick={cancelRsvp}>Annuler ma participation</Button>
                  ) : userStatus === "interested" ? (
                    <>
                      <Button onClick={() => rsvp("going")}>Confirmer ma participation</Button>
                      <Button variant="outline" onClick={cancelRsvp}>Retirer</Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={() => rsvp("going")}>Participer</Button>
                      <Button variant="outline" onClick={() => rsvp("interested")}>Intéressé</Button>
                    </>
                  )
                )}
                {isOwner && (
                  <>
                    <Button variant="outline" onClick={() => navigate(`/events/${event.id}/edit`)} className="gap-2"><Pencil className="h-4 w-4" />Modifier</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="gap-2"><Trash2 className="h-4 w-4" />Supprimer</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer cet événement ?</AlertDialogTitle>
                          <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={deleteEvent}>Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {event.description && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-2">À propos</h2>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{event.description}</p>
              </CardContent>
            </Card>
          )}

          {attendees.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4" />Participants</h2>
                <div className="flex flex-wrap gap-3">
                  {attendees.map((a) => (
                    <button key={a.id} onClick={() => navigate(`/profile/${a.id}`)} className="flex flex-col items-center gap-1 w-20">
                      <Avatar className="h-12 w-12"><AvatarImage src={a.avatar_url} /><AvatarFallback>{a.full_name?.charAt(0)}</AvatarFallback></Avatar>
                      <span className="text-xs truncate w-full text-center">{a.full_name}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <MobileNav />
    </div>
  );
};

export default EventDetail;