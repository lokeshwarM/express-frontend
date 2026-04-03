import { Suspense } from "react";
import { ListenerSocketProvider } from "@/context/ListenerSocketContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
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
              It only connects when the logged-in user is a LISTENER. */}
          <ListenerSocketProvider>{children}</ListenerSocketProvider>
        </Suspense>
      </body>
    </html>
  );
}