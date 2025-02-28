export interface Product {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  scanned: boolean;
}

export interface Order {
  id: string;
  orderDate: string;
  estimatedDate: string;
  warehouse: string;
  products: Product[];
  status: "pending" | "in_progress" | "completed";
}

export const dummyOrders: Order[] = [
  {
    id: "ORD001",
    orderDate: "2024-03-20",
    estimatedDate: "2024-03-22",
    warehouse: "Almacén Central",
    status: "completed",
    products: [
      {
        id: "021136010541",
        name: "Laptop Dell XPS",
        sku: "123456",
        quantity: 2,
        scanned: false,
      },
      {
        id: "021136010541",
        name: "Monitor LG 27'",
        sku: "789012",
        quantity: 3,
        scanned: false,
      },
    ],
  },
  {
    id: "ORD002",
    orderDate: "2024-03-21",
    estimatedDate: "2024-03-23",
    warehouse: "Almacén Norte",
    status: "in_progress",
    products: [
      {
        id: "021136010541",
        name: "Teclado Mecánico",
        sku: "KB-MECH-01",
        quantity: 5,
        scanned: false,
      },
    ],
  },
  {
    id: "ORD003",
    orderDate: "2024-03-21",
    estimatedDate: "2024-03-24",
    warehouse: "Almacén Sur",
    status: "pending",
    products: [
      {
        id: "021136010541",
        name: "Mouse Inalámbrico",
        sku: "021136010541",
        quantity: 10,
        scanned: false,
      },
    ],
  },
];
