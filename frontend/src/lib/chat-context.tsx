"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface VagaContextData {
  vagaId: string;
  titulo: string;
  empresa: string;
}

interface ChatContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  vagaContext: VagaContextData | null;
  openChatWithVaga: (vaga: VagaContextData) => void;
  clearVagaContext: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [vagaContext, setVagaContext] = useState<VagaContextData | null>(null);

  const openChatWithVaga = useCallback((vaga: VagaContextData) => {
    setVagaContext(vaga);
    setOpen(true);
  }, []);

  const clearVagaContext = useCallback(() => {
    setVagaContext(null);
  }, []);

  return (
    <ChatContext.Provider
      value={{ open, setOpen, vagaContext, openChatWithVaga, clearVagaContext }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
