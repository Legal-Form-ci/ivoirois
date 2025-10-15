import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users, Shield, MapPin, TrendingUp } from "lucide-react";
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
          <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto drop-shadow-md">
            Ici, on cause royalement ! 👑
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="lg" asChild>
              <Link to="/auth">Commencer maintenant</Link>
            </Button>
            <Button variant="outline" size="lg" className="bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20" asChild>
              <Link to="/feed">Découvrir</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
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
            <FeatureCard 
              icon={<MapPin className="h-12 w-12" />}
              title="100% Ivoirien"
              description="Une plateforme conçue pour et par les Ivoiriens"
            />
            <FeatureCard 
              icon={<Shield className="h-12 w-12" />}
              title="Sécurisé"
              description="Vos données restent en Côte d'Ivoire"
            />
            <FeatureCard 
              icon={<Users className="h-12 w-12" />}
              title="Communauté"
              description="Connectez-vous avec des millions d'Ivoiriens"
            />
            <FeatureCard 
              icon={<TrendingUp className="h-12 w-12" />}
              title="Local First"
              description="Contenu et actualités locales en priorité"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10">
        <div className="container text-center px-4">
          <h2 className="text-4xl font-bold mb-6">
            Rejoignez la communauté ivoirienne
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Partagez vos moments, découvrez l'actualité locale et restez connecté avec vos proches
          </p>
          <Button variant="hero" size="lg" asChild>
            <Link to="/auth">Créer mon compte</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t bg-card">
        <div className="container text-center text-muted-foreground">
          <p>© 2025 Ivoi'Rois - Ici, on cause royalement ! 👑</p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => {
  return (
    <div className="p-6 rounded-xl bg-card shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-all duration-300 border border-border/50">
      <div className="mb-4 text-primary">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};

export default Index;
