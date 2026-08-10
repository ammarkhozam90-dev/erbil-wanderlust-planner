import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { MerchantSidebar } from '@/components/merchant/MerchantSidebar';
import { Header } from '@/components/Header';
import { MerchantProvider } from '@/components/merchant/merchant-context';
import { useAuth } from '@/hooks/use-auth';

export const Route = createFileRoute('/merchant/_authenticated')({
  ssr: false,
  component: MerchantLayout,
});

function MerchantLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: '/merchant/auth' });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* الهيدر الرئيسي للموقع — فوق كل شي بعرض الصفحة الكامل */}
      <Header />

      <MerchantProvider userId={user.id} email={user.email}>
        {/* هاد الغلاف (بفضل transform) بيصير هو "المرجع" لموضعة القائمة
            الجانبية الثابتة (fixed) بدل الشاشة كلها — هيك القائمة بتبلش
            تحت الهيدر مباشرة، مش من أعلى الشاشة، وما في أي تراكب. */}
        <div className="relative" style={{ transform: 'translateZ(0)' }}>
          <SidebarProvider>
            <div className="flex w-full">
              <MerchantSidebar />
              <div className="flex flex-1 flex-col">
                {/* هيدر ثانوي صغير خاص بلوحة التاجر (زر فتح/طي القائمة) */}
                <header className="flex h-14 items-center gap-3 border-b px-4">
                  <SidebarTrigger />
                  <h1 className="font-display text-lg font-semibold">
                    <span className="text-primary">Erbil</span>
                    <span className="text-gold">Go</span> Merchant
                  </h1>
                </header>
                <main className="flex-1 p-6">
                  <Outlet />
                </main>
              </div>
            </div>
          </SidebarProvider>
        </div>
      </MerchantProvider>
    </div>
  );
}
