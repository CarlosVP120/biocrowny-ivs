export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
}

export const dummyClients: Client[] = [
  {
    id: "CLI001",
    name: "Juan Pérez",
    phone: "+523319766821",
    email: "juan.perez@example.com",
    address: "Av. Principal 123, Col. Centro, CDMX",
  },
  {
    id: "CLI002",
    name: "María González",
    phone: "+523319766821",
    email: "maria.gonzalez@example.com",
    address: "Calle Secundaria 456, Col. Reforma, Monterrey",
  },
  {
    id: "CLI003",
    name: "Carlos Rodríguez",
    phone: "+523319766821",
    email: "carlos.rodriguez@example.com",
    address: "Blvd. Costero 789, Col. Playa, Cancún",
  },
];
