export interface Product {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  scanned: boolean;
  scannedCount: number;
}

export interface Order {
  id: string;
  orderDate: string;
  estimatedDate: string;
  warehouse: string;
  clientId: string;
  products: Product[];
  status: "pending" | "in_progress" | "completed" | "delivered";
}

export const dummyOrders: Order[] = [
  {
    id: "ORD001",
    orderDate: "2024-03-20",
    estimatedDate: "2024-03-22",
    warehouse: "Almacén Central",
    clientId: "CLI001",
    status: "completed",
    products: [
      {
        id: "P001",
        name: "Laptop Dell XPS",
        sku: "123456",
        quantity: 2,
        scanned: false,
        scannedCount: 0,
      },
      {
        id: "P002",
        name: "Monitor LG 27'",
        sku: "789012",
        quantity: 3,
        scanned: false,
        scannedCount: 0,
      },
    ],
  },
  {
    id: "ORD002",
    orderDate: "2024-03-21",
    estimatedDate: "2024-03-23",
    warehouse: "Almacén Norte",
    clientId: "CLI002",
    status: "in_progress",
    products: [
      {
        id: "P003",
        name: "Teclado Mecánico",
        sku: "KB-MECH-01",
        quantity: 5,
        scanned: false,
        scannedCount: 0,
      },
    ],
  },
  {
    id: "ORD003",
    orderDate: "2024-03-21",
    estimatedDate: "2024-03-24",
    warehouse: "Almacén Sur",
    clientId: "CLI003",
    status: "pending",
    products: [
      {
        id: "P004",
        name: "Mouse Inalámbrico",
        sku: "021136010541",
        quantity: 2,
        scanned: false,
        scannedCount: 0,
      },
      {
        id: "P005",
        name: "Teclado Mecánico",
        sku: "7503037623851",
        quantity: 1,
        scanned: false,
        scannedCount: 0,
      },
    ],
  },
];
