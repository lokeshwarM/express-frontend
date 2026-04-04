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

  interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;

    start(): void;
    stop(): void;

    onresult: (event: SpeechRecognitionEvent) => void;
    onerror: (event: Event) => void;
    onend: () => void;
  }

  interface Window {
    SpeechRecognition?: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition?: {
      new (): SpeechRecognition;
    };
  }
}