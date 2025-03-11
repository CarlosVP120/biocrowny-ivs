import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  View,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Text,
} from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { ThemedText } from "@/components/ThemedText";
import { useOrdersStore } from "../store/orderStore";
import { useState, useCallback, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Order } from "../lib/orders";
import React from "react";
import * as Linking from "expo-linking";

export default function HomeScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>(
    useOrdersStore.getState().orders
  );
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingOrder, setProcessingOrder] = useState(false);

  // Simular carga inicial
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // Función para navegar a la página de inicio principal
  const handleGoToMainMenu = () => {
    console.log("Navegando al inicio...");

    // Intenta salir de la vista actual usando ../
    router.navigate({
      pathname: "../",
    });
  };

  // Ordenar los pedidos: pendientes primero, luego en progreso, y completados al final
  const sortedOrders = [...orders].sort((a, b) => {
    const orderPriority = {
      pending: 0,
      in_progress: 1,
      completed: 2,
      delivered: 3,
    };
    return orderPriority[a.status] - orderPriority[b.status];
  });

  const orderLabels = {
    pending: "⏳ Pendiente",
    in_progress: "⚙️ En proceso",
    completed: "🚚 Listo para enviar",
    delivered: "✅ Entregado",
  };

  const handleTakeNextOrder = () => {
    if (processingOrder) return;

    const nextPendingOrder = orders.find((order) => order.status === "pending");
    if (nextPendingOrder) {
      try {
        setProcessingOrder(true);

        // Actualizar el estado
        const updatedOrders = orders.map((order) =>
          order.id === nextPendingOrder.id
            ? { ...order, status: "in_progress" as const }
            : order
        );

        // Actualizar el store global y el estado local
        useOrdersStore.getState().setOrders(updatedOrders);
        setOrders(updatedOrders);

        // Navegar a la pantalla de escaneo con un pequeño retraso
        setTimeout(() => {
          router.push({
            pathname: "/(tabs)/scan-order/[id]",
            params: { id: nextPendingOrder.id },
          });

          // Resetear el estado de procesamiento después de la navegación
          setTimeout(() => {
            setProcessingOrder(false);
          }, 500);
        }, 300);
      } catch (error) {
        console.error("Error al tomar el pedido:", error);
        Alert.alert(
          "Error",
          "Hubo un problema al tomar el pedido. Inténtalo de nuevo."
        );
        setProcessingOrder(false);
      }
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simular una actualización de datos
    setTimeout(() => {
      setOrders(useOrdersStore.getState().orders);
      setRefreshing(false);
    }, 1000);
  }, []);

  const pendingOrders = orders.filter(
    (order) => order.status === "pending"
  ).length;

  const inProgressOrders = orders.filter(
    (order) => order.status === "in_progress"
  ).length;

  const handleOrderPress = (orderId: string) => {
    if (processingOrder) return;

    const order = orders.find((o) => o.id === orderId);
    if (order && order.status === "in_progress") {
      setProcessingOrder(true);

      setTimeout(() => {
        router.push({
          pathname: "/(tabs)/scan-order/[id]",
          params: { id: orderId },
        });

        setTimeout(() => {
          setProcessingOrder(false);
        }, 500);
      }, 300);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <ThemedText style={styles.loadingText}>
            Cargando pedidos...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.homeButtonContainer}
            onPress={handleGoToMainMenu}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.homeButton}>
              <Ionicons name="home" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.homeButtonText}>Inicio</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Image
              source={require("@/assets/images/biocrowny-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <ThemedText style={styles.title}>Lista de Pedidos</ThemedText>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <View style={[styles.statBadge, styles.pendingBadge]}>
                  <ThemedText style={styles.statNumber}>
                    {pendingOrders}
                  </ThemedText>
                </View>
                <ThemedText style={styles.statLabel}>Pendientes</ThemedText>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.statBadge, styles.progressBadge]}>
                  <ThemedText style={styles.statNumber}>
                    {inProgressOrders}
                  </ThemedText>
                </View>
                <ThemedText style={styles.statLabel}>En proceso</ThemedText>
              </View>

              <View style={styles.statItem}>
                <View style={[styles.statBadge, styles.completedBadge]}>
                  <ThemedText style={styles.statNumber}>
                    {orders.length - pendingOrders - inProgressOrders}
                  </ThemedText>
                </View>
                <ThemedText style={styles.statLabel}>Completados</ThemedText>
              </View>
            </View>
          </View>
        </View>

        {pendingOrders > 0 && (
          <TouchableOpacity
            style={[
              styles.takeOrderButton,
              processingOrder && styles.disabledButton,
            ]}
            onPress={handleTakeNextOrder}
            activeOpacity={0.8}
            disabled={processingOrder}
          >
            {processingOrder ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color="white" />
                <ThemedText style={styles.buttonText}>
                  Tomar Siguiente Pedido ({pendingOrders})
                </ThemedText>
              </>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Todos los pedidos</ThemedText>
          <ThemedText style={styles.sectionCount}>{orders.length}</ThemedText>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#0066CC"]}
            />
          }
        >
          {sortedOrders.map((order, index) => (
            <Animated.View
              key={order.id}
              entering={FadeInDown.delay(index * 100).springify()}
            >
              <TouchableOpacity
                style={[
                  styles.orderCard,
                  order.status === "in_progress" && styles.activeOrderCard,
                ]}
                onPress={() => handleOrderPress(order.id)}
                activeOpacity={order.status === "in_progress" ? 0.7 : 1}
                disabled={order.status !== "in_progress"}
              >
                <View style={styles.orderHeader}>
                  <View style={styles.orderTitleContainer}>
                    {order.status === "in_progress" && (
                      <Ionicons
                        name="ellipse"
                        size={12}
                        color="#0066CC"
                        style={styles.activeIndicator}
                      />
                    )}
                    <ThemedText style={styles.orderTitle}>
                      Pedido: {order.id}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      order.status === "pending"
                        ? styles.statusPending
                        : order.status === "in_progress"
                        ? styles.statusInProgress
                        : styles.statusCompleted,
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.statusText,
                        order.status === "pending"
                          ? styles.statusTextPending
                          : styles.statusTextSuccess,
                      ]}
                    >
                      {orderLabels[order.status]}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.orderInfo}>
                  <View style={styles.orderDetailRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color="#6C757D"
                      style={styles.detailIcon}
                    />
                    <ThemedText style={styles.orderDetail}>
                      Fecha: {order.orderDate}
                    </ThemedText>
                  </View>
                  <View style={styles.orderDetailRow}>
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color="#6C757D"
                      style={styles.detailIcon}
                    />
                    <ThemedText style={styles.orderDetail}>
                      Entrega: {order.estimatedDate}
                    </ThemedText>
                  </View>
                  <View style={styles.orderDetailRow}>
                    <Ionicons
                      name="business-outline"
                      size={16}
                      color="#6C757D"
                      style={styles.detailIcon}
                    />
                    <ThemedText style={styles.orderDetail}>
                      Almacén: {order.warehouse}
                    </ThemedText>
                  </View>
                  <View style={styles.orderDetailRow}>
                    <Ionicons
                      name="cube-outline"
                      size={16}
                      color="#6C757D"
                      style={styles.detailIcon}
                    />
                    <ThemedText style={styles.orderDetail}>
                      Productos: {order.products.length}
                    </ThemedText>
                  </View>
                </View>

                {order.status === "in_progress" && (
                  <View style={styles.continueContainer}>
                    <ThemedText style={styles.continueText}>
                      Continuar procesando
                    </ThemedText>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#0066CC"
                    />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          ))}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
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
    padding: 12,
    paddingTop: 8,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6C757D",
  },
  headerContainer: {
    position: "relative",
    marginBottom: 12,
    paddingTop: 0,
  },
  header: {
    marginBottom: 0,
    paddingTop: 0,
  },
  homeButtonContainer: {
    position: "absolute",
    top: -15,
    left: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    minWidth: 90,
    minHeight: 40,
  },
  homeButton: {
    width: 28,
    height: 28,
    borderRadius: 16,
    backgroundColor: "#0066CC",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  homeButtonText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#0066CC",
  },
  logo: {
    width: 140,
    height: 40,
    alignSelf: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
    textAlign: "center",
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 4,
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  statBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  pendingBadge: {
    backgroundColor: "#FFF3CD",
  },
  progressBadge: {
    backgroundColor: "#D1ECF1",
  },
  completedBadge: {
    backgroundColor: "#D4EDDA",
  },
  statNumber: {
    fontWeight: "700",
    fontSize: 14,
    color: "#000000",
  },
  statLabel: {
    fontSize: 12,
    color: "#6C757D",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    paddingHorizontal: 4,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  sectionCount: {
    fontSize: 16,
    color: "#6C757D",
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingTop: 12,
  },
  orderCard: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    backgroundColor: "#FFFFFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activeOrderCard: {
    borderColor: "#0066CC",
    borderLeftWidth: 4,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  activeIndicator: {
    marginRight: 6,
  },
  orderTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
  },
  orderInfo: {
    gap: 6,
  },
  orderDetailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailIcon: {
    marginRight: 8,
  },
  orderDetail: {
    fontSize: 13,
    color: "#000000",
  },
  takeOrderButton: {
    backgroundColor: "#0066CC",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusPending: {
    backgroundColor: "#FFF3CD",
  },
  statusInProgress: {
    backgroundColor: "#D1ECF1",
  },
  statusCompleted: {
    backgroundColor: "#D4EDDA",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusTextPending: {
    color: "#856404",
  },
  statusTextSuccess: {
    color: "#28A745",
  },
  continueContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
  },
  continueText: {
    fontSize: 13,
    color: "#0066CC",
    marginRight: 4,
  },
  bottomPadding: {
    height: 40,
  },
});
