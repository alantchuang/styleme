import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import UserBootstrap from "@/components/UserBootstrap";
import ToastProvider from "@/components/ToastProvider";
import OfflineBanner from "@/components/OfflineBanner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return (
    <ToastProvider>
      <div className="flex flex-col min-h-screen">
        <UserBootstrap />
        <AppHeader />
        <OfflineBanner />
        <main className="flex-1 pt-[72px] pb-28">{children}</main>
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
