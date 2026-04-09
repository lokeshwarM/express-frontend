import { Suspense } from "react";
import { ListenerSocketProvider } from "@/context/ListenerSocketContext";
import { CallProvider } from "@/context/CallContext";
import IncomingCallPopup from "@/components/IncomingCallPopup";

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
          <ListenerSocketProvider>
            <CallProvider>
              <IncomingCallPopup />
              {children}
            </CallProvider>
          </ListenerSocketProvider>
        </Suspense>
      </body>
    </html>
  );
}