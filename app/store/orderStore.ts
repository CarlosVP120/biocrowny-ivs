import { create } from "zustand";
import { dummyOrders } from "../lib/orders";
import { Order } from "../lib/orders";

interface OrderStore {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
}

export const useOrdersStore = create<OrderStore>((set) => ({
  orders: dummyOrders,
  setOrders: (newOrders) => set({ orders: newOrders }),
}));
