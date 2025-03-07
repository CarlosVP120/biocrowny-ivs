import { create } from "zustand";
import { dummyClients, Client } from "../lib/clients";

interface ClientStore {
  clients: Client[];
  setClients: (clients: Client[]) => void;
  getClientById: (id: string) => Client | undefined;
}

export const useClientsStore = create<ClientStore>((set, get) => ({
  clients: dummyClients,
  setClients: (newClients) => set({ clients: newClients }),
  getClientById: (id) => get().clients.find((client) => client.id === id),
}));
