import Sidebar from "@/components/layout/Sidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-auto bg-slate-50">{children}</main>
    </div>
  );
}
