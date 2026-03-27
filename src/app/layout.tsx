import { Suspense } from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Suspense fallback={
          <div style={{
            minHeight: "100vh",
            background: "#0f0f0f",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#444",
            fontFamily: "sans-serif",
            fontSize: 14,
          }}>
            Loading...
          </div>
        }>
          {children}
        </Suspense>
      </body>
    </html>
  );
}