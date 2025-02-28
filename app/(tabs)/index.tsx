import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  View,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useOrdersStore } from "../store/orderStore";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState(useOrdersStore.getState().orders);

  // Ordenar los pedidos: pendientes primero, luego en progreso, y completados al final
  const sortedOrders = [...orders].sort((a, b) => {
    const orderPriority = {
      pending: 0,
      in_progress: 1,
      completed: 2,
    };
    return orderPriority[a.status] - orderPriority[b.status];
  });

  const orderLabels = {
    pending: "⏳ Pendiente",
    in_progress: "⚙️ En proceso",
    completed: "✅ Listo para enviar",
  };

  const handleTakeNextOrder = () => {
    const nextPendingOrder = orders.find((order) => order.status === "pending");
    if (nextPendingOrder) {
      setOrders(
        orders.map((order) =>
          order.id === nextPendingOrder.id
            ? { ...order, status: "in_progress" }
            : order
        )
      );
      router.push(`/(tabs)/scan-order/${nextPendingOrder.id}`);
    }
  };

  const pendingOrders = orders.filter(
    (order) => order.status === "pending"
  ).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <Image
            source={require("@/assets/images/biocrowny-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <ThemedText type="title">Lista de Pedidos</ThemedText>
          <ThemedText type="subtitle">Pendientes: {pendingOrders}</ThemedText>
        </View>

        <TouchableOpacity
          style={[
            styles.takeOrderButton,
            !pendingOrders && styles.takeOrderButtonDisabled,
          ]}
          onPress={handleTakeNextOrder}
          disabled={!pendingOrders}
        >
          <ThemedText style={styles.buttonText}>
            {pendingOrders
              ? `Tomar Siguiente Pedido (${pendingOrders})`
              : "No hay pedidos pendientes"}
          </ThemedText>
        </TouchableOpacity>

        <ScrollView style={styles.scrollView}>
          {sortedOrders.map((order) => (
            <ThemedView key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <ThemedText type="subtitle">Pedido: {order.id}</ThemedText>
                <ThemedText
                  style={[
                    styles.statusBadge,
                    order.status === "pending"
                      ? styles.statusPending
                      : order.status === "in_progress"
                      ? styles.statusInProgress
                      : styles.statusCompleted,
                  ]}
                >
                  {orderLabels[order.status]}
                </ThemedText>
              </View>

              <View style={styles.orderInfo}>
                <ThemedText>📅 Fecha: {order.orderDate}</ThemedText>
                <ThemedText>🎯 Entrega: {order.estimatedDate}</ThemedText>
                <ThemedText>🏭 Almacén: {order.warehouse}</ThemedText>
                <ThemedText>📦 Productos: {order.products.length}</ThemedText>
              </View>
            </ThemedView>
          ))}
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingBottom: 36,
  },
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 20,
  },
  header: {
    marginBottom: 16,
    gap: 4,
  },
  scrollView: {
    flex: 1,
    marginTop: 16,
  },
  orderCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderInfo: {
    gap: 4,
  },
  takeOrderButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  takeOrderButtonDisabled: {
    backgroundColor: "#999",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  statusPending: {
    backgroundColor: "#FFF3CD",
    color: "#856404",
  },
  statusInProgress: {
    backgroundColor: "#D4EDDA",
    color: "#155724",
  },
  statusCompleted: {
    backgroundColor: "#D4EDDA",
    color: "#155724",
  },
  logo: {
    width: 200,
    height: 60,
    alignSelf: "center",
    marginBottom: 16,
  },
});
