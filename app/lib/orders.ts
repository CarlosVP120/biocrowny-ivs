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
        name: "Cloralex Gel",
        sku: "7501025405151",
        quantity: 2,
        scanned: false,
        scannedCount: 0,
      },
      {
        id: "P002",
        name: "Fabuloso Ultra Frescura",
        sku: "7501035905344",
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
        id: "P001",
        name: "Cloralex Gel",
        sku: "7501025405151",
        quantity: 1,
        scanned: false,
        scannedCount: 0,
      },
      {
        id: "P002",
        name: "Fabuloso Ultra Frescura",
        sku: "7501035905344",
        quantity: 1,
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
        id: "P001",
        name: "Cloralex Gel",
        sku: "7501025405151",
        quantity: 2,
        scanned: false,
        scannedCount: 0,
      },
      {
        id: "P002",
        name: "Fabuloso Ultra Frescura",
        sku: "7501035905344",
        quantity: 1,
        scanned: false,
        scannedCount: 0,
      },
    ],
  },
];
