import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import "./responsive.css";
import AuthGuard from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "SEICE Manager | Gestão de TI",
  description: "Plataforma de gestão de patrimônio e suporte de tecnologia do Colégio SEICE.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <Suspense
          fallback={
            <main className="min-h-screen bg-gray-100 p-8 dark:bg-[#252525]">
              <p className="text-gray-600 dark:text-gray-300">
                Carregando SEICE Manager...
              </p>
            </main>
          }
        >
          <AuthGuard>{children}</AuthGuard>
        </Suspense>
      </body>
    </html>
  );
}
