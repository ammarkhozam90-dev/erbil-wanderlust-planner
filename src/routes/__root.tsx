import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
// تأكد من استيراد مكون الهيدر الخاص بموقعك إذا كان موجوداً، أو استخدم المكون الأساسي
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "../lib/language";
import { AuthProvider } from "../lib/auth";

// ... (بقية مكونات NotFoundComponent و ErrorComponent كما هي)

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // ... (إعدادات الـ head كما هي)
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          {/* الهيدر الثابت للموقع كاملاً */}
          <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-background border-b flex items-center px-6 shadow-sm">
            <Link to="/" className="font-display text-xl font-bold">ErbilGo</Link>
          </header>

          {/* الحاوية الرئيسية التي تحوي جميع الصفحات */}
          <main className="pt-16 min-h-screen">
            <Outlet />
          </main>
          
          <Toaster />
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
