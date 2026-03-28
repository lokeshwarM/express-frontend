export {};

declare global {
  interface Window {
    // Razorpay payment SDK
    Razorpay: new (options: object) => { open(): void };

    // Google Identity Services (GSI) SDK
    google: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string | undefined;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: string;
              theme?: string;
              size?: string;
              text?: string;
              width?: number;
              logo_alignment?: string;
            }
          ) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}