import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useOrdersStore } from "../store/orderStore";
import { useClientsStore } from "../store/clientStore";
import { Ionicons } from "@expo/vector-icons";
import { Order } from "../lib/orders";
import { sendOrderStatusNotificationWithFallback } from "../lib/twilioService";
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

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
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="#0066CC" />
              <ThemedText style={styles.backText}>Volver</ThemedText>
            </TouchableOpacity>
          </View>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
            <ThemedText style={styles.errorText}>Pedido no encontrado</ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>
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
        return "#0066CC"; // Blue
      default:
        return "#8E8E93"; // Default gray
    }
  };

  const renderContent = () => {
    const isOrderDelivered = order.status === "delivered";

    return (
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={styles.contentContainer}
          entering={FadeIn.delay(200).duration(600)}
        >
          <Animated.View 
            style={styles.statusSection}
            entering={FadeInDown.delay(300).duration(600)}
          >
            <View style={styles.orderHeader}>
              <ThemedText style={styles.orderLabel}>Pedido: {order.id}</ThemedText>
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

            <ThemedText style={styles.notificationText}>
              {isOrderDelivered
                ? "El pedido ha sido entregado satisfactoriamente."
                : "Se ha notificado al cliente que su pedido se encuentra en la dirección de entrega."}
            </ThemedText>
          </Animated.View>

          {client && (
            <Animated.View 
              style={styles.clientInfoSection}
              entering={FadeInDown.delay(400).duration(600)}
            >
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="person" size={20} color="#0066CC" />
                <ThemedText style={styles.sectionTitle}>
                  Información del Cliente
                </ThemedText>
              </View>
              
              <View style={styles.clientInfoRow}>
                <ThemedText style={styles.infoLabel}>Nombre:</ThemedText>
                <ThemedText style={styles.infoText}>{client.name}</ThemedText>
              </View>
              
              <View style={styles.clientInfoRow}>
                <ThemedText style={styles.infoLabel}>Teléfono:</ThemedText>
                <ThemedText style={styles.infoText}>{client.phone}</ThemedText>
              </View>
              
              <View style={styles.clientInfoRow}>
                <ThemedText style={styles.infoLabel}>Dirección:</ThemedText>
                <ThemedText style={styles.infoText}>{client.address}</ThemedText>
              </View>

              <TouchableOpacity
                style={styles.callButton}
                onPress={handleCallClient}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={20} color="#fff" />
                <ThemedText style={styles.callButtonText}>
                  Llamar al cliente
                </ThemedText>
              </TouchableOpacity>
            </Animated.View>
          )}

          <Animated.View 
            style={styles.instructionsSection}
            entering={FadeInDown.delay(500).duration(600)}
          >
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="information-circle" size={20} color="#0066CC" />
              <ThemedText style={styles.sectionTitle}>
                Instrucciones
              </ThemedText>
            </View>
            
            {isOrderDelivered ? (
              <View style={styles.instructionItem}>
                <Ionicons name="checkmark-circle" size={24} color="#34C759" style={styles.instructionIcon} />
                <ThemedText style={styles.instruction}>
                  El pedido ha sido entregado exitosamente y el cliente ha sido
                  notificado.
                </ThemedText>
              </View>
            ) : (
              <>
                <View style={styles.instructionItem}>
                  <View style={styles.instructionNumber}>
                    <ThemedText style={styles.instructionNumberText}>1</ThemedText>
                  </View>
                  <ThemedText style={styles.instruction}>
                    Entregue el pedido al cliente
                  </ThemedText>
                </View>
                <View style={styles.instructionItem}>
                  <View style={styles.instructionNumber}>
                    <ThemedText style={styles.instructionNumberText}>2</ThemedText>
                  </View>
                  <ThemedText style={styles.instruction}>
                    Una vez entregado, presione el botón "Completar entrega"
                  </ThemedText>
                </View>
              </>
            )}
          </Animated.View>
        </Animated.View>

        {!isOrderDelivered && (
          <Animated.View
            entering={FadeInDown.delay(600).duration(600)}
            style={styles.buttonContainer}
          >
            <TouchableOpacity
              style={[styles.completeButton, loading && styles.disabledButton]}
              onPress={handleCompleteDelivery}
              disabled={loading || isOrderDelivered}
              activeOpacity={0.8}
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
          </Animated.View>
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#0066CC" />
            <ThemedText style={styles.backText}>Volver</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.title}>Estado de Entrega</ThemedText>
        </View>

        {renderContent()}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    fontSize: 17,
    fontWeight: "600",
    marginLeft: 8,
    color: "#0066CC",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 12,
    color: "#000000",
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    textAlign: "center",
    marginTop: 16,
    color: "#000000",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  contentContainer: {
    flex: 1,
  },
  statusSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  orderLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  notificationText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#000000",
  },
  clientInfoSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
    color: "#000000",
  },
  clientInfoRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: "600",
    width: 80,
    color: "#6C757D",
  },
  infoText: {
    fontSize: 15,
    flex: 1,
    color: "#000000",
  },
  callButton: {
    backgroundColor: "#0066CC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  callButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 8,
    fontSize: 15,
  },
  instructionsSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  instructionIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0066CC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  instructionNumberText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
  instruction: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
    color: "#000000",
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  completeButton: {
    backgroundColor: "#34C759",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: "#A0A0A0",
  },
  completeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
});
