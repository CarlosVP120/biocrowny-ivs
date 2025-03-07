import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useOrdersStore } from "../store/orderStore";
import { useClientsStore } from "../store/clientStore";
import { Ionicons } from "@expo/vector-icons";
import { Order } from "../lib/orders";
import { sendOrderStatusNotificationWithFallback } from "../lib/twilioService";

// Helper function to check if status is "delivered"
const isDelivered = (status: Order["status"]): boolean => {
  return status === "delivered";
};

export default function DeliveryStatusScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { orders, setOrders } = useOrdersStore();
  const { getClientById } = useClientsStore();
  const [loading, setLoading] = useState(false);

  const order = orders.find((o) => o.id === id);
  const client = order ? getClientById(order.clientId) : undefined;

  if (!order) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <ThemedText style={styles.title}>Estado de Entrega</ThemedText>
        </View>
        <ThemedText style={styles.errorText}>Pedido no encontrado</ThemedText>
      </ThemedView>
    );
  }

  const handleCompleteDelivery = async () => {
    setLoading(true);

    try {
      // Send notification to client
      if (client) {
        await sendOrderStatusNotificationWithFallback(
          client,
          order,
          "entregado"
        );
      }

      // Update order status to "delivered"
      const updatedOrders = orders.map((o) =>
        o.id === id ? { ...o, status: "delivered" as const } : o
      );

      // Simular una espera para la actualización
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Actualizar el estado en la tienda
      setOrders(updatedOrders);

      Alert.alert("Éxito", "Pedido marcado como entregado correctamente", [
        {
          text: "OK",
          onPress: () => router.push("/(tabs)"),
        },
      ]);
    } catch (error) {
      console.error("Error al completar entrega:", error);
      Alert.alert("Error", "No se pudo marcar el pedido como entregado");
    } finally {
      setLoading(false);
    }
  };

  const handleCallClient = () => {
    if (client?.phone) {
      Linking.openURL(`tel:${client.phone}`);
    } else {
      Alert.alert("Error", "No hay número de teléfono disponible");
    }
  };

  // Function to get status label in Spanish
  const getStatusLabel = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "Pendiente";
      case "in_progress":
        return "En Progreso";
      case "completed":
        return "Completado";
      case "delivered":
        return "Entregado";
      default:
        return "Desconocido";
    }
  };

  // Function to get status color
  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "#8E8E93"; // Gray
      case "in_progress":
        return "#FF9500"; // Orange
      case "completed":
        return "#34C759"; // Green
      case "delivered":
        return "#007AFF"; // Blue
      default:
        return "#8E8E93"; // Default gray
    }
  };

  const renderContent = () => {
    const isOrderDelivered = order.status === "delivered";

    return (
      <View style={styles.content}>
        <View style={styles.orderInfoContainer}>
          <ThemedText style={styles.orderLabel}>Pedido: {order.id}</ThemedText>
          <View style={styles.statusContainer}>
            <ThemedText style={styles.statusLabel}>Estado actual:</ThemedText>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(order.status) },
              ]}
            >
              <ThemedText style={styles.statusText}>
                {getStatusLabel(order.status)}
              </ThemedText>
            </View>
          </View>

          {client && (
            <View style={styles.clientInfoSection}>
              <ThemedText style={styles.sectionTitle}>
                Información del Cliente:
              </ThemedText>
              <ThemedText style={styles.infoText}>
                <ThemedText style={styles.infoLabel}>Nombre: </ThemedText>
                {client.name}
              </ThemedText>
              <ThemedText style={styles.infoText}>
                <ThemedText style={styles.infoLabel}>Teléfono: </ThemedText>
                {client.phone}
              </ThemedText>
              <ThemedText style={styles.infoText}>
                <ThemedText style={styles.infoLabel}>Dirección: </ThemedText>
                {client.address}
              </ThemedText>

              <TouchableOpacity
                style={styles.callButton}
                onPress={handleCallClient}
              >
                <Ionicons name="call" size={20} color="#fff" />
                <ThemedText style={styles.callButtonText}>
                  Llamar al cliente
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}

          <ThemedText style={styles.notificationText}>
            {isOrderDelivered
              ? "El pedido ha sido entregado satisfactoriamente."
              : "Se ha notificado al cliente que su pedido se encuentra en la dirección de entrega."}
          </ThemedText>

          <View style={styles.divider} />

          <ThemedText style={styles.instructionTitle}>
            Instrucciones:
          </ThemedText>
          {isOrderDelivered ? (
            <ThemedText style={styles.instruction}>
              El pedido ha sido entregado exitosamente y el cliente ha sido
              notificado.
            </ThemedText>
          ) : (
            <>
              <ThemedText style={styles.instruction}>
                1. Entregue el pedido al cliente
              </ThemedText>
              <ThemedText style={styles.instruction}>
                2. Una vez entregado, presione el botón "Completar entrega"
              </ThemedText>
            </>
          )}
        </View>

        {!isOrderDelivered && (
          <TouchableOpacity
            style={[styles.completeButton, loading && styles.disabledButton]}
            onPress={handleCompleteDelivery}
            disabled={loading || isOrderDelivered}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <ThemedText style={styles.completeButtonText}>
                  Completar entrega
                </ThemedText>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <ThemedText style={styles.title}>Estado de Entrega</ThemedText>
      </View>

      {renderContent()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  backButton: {
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginLeft: 10,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
  },
  errorText: {
    fontSize: 18,
    textAlign: "center",
    margin: 20,
  },
  orderInfoContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  orderLabel: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  statusLabel: {
    fontSize: 18,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  notificationText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 20,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  instruction: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 10,
  },
  completeButton: {
    backgroundColor: "#34C759",
    padding: 15,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: "#A0A0A0",
  },
  completeButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  clientInfoSection: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 8,
  },
  infoLabel: {
    fontWeight: "600",
  },
  callButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: 8,
    marginTop: 15,
  },
  callButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    marginLeft: 8,
  },
});
