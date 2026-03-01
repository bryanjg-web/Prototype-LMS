import { useApp } from "./context/AppContext";
import { useAuth } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import AppLayout from "./components/layout/AppLayout";
import JourneyMode from "./components/JourneyMode";
import InteractiveShell from "./components/interactive/InteractiveShell";
import LoginScreen from "./components/LoginScreen";
import LoadingScreen from "./components/LoadingScreen";

function AppContent() {
  const { mode, role } = useApp();

  if (mode === "journey") {
    return <JourneyMode />;
  }

  return <InteractiveShell />;
}

function AppRoot() {
  const { loading } = useAuth();
  const { role } = useApp();

  if (loading) return <LoadingScreen />;
  if (!role) return <LoginScreen />;
  return (
    <AppLayout>
      <AppContent />
    </AppLayout>
  );
}

export default function App() {
  return (
    <DataProvider>
      <AppRoot />
    </DataProvider>
  );
}
