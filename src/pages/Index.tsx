import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users, Shield, MapPin, TrendingUp, MessageCircle, Briefcase, Film, Radio, ShoppingBag, Sparkles, Globe, Heart } from "lucide-react";
import heroImage from "@/assets/hero-abidjan.jpg";
import appLogo from "@/assets/app-logo.png";

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        className="relative h-screen flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(255, 140, 0, 0.9), rgba(0, 165, 80, 0.85)), url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="container relative z-10 text-center text-white px-4">
          <div className="flex justify-center mb-6">
            <img src={appLogo} alt="Ivoi'Rois" className="h-24 w-24 rounded-2xl shadow-2xl" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 drop-shadow-lg">
            Ivoi'Rois
          </h1>
          <p className="text-xl md:text-2xl mb-4 max-w-2xl mx-auto drop-shadow-md">
            Ici, on cause royalement ! 👑
          </p>
          <p className="text-lg mb-8 max-w-xl mx-auto text-white/80">
            Le réseau social & professionnel 100% ivoirien. Connectez-vous, partagez, évoluez.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="lg" asChild>
              <Link to="/auth">Se connecter</Link>
            </Button>
            <Button variant="outline" size="lg" className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20" asChild>
              <Link to="/auth?mode=signup">Créer mon compte</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-background">
        <div className="container px-4">
          <h2 className="text-4xl font-bold text-center mb-8">
            C'est quoi <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Ivoi'Rois</span> ?
          </h2>
          <p className="text-lg text-center max-w-4xl mx-auto mb-16 text-muted-foreground">
            Ivoi'Rois est la première plateforme de connexion 100 % ivoirienne, qui réunit chat et réseau social dans un même espace convivial. Ici, chaque utilisateur est roi — libre de s'exprimer, de partager et de briller à l'ivoirienne.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard icon={<MapPin className="h-12 w-12" />} title="100% Ivoirien" description="Conçue pour et par les Ivoiriens, adaptée à nos réalités" />
            <FeatureCard icon={<Shield className="h-12 w-12" />} title="Sécurisé" description="Vos données sont protégées et restent privées" />
            <FeatureCard icon={<Users className="h-12 w-12" />} title="Communauté" description="Connectez-vous avec des millions d'Ivoiriens" />
            <FeatureCard icon={<TrendingUp className="h-12 w-12" />} title="Local First" description="Contenu et actualités locales en priorité" />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="container px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Tout ce dont vous avez besoin</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Une plateforme complète qui combine le meilleur des réseaux sociaux et professionnels.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <MiniFeature icon={<MessageCircle />} title="Messagerie instantanée" desc="Chat en temps réel, appels audio & vidéo" />
            <MiniFeature icon={<Film />} title="Reels & Stories" desc="Vidéos courtes et stories éphémères 24h" />
            <MiniFeature icon={<Radio />} title="Live streaming" desc="Diffusez en direct et interagissez" />
            <MiniFeature icon={<Briefcase />} title="Emplois & CV" desc="Trouvez un emploi et partagez votre CV" />
            <MiniFeature icon={<ShoppingBag />} title="Marketplace" desc="Achetez et vendez dans votre région" />
            <MiniFeature icon={<Sparkles />} title="IA intégrée" desc="Rédaction assistée, images IA et suggestions" />
            <MiniFeature icon={<Globe />} title="Pages & Groupes" desc="Créez des communautés et pages pros" />
            <MiniFeature icon={<Heart />} title="Réactions & Partages" desc="Réagissez et partagez sur WhatsApp, Facebook..." />
            <MiniFeature icon={<Users />} title="Réseau professionnel" desc="Connectez-vous avec des professionnels ivoiriens" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10">
        <div className="container text-center px-4">
          <h2 className="text-3xl font-bold mb-8">Rejoignez des milliers d'utilisateurs</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <StatItem value="100K+" label="Utilisateurs" />
            <StatItem value="50K+" label="Publications" />
            <StatItem value="1K+" label="Entreprises" />
            <StatItem value="500+" label="Offres d'emploi" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-background">
        <div className="container text-center px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Prêt à rejoindre la communauté ?</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Créez votre compte gratuitement et commencez à connecter, partager et évoluer avec la communauté Ivoi'Rois.
          </p>
          <Button variant="hero" size="lg" asChild>
            <Link to="/auth?mode=signup">Créer mon compte gratuitement</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t bg-card">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={appLogo} alt="Ivoi'Rois" className="h-8 w-8 rounded-lg" />
              <span className="font-bold text-lg">Ivoi'Rois</span>
            </div>
            <p className="text-muted-foreground text-sm">© 2026 Ivoi'Rois - Ici, on cause royalement ! 👑</p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <Link to="/auth" className="hover:text-foreground">Connexion</Link>
              <Link to="/auth?mode=signup" className="hover:text-foreground">Inscription</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="p-6 rounded-xl bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-all duration-300 border border-border/50">
    <div className="mb-4 text-primary">{icon}</div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground">{description}</p>
  </div>
);

const MiniFeature = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <div className="flex items-start gap-4 p-4 rounded-lg bg-card border border-border/50 hover:border-primary/30 transition-colors">
    <div className="text-primary shrink-0 mt-0.5">{icon}</div>
    <div>
      <h4 className="font-semibold text-sm">{title}</h4>
      <p className="text-xs text-muted-foreground mt-1">{desc}</p>
    </div>
  </div>
);

const StatItem = ({ value, label }: { value: string; label: string }) => (
  <div className="p-4">
    <p className="text-4xl font-bold text-primary">{value}</p>
    <p className="text-muted-foreground">{label}</p>
  </div>
);

export default Index;
