import { Suspense } from "react";
import { ListenerSocketProvider } from "@/context/ListenerSocketContext";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning className="font-sans antialiased">
        <Suspense
          fallback={
            <div
              style={{
                minHeight: "100vh",
                background: "#0f0f0f",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#444",
                fontFamily: "sans-serif",
                fontSize: 14,
              }}
            >
              Loading...
            </div>
          }
        >
          {/* ListenerSocketProvider keeps the WebSocket alive across ALL pages.
              It only connects when the logged-in user is a LISTENER.
              The incoming-call popup is rendered directly inside the provider. */}
          <ListenerSocketProvider>{children}</ListenerSocketProvider>
        </Suspense>
      </body>
    </html>
  );
}