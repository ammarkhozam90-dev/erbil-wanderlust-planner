function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          {/* هذا الهيدر سيظهر الآن في كل صفحات الموقع */}
          <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-background border-b flex items-center px-6">
            <Link to="/" className="font-display text-xl font-bold">ErbilGo</Link>
            {/* أضف هنا باقي عناصر الهيدر الأصلية الخاصة بك مثل اللغة والمستخدم */}
          </header>

          {/* إضافة Padding-top للمحتوى حتى لا يختفي تحت الهيدر الثابت */}
          <div className="pt-16">
            <Outlet />
          </div>
          
          <Toaster />
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
