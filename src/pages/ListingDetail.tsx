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
import { ArrowLeft, Heart, MapPin, Truck, MessageCircle, Trash2, Pencil, Loader2, ShoppingBag, Eye } from "lucide-react";

const CONDITIONS: Record<string, string> = {
  new: "Neuf", like_new: "Comme neuf", good: "Bon état", fair: "État correct", for_parts: "Pour pièces",
};

const ListingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [contacting, setContacting] = useState(false);

  useEffect(() => { if (id) load(); }, [id, user?.id]);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("marketplace_listings").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      if (!data) { toast.error("Annonce introuvable"); navigate("/marketplace"); return; }
      setListing(data);
      const { data: s } = await supabase.from("profiles").select("id, full_name, avatar_url, username").eq("id", data.seller_id).maybeSingle();
      setSeller(s);
      // increment views (non-blocking)
      supabase.from("marketplace_listings").update({ views_count: (data.views_count || 0) + 1 }).eq("id", data.id).then(() => {});
      if (user) {
        const { data: fav } = await supabase.from("marketplace_favorites").select("id").eq("listing_id", data.id).eq("user_id", user.id).maybeSingle();
        setIsFavorite(!!fav);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Erreur de chargement");
    } finally { setLoading(false); }
  };

  const toggleFavorite = async () => {
    if (!user) { toast.error("Connectez-vous"); return; }
    if (isFavorite) {
      await supabase.from("marketplace_favorites").delete().eq("listing_id", listing.id).eq("user_id", user.id);
      setIsFavorite(false);
    } else {
      await supabase.from("marketplace_favorites").insert({ listing_id: listing.id, user_id: user.id });
      setIsFavorite(true);
    }
  };

  const contactSeller = async () => {
    if (!user || !seller) return;
    if (seller.id === user.id) return;
    setContacting(true);
    try {
      // Find an existing 1-1 conversation between the two users
      const { data: mine } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);
      const myIds = (mine || []).map((m: any) => m.conversation_id);
      let convId: string | null = null;
      if (myIds.length) {
        const { data: shared } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", seller.id)
          .in("conversation_id", myIds);
        if (shared && shared.length) convId = shared[0].conversation_id as string;
      }
      if (!convId) {
        const { data: conv, error: cErr } = await supabase.from("conversations").insert({}).select().single();
        if (cErr) throw cErr;
        await supabase.from("conversation_participants").insert({ conversation_id: conv.id, user_id: user.id });
        await supabase.from("conversation_participants").insert({ conversation_id: conv.id, user_id: seller.id });
        convId = conv.id;
      }
      navigate(`/messages/${convId}`);
    } catch (e: any) {
      console.error(e);
      toast.error("Impossible d'ouvrir la conversation");
    } finally { setContacting(false); }
  };

  const deleteListing = async () => {
    const { error } = await supabase.from("marketplace_listings").delete().eq("id", listing.id);
    if (error) { toast.error("Suppression échouée"); return; }
    toast.success("Annonce supprimée");
    navigate("/marketplace");
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  );
  if (!listing) return null;

  const isOwner = user?.id === listing.seller_id;
  const images: string[] = listing.images || [];
  const price = new Intl.NumberFormat("fr-FR", { style: "currency", currency: listing.currency || "XOF", minimumFractionDigits: 0 }).format(listing.price);

  return (
    <div className="min-h-screen bg-muted/30 pb-20 md:pb-0">
      <Header />
      <main className="container py-6">
        <div className="max-w-5xl mx-auto space-y-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />Retour
          </Button>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="overflow-hidden">
              <div className="aspect-square bg-muted">
                {images[imgIdx] ? (
                  <img src={images[imgIdx]} alt={listing.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="h-16 w-16 text-muted-foreground" /></div>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {images.map((src, i) => (
                    <button key={i} onClick={() => setImgIdx(i)} className={`shrink-0 w-16 h-16 rounded overflow-hidden border-2 ${i === imgIdx ? "border-primary" : "border-transparent"}`}>
                      <img src={src} className="w-full h-full object-cover" alt="" />
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <div className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h1 className="text-2xl font-bold">{listing.title}</h1>
                  <p className="text-3xl font-bold text-primary">{price}</p>
                  <div className="flex flex-wrap gap-2">
                    {listing.condition && <Badge variant="secondary">{CONDITIONS[listing.condition] || listing.condition}</Badge>}
                    {listing.is_negotiable && <Badge>Négociable</Badge>}
                    {listing.delivery_available && <Badge variant="outline" className="gap-1"><Truck className="h-3 w-3" />Livraison</Badge>}
                    {listing.category && <Badge variant="outline">{listing.category}</Badge>}
                  </div>
                  {(listing.location || listing.region) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{[listing.location, listing.region].filter(Boolean).join(" · ")}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />{listing.views_count || 0} vues
                  </div>
                </CardContent>
              </Card>

              {seller && (
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Avatar className="h-12 w-12 cursor-pointer" onClick={() => navigate(`/profile/${seller.id}`)}>
                      <AvatarImage src={seller.avatar_url} />
                      <AvatarFallback>{seller.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{seller.full_name}</p>
                      {seller.username && <p className="text-sm text-muted-foreground">@{seller.username}</p>}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-wrap gap-2">
                {!isOwner && (
                  <Button className="flex-1 gap-2" onClick={contactSeller} disabled={contacting}>
                    {contacting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                    Contacter le vendeur
                  </Button>
                )}
                <Button variant="outline" onClick={toggleFavorite} className="gap-2">
                  <Heart className={`h-4 w-4 ${isFavorite ? "fill-destructive text-destructive" : ""}`} />
                  {isFavorite ? "Sauvegardé" : "Sauvegarder"}
                </Button>
                {isOwner && (
                  <>
                    <Button variant="outline" onClick={() => navigate(`/marketplace/${listing.id}/edit`)} className="gap-2">
                      <Pencil className="h-4 w-4" />Modifier
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="gap-2"><Trash2 className="h-4 w-4" />Supprimer</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer cette annonce ?</AlertDialogTitle>
                          <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={deleteListing}>Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>

              {listing.description && (
                <Card>
                  <CardContent className="p-4">
                    <h2 className="font-semibold mb-2">Description</h2>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">{listing.description}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  );
};

export default ListingDetail;