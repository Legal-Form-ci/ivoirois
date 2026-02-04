import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import InstallPrompt from "@/components/InstallPrompt";
import FloatingAIChat from "@/components/FloatingAIChat";
import Index from "./pages/Index";
import Feed from "./pages/Feed";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import Friends from "./pages/Friends";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import Settings from "./pages/Settings";
import GroupsPage from "./pages/Groups";
import GroupChat from "./pages/GroupChat";
import Admin from "./pages/Admin";
import Companies from "./pages/Companies";
import CreateCompany from "./pages/CreateCompany";
import CompanyView from "./pages/CompanyView";
import Jobs from "./pages/Jobs";
import CreateJob from "./pages/CreateJob";
import JobView from "./pages/JobView";
import Resume from "./pages/Resume";
import CreateResume from "./pages/CreateResume";
import ResumeView from "./pages/ResumeView";
import CreateGroup from "./pages/CreateGroup";
import Pages from "./pages/Pages";
import CreatePage from "./pages/CreatePage";
import PageView from "./pages/PageView";
import Search from "./pages/Search";
import Reels from "./pages/Reels";
import CreateReel from "./pages/CreateReel";
import Events from "./pages/Events";
import CreateEvent from "./pages/CreateEvent";
import Marketplace from "./pages/Marketplace";
import CreateListing from "./pages/CreateListing";
import NotFound from "./pages/NotFound";
import { IncomingCallHandler } from "./hooks/useIncomingCallDetection";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <InstallPrompt />
      <BrowserRouter>
        <AuthProvider>
          <IncomingCallHandler />
          <FloatingAIChat />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/accueil" element={<Index />} />
            <Route path="/home" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/connexion" element={<Auth />} />
            <Route path="/login" element={<Auth />} />
            
            {/* Feed */}
            <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
            <Route path="/fil" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
            <Route path="/actualites" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
            
            {/* Profile */}
            <Route path="/profile/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/profil/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
            <Route path="/modifier-profil" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
            
            {/* Friends */}
            <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
            <Route path="/amis" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
            
            {/* Notifications */}
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            
            {/* Messages */}
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/messages/:conversationId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/messagerie" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/messagerie/:conversationId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            
            {/* Settings */}
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/parametres" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            
            {/* Groups */}
            <Route path="/groups" element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
            <Route path="/groupes" element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
            <Route path="/groups/create" element={<ProtectedRoute><CreateGroup /></ProtectedRoute>} />
            <Route path="/groupes/creer" element={<ProtectedRoute><CreateGroup /></ProtectedRoute>} />
            <Route path="/groups/:groupId" element={<ProtectedRoute><GroupChat /></ProtectedRoute>} />
            <Route path="/groupes/:groupId" element={<ProtectedRoute><GroupChat /></ProtectedRoute>} />
            
            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/administration" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            
            {/* Companies */}
            <Route path="/companies" element={<ProtectedRoute><Companies /></ProtectedRoute>} />
            <Route path="/entreprises" element={<ProtectedRoute><Companies /></ProtectedRoute>} />
            <Route path="/companies/create" element={<ProtectedRoute><CreateCompany /></ProtectedRoute>} />
            <Route path="/entreprises/creer" element={<ProtectedRoute><CreateCompany /></ProtectedRoute>} />
            <Route path="/companies/:companyId" element={<ProtectedRoute><CompanyView /></ProtectedRoute>} />
            <Route path="/entreprises/:companyId" element={<ProtectedRoute><CompanyView /></ProtectedRoute>} />
            
            {/* Jobs */}
            <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
            <Route path="/emplois" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
            <Route path="/jobs/create" element={<ProtectedRoute><CreateJob /></ProtectedRoute>} />
            <Route path="/emplois/creer" element={<ProtectedRoute><CreateJob /></ProtectedRoute>} />
            <Route path="/jobs/:jobId" element={<ProtectedRoute><JobView /></ProtectedRoute>} />
            <Route path="/emplois/:jobId" element={<ProtectedRoute><JobView /></ProtectedRoute>} />
            
            {/* Resume */}
            <Route path="/resume" element={<ProtectedRoute><Resume /></ProtectedRoute>} />
            <Route path="/cv" element={<ProtectedRoute><Resume /></ProtectedRoute>} />
            <Route path="/resume/create" element={<ProtectedRoute><CreateResume /></ProtectedRoute>} />
            <Route path="/cv/creer" element={<ProtectedRoute><CreateResume /></ProtectedRoute>} />
            <Route path="/resume/:id" element={<ProtectedRoute><ResumeView /></ProtectedRoute>} />
            <Route path="/cv/:id" element={<ProtectedRoute><ResumeView /></ProtectedRoute>} />
            
            {/* Pages */}
            <Route path="/pages" element={<ProtectedRoute><Pages /></ProtectedRoute>} />
            <Route path="/pages/create" element={<ProtectedRoute><CreatePage /></ProtectedRoute>} />
            <Route path="/pages/creer" element={<ProtectedRoute><CreatePage /></ProtectedRoute>} />
            <Route path="/pages/:pageId" element={<ProtectedRoute><PageView /></ProtectedRoute>} />
            
            {/* Reels */}
            <Route path="/reels" element={<ProtectedRoute><Reels /></ProtectedRoute>} />
            <Route path="/shorts" element={<ProtectedRoute><Reels /></ProtectedRoute>} />
            <Route path="/reels/create" element={<ProtectedRoute><CreateReel /></ProtectedRoute>} />
            <Route path="/reels/creer" element={<ProtectedRoute><CreateReel /></ProtectedRoute>} />
            
            {/* Events */}
            <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
            <Route path="/evenements" element={<ProtectedRoute><Events /></ProtectedRoute>} />
            <Route path="/events/create" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
            <Route path="/evenements/creer" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
            
            {/* Marketplace */}
            <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
            <Route path="/marche" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
            <Route path="/marketplace/create" element={<ProtectedRoute><CreateListing /></ProtectedRoute>} />
            <Route path="/marche/creer" element={<ProtectedRoute><CreateListing /></ProtectedRoute>} />
            
            {/* Search */}
            <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
            <Route path="/recherche" element={<ProtectedRoute><Search /></ProtectedRoute>} />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
