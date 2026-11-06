import React, { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { LoadingState } from "./components/ui/States";
import { isSupabaseConfigured } from "./lib/supabase";
import "./style.css";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const StudentSurveyPage = lazy(() => import("./pages/StudentSurveyPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const SurveyEditorPage = lazy(() => import("./pages/SurveyEditorPage"));
const PresentSurveyPage = lazy(() => import("./pages/PresentSurveyPage"));
const ResultsPage = lazy(() => import("./pages/ResultsPage"));
const InstructorLayout = lazy(() =>
  import("./components/ui/InstructorLayout").then(({ InstructorLayout }) => ({
    default: InstructorLayout,
  })),
);

function App() {
  if (!isSupabaseConfigured)
    return (
      <main className="center-page">
        <div>
          <h1>App not configured</h1>
          <p>
            Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to use Classroom
            Survey.
          </p>
        </div>
      </main>
    );
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<LoadingState />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/s/:slug" element={<StudentSurveyPage />} />
            <Route element={<ProtectedRoute />}>
              <Route
                path="/dashboard"
                element={
                  <InstructorLayout>
                    <DashboardPage />
                  </InstructorLayout>
                }
              />
              <Route
                path="/surveys/new"
                element={
                  <InstructorLayout>
                    <SurveyEditorPage />
                  </InstructorLayout>
                }
              />
              <Route
                path="/surveys/:id/edit"
                element={
                  <InstructorLayout>
                    <SurveyEditorPage />
                  </InstructorLayout>
                }
              />
              <Route
                path="/surveys/:id/present"
                element={<PresentSurveyPage />}
              />
              <Route
                path="/surveys/:id/results"
                element={
                  <InstructorLayout>
                    <ResultsPage />
                  </InstructorLayout>
                }
              />
            </Route>
            <Route
              path="*"
              element={
                <main className="container">
                  <h1>Page not found</h1>
                  <Link to="/">Go home</Link>
                </main>
              }
            />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
