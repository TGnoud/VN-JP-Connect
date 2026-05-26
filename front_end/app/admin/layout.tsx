import AdminSidebar from "@/components/layout/AdminSidebar";
import AdminAuthGate from "@/components/layout/AdminAuthGate";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGate>
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 overflow-auto bg-slate-50">{children}</main>
      </div>
    </AdminAuthGate>
  );
}
