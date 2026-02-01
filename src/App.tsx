import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import InstallPrompt from "@/components/InstallPrompt";
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
import Marketplace from "./pages/Marketplace";
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
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
            <Route path="/profile/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
            <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/messages/:conversationId" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/groups" element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
            <Route path="/groups/create" element={<ProtectedRoute><CreateGroup /></ProtectedRoute>} />
            <Route path="/groups/:groupId" element={<ProtectedRoute><GroupChat /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/companies" element={<ProtectedRoute><Companies /></ProtectedRoute>} />
            <Route path="/companies/create" element={<ProtectedRoute><CreateCompany /></ProtectedRoute>} />
            <Route path="/companies/:companyId" element={<ProtectedRoute><CompanyView /></ProtectedRoute>} />
            <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
            <Route path="/jobs/create" element={<ProtectedRoute><CreateJob /></ProtectedRoute>} />
            <Route path="/jobs/:jobId" element={<ProtectedRoute><JobView /></ProtectedRoute>} />
            <Route path="/resume" element={<ProtectedRoute><Resume /></ProtectedRoute>} />
            <Route path="/resume/create" element={<ProtectedRoute><CreateResume /></ProtectedRoute>} />
            <Route path="/resume/:id" element={<ProtectedRoute><ResumeView /></ProtectedRoute>} />
            <Route path="/pages" element={<ProtectedRoute><Pages /></ProtectedRoute>} />
            <Route path="/pages/create" element={<ProtectedRoute><CreatePage /></ProtectedRoute>} />
            <Route path="/pages/:pageId" element={<ProtectedRoute><PageView /></ProtectedRoute>} />
            <Route path="/reels" element={<ProtectedRoute><Reels /></ProtectedRoute>} />
            <Route path="/reels/create" element={<ProtectedRoute><CreateReel /></ProtectedRoute>} />
            <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
            <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
            <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
