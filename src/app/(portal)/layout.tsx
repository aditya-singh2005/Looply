import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/lib/context/AuthContext";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
