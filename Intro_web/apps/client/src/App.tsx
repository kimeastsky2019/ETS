import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import {
  BusinessPage,
  CompanyPage,
  ContactPage,
  HomePage,
  PerformancePage,
  SolarStorePage,
} from "./pages/site/Pages";
import MediaPage from "./pages/media/MediaPage";
import PostDetailPage from "./pages/media/PostDetailPage";
import AuthPage from "./pages/account/AuthPage";
import MyPage from "./pages/account/MyPage";
import SolarApplyPage from "./pages/solar/ApplyPage";
import StaffLoginPage from "./pages/work/StaffLoginPage";
import WorkHubPage from "./pages/work/WorkHubPage";
import WikiListPage from "./pages/work/WikiListPage";
import WikiDetailPage from "./pages/work/WikiDetailPage";
import WikiEditorPage from "./pages/work/WikiEditorPage";
import DiagnosisListPage from "./pages/work/DiagnosisListPage";
import DiagnosisDetailPage from "./pages/work/DiagnosisDetailPage";
import BenchmarkPage from "./pages/work/BenchmarkPage";
import RequestsPage from "./pages/work/RequestsPage";
import AdminPage from "./pages/admin/AdminPage";
import { RequireAdminMember, RequireCustomer, RequireStaff } from "./components/auth/StaffGuard";
import NotFound from "./pages/not-found/Index";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* 고객 영역 (공개) */}
          <Route path="/" element={<HomePage />} />
          <Route path="/company" element={<CompanyPage />} />
          <Route path="/business" element={<BusinessPage />} />
          <Route path="/performance" element={<PerformancePage />} />
          <Route path="/solar-store" element={<SolarStorePage />} />
          <Route path="/media" element={<MediaPage />} />
          <Route path="/media/:slug" element={<PostDetailPage />} />
          <Route path="/contact" element={<ContactPage />} />

          {/* 고객 계정 */}
          <Route path="/login" element={<AuthPage />} />
          <Route path="/auth" element={<Navigate to="/login" replace />} />
          <Route path="/my" element={<RequireCustomer><MyPage /></RequireCustomer>} />
          <Route path="/solar-apply" element={<RequireCustomer><SolarApplyPage /></RequireCustomer>} />

          {/* 임직원 영역 */}
          <Route path="/work/login" element={<StaffLoginPage />} />
          <Route path="/staff" element={<Navigate to="/work" replace />} />
          <Route path="/work" element={<RequireStaff><WorkHubPage /></RequireStaff>} />
          <Route path="/work/diagnosis" element={<RequireStaff><DiagnosisListPage /></RequireStaff>} />
          <Route path="/work/diagnosis/:code" element={<RequireStaff><DiagnosisDetailPage /></RequireStaff>} />
          <Route path="/work/benchmark" element={<RequireStaff><BenchmarkPage /></RequireStaff>} />
          <Route path="/work/wiki" element={<RequireStaff><WikiListPage /></RequireStaff>} />
          <Route path="/work/wiki/new" element={<RequireStaff><WikiEditorPage /></RequireStaff>} />
          <Route path="/work/wiki/:slug" element={<RequireStaff><WikiDetailPage /></RequireStaff>} />
          <Route path="/work/wiki/:slug/edit" element={<RequireStaff><WikiEditorPage /></RequireStaff>} />
          <Route path="/work/requests" element={<RequireStaff><RequestsPage /></RequireStaff>} />

          {/* 관리자 */}
          <Route path="/admin" element={<RequireAdminMember><AdminPage /></RequireAdminMember>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
