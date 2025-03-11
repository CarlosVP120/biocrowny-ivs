import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  useColorScheme,
  Modal,
  Easing,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
  Linking,
  Animated as RNAnimated,
  AppState,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Order, dummyOrders } from "../lib/orders";
import { Ionicons } from "@expo/vector-icons";
import {
  CameraView,
  useCameraPermissions,
  BarcodeScanningResult,
} from "expo-camera";
import { useOrdersStore } from "../store/orderStore";
import { useClientsStore } from "../store/clientStore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useFocusEffect } from "@react-navigation/native";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const DRAWER_HEIGHT = SCREEN_HEIGHT * 0.85;

// Definir tipos para las props del componente AnimatedScanFrame
interface AnimatedScanFrameProps {
  isInCooldown: boolean;
  scanFrameColorAnim: RNAnimated.Value;
  scanLoadingAnim: RNAnimated.Value;
}

// Definir el tipo de producto
interface Product {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  scannedCount: number;
  scanned: boolean;
}

// Componente para el marco de escaneo con color animado
const AnimatedScanFrame: React.FC<AnimatedScanFrameProps> = ({
  isInCooldown,
  scanFrameColorAnim,
  scanLoadingAnim,
}) => {
  // Convertir la interpolación a un string para evitar errores de tipo
  const borderColorString = scanFrameColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#0066CC", "#FF9500"],
  });

  return (
    <View style={styles.scanFrame}>
      {/* Capa animada encima */}
      {isInCooldown && (
        <RNAnimated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderWidth: 2,
            borderRadius: 8,
            borderColor: borderColorString,
          }}
        />
      )}

      {isInCooldown && (
        <RNAnimated.View
          style={[
            styles.scanLoadingBar,
            {
              width: scanLoadingAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
              backgroundColor: "#FF9500",
            },
          ]}
        />
      )}
    </View>
  );
};

export default function ScanOrderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [currentOrder, setCurrentOrder] = useState<Order | undefined>(
    useOrdersStore.getState().orders.find((order) => order.id === id)
  );
  const { getClientById } = useClientsStore();
  const client = currentOrder
    ? getClientById(currentOrder.clientId)
    : undefined;
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [isInCooldown, setIsInCooldown] = useState(false);
  const colorScheme = useColorScheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error">("success");
  const [allProductsScanned, setAllProductsScanned] = useState(false);
  const [lastScannedProductId, setLastScannedProductId] = useState<
    string | null
  >(null);
  const [processingBarcode, setProcessingBarcode] = useState(false);

  // Animación del drawer
  const drawerAnim = useRef(new RNAnimated.Value(SCREEN_HEIGHT)).current;

  // Animaciones para el cooldown del escáner
  const scanFrameColorAnim = useRef(new RNAnimated.Value(0)).current;
  const scanLoadingAnim = useRef(new RNAnimated.Value(0)).current;

  // Animación para el botón de escanear
  const buttonScale = useSharedValue(1);
  const buttonAnimStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  const qrLock = useRef(false);
  const appState = useRef(AppState.currentState);

  // Add AppState listener to reset lock when app becomes active
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        qrLock.current = false;
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Add cleanup for component unmount
  useEffect(() => {
    return () => {
      qrLock.current = false;
    };
  }, []);

  // Efecto para la animación de carga durante el cooldown
  useEffect(() => {
    if (isInCooldown) {
      // Animar el color del marco a naranja
      RNAnimated.timing(scanFrameColorAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();

      // Animar la barra de carga
      RNAnimated.timing(scanLoadingAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(() => {
        // Cuando termina la animación, resetear el cooldown
        setIsInCooldown(false);
        setScanned(false);

        // Resetear las animaciones
        scanFrameColorAnim.setValue(0);
        scanLoadingAnim.setValue(0);
      });
    }
  }, [isInCooldown]);

  // Efecto para animar el botón cuando la pantalla obtiene el foco
  useFocusEffect(
    useCallback(() => {
      buttonScale.value = withSpring(1.05);
      setTimeout(() => {
        buttonScale.value = withSpring(1);
      }, 300);
    }, [])
  );

  // Update current order when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const order = useOrdersStore
        .getState()
        .orders.find((order) => order.id === id);
      setCurrentOrder(order);
    }, [id])
  );

  const insets = useSafeAreaInsets();

  // Mejorar la función de apertura del drawer con animación
  const openDrawer = async () => {
    if (!permission?.granted) {
      const permissionResult = await requestPermission();
      if (!permissionResult.granted) {
        showModal("Se necesita permiso para acceder a la cámara", "error");
        return;
      }
    }

    // Animar el botón al presionar
    buttonScale.value = withTiming(0.95, { duration: 100 });
    setTimeout(() => {
      buttonScale.value = withTiming(1, { duration: 100 });

      // Iniciar el escaneo
      setScanned(false);
      setIsScanning(true);

      // Usar la API de Animated de React Native
      RNAnimated.spring(drawerAnim, {
        toValue: SCREEN_HEIGHT - DRAWER_HEIGHT,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();
    }, 150);
  };

  const closeDrawer = () => {
    RNAnimated.spring(drawerAnim, {
      toValue: SCREEN_HEIGHT,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start(() => {
      setIsScanning(false);
      setScanned(false);
      setIsInCooldown(false);
      scanFrameColorAnim.setValue(0);
      scanLoadingAnim.setValue(0);
    });
  };

  const showModal = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    if (modalVisible) return;

    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);

    const modalTimeout = setTimeout(() => {
      setModalVisible(false);

      if (type === "success" && currentOrder) {
        const allScanned = currentOrder.products.every((p) => p.scanned);
        if (allScanned) {
          setAllProductsScanned(true);
          router.push(`/order-completed/${currentOrder.id}`);
        }
      }

      // Reset all scanning states
      qrLock.current = false;
      setScanned(false);
      setIsInCooldown(false);
      scanFrameColorAnim.setValue(0);
      scanLoadingAnim.setValue(0);
    }, 2000);

    return () => clearTimeout(modalTimeout);
  };

  const handleBarCodeScanned = (scanningResult: BarcodeScanningResult) => {
    // Use qrLock to prevent multiple scans
    if (!currentOrder || qrLock.current) {
      console.log("Scan blocked:", {
        hasOrder: !!currentOrder,
        qrLocked: qrLock.current,
      });
      return;
    }

    // Immediately lock scanning
    qrLock.current = true;
    setProcessingBarcode(true);

    try {
      const { data } = scanningResult;
      console.log("Código escaneado:", data);

      const productToUpdate = currentOrder.products.find((product) => {
        return product.sku === data && product.scannedCount < product.quantity;
      });

      if (productToUpdate) {
        setLastScannedProductId(productToUpdate.id);

        // Create a deep copy of the current order
        const updatedOrder = JSON.parse(JSON.stringify(currentOrder));

        // Update scanned product
        const updatedProducts = updatedOrder.products.map(
          (product: Product) => {
            if (product.id === productToUpdate.id) {
              return {
                ...product,
                scannedCount: product.scannedCount + 1,
                scanned: product.scannedCount + 1 === product.quantity,
              };
            }
            return product;
          }
        );

        updatedOrder.products = updatedProducts;
        setCurrentOrder(updatedOrder);

        // Update global store
        const { orders, setOrders } = useOrdersStore.getState();
        const updatedOrders = orders.map((order) =>
          order.id === currentOrder.id ? updatedOrder : order
        );
        setOrders(updatedOrders);

        const remaining =
          productToUpdate.quantity - (productToUpdate.scannedCount + 1);

        if (remaining > 0) {
          showModal(
            `Producto "${productToUpdate.name}" escaneado (${
              productToUpdate.scannedCount + 1
            }/${productToUpdate.quantity}). Faltan ${remaining}`
          );
        } else {
          showModal(`Producto "${productToUpdate.name}" completado!`);
        }

        // Check if all products are scanned
        const allProductsComplete = updatedProducts.every(
          (p: Product) => p.scannedCount === p.quantity
        );

        if (allProductsComplete) {
          showModal("¡Todos los productos han sido escaneados!");
          setAllProductsScanned(true);
          closeDrawer();
        }
      } else {
        const isProductComplete = currentOrder.products.find(
          (product) =>
            product.sku === data && product.scannedCount >= product.quantity
        );

        if (isProductComplete) {
          showModal(
            `El producto "${isProductComplete.name}" ya fue escaneado completamente`,
            "error"
          );
        } else {
          showModal(
            `Código "${data}" no corresponde a ningún producto del pedido`,
            "error"
          );
        }
      }
    } catch (error) {
      console.error("Error al procesar el código:", error);
      showModal("Error al procesar el código escaneado", "error");
    } finally {
      // Reset processing flag after delay
      setTimeout(() => {
        setProcessingBarcode(false);
      }, 500);
    }
  };

  const handleRescan = () => {
    if (modalVisible || processingBarcode) return;

    qrLock.current = false;
    setScanned(false);
    setIsInCooldown(false);
    scanFrameColorAnim.setValue(0);
    scanLoadingAnim.setValue(0);
  };

  const handleCompleteOrder = () => {
    if (currentOrder) {
      const { orders, setOrders } = useOrdersStore.getState();
      // Actualizar el estado del pedido a completado
      setOrders(
        orders.map((order) =>
          order.id === currentOrder?.id
            ? { ...order, status: "completed" as const }
            : order
        )
      );

      // Redirigir a la pantalla del código QR en lugar de volver atrás
      router.push(`/order-completed/${currentOrder.id}`);
    } else {
      router.back();
    }
  };

  const handleCallClient = () => {
    if (client?.phone) {
      Linking.openURL(`tel:${client.phone}`);
    } else {
      alert("No hay número de teléfono disponible");
    }
  };

  console.log("Order ID:", id); // Para debugging
  console.log("Current Order:", currentOrder); // Para debugging

  if (!currentOrder) {
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
          <View style={styles.noOrderContainer}>
            <Ionicons name="alert-circle-outline" size={60} color="#FF3B30" />
            <ThemedText style={styles.errorText}>
              Orden no encontrada
            </ThemedText>
            <ThemedText style={styles.errorSubtext}>
              La orden que estás buscando no existe o no está disponible.
            </ThemedText>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.back()}
            >
              <ThemedText style={[styles.buttonText, { color: "#0066CC" }]}>
                Volver a la lista de pedidos
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  // Calcular el progreso general
  const totalProducts = currentOrder.products.reduce(
    (acc, p) => acc + p.quantity,
    0
  );
  const scannedTotal = currentOrder.products.reduce(
    (acc, p) => acc + p.scannedCount,
    0
  );
  const progressPercentage =
    totalProducts > 0 ? (scannedTotal / totalProducts) * 100 : 0;

  const isDark = colorScheme === "dark";
  const colors = {
    background: "#FFFFFF",
    card: "#FFFFFF",
    text: "#000000",
    textSecondary: "#6C757D",
    border: "#E9ECEF",
    primary: "#0066CC",
    success: "#28A745",
    warning: "#856404",
    warningBg: "#FFF3CD",
    successBg: "#D4EDDA",
    orange: "#FF9500",
  };

  // Interpolación de colores para el marco de escaneo
  const scanFrameBorderColor = scanFrameColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#0066CC", "#FF9500"],
  });

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

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View style={styles.orderInfo}>
            <ThemedText style={styles.orderId}>
              Pedido: {currentOrder.id}
            </ThemedText>

            {/* Client Information Section */}
            {client && (
              <View style={styles.clientSection}>
                <View style={styles.clientHeader}>
                  <Ionicons name="person-outline" size={18} color="#6C757D" />
                  <ThemedText style={styles.clientTitle}>
                    Información del Cliente
                  </ThemedText>
                </View>
                <View style={styles.clientDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons
                      name="person"
                      size={16}
                      color="#6C757D"
                      style={styles.detailIcon}
                    />
                    <ThemedText style={styles.detailText}>
                      {client.name}
                    </ThemedText>
                  </View>
                  <TouchableOpacity
                    style={styles.detailRow}
                    onPress={handleCallClient}
                  >
                    <Ionicons
                      name="call"
                      size={16}
                      color="#0066CC"
                      style={styles.detailIcon}
                    />
                    <ThemedText
                      style={[styles.detailText, { color: "#0066CC" }]}
                    >
                      {client.phone}
                    </ThemedText>
                  </TouchableOpacity>
                  <View style={styles.detailRow}>
                    <Ionicons
                      name="mail"
                      size={16}
                      color="#6C757D"
                      style={styles.detailIcon}
                    />
                    <ThemedText style={styles.detailText}>
                      {client.email}
                    </ThemedText>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons
                      name="location"
                      size={16}
                      color="#6C757D"
                      style={styles.detailIcon}
                    />
                    <ThemedText style={styles.detailText}>
                      {client.address}
                    </ThemedText>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <ThemedText style={styles.progressTitle}>Progreso</ThemedText>
                <ThemedText style={styles.progressPercentage}>
                  {Math.round(progressPercentage)}%
                </ThemedText>
              </View>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      { width: `${progressPercentage}%` },
                    ]}
                  />
                </View>
                <ThemedText style={styles.progressText}>
                  {scannedTotal} de {totalProducts} productos escaneados
                </ThemedText>
              </View>
            </View>

            <View style={styles.orderDetails}>
              <View style={styles.detailRow}>
                <Ionicons
                  name="cube-outline"
                  size={18}
                  color="#6C757D"
                  style={styles.detailIcon}
                />
                <ThemedText style={styles.detailText}>
                  Almacén: {currentOrder.warehouse}
                </ThemedText>
              </View>
              <View style={styles.detailRow}>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color="#6C757D"
                  style={styles.detailIcon}
                />
                <ThemedText style={styles.detailText}>
                  Fecha estimada: {currentOrder.estimatedDate}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>
              Productos a escanear
            </ThemedText>
            <ThemedText style={styles.sectionCount}>
              {currentOrder.products.length}
            </ThemedText>
          </View>

          {currentOrder.products.map((product, index) => (
            <Animated.View
              key={product.id}
              style={[
                styles.productItem,
                product.scanned && styles.productItemScanned,
                product.id === lastScannedProductId &&
                  styles.lastScannedProduct,
              ]}
            >
              <View style={styles.productHeader}>
                <ThemedText style={styles.productName}>
                  {product.name}
                </ThemedText>
                <View
                  style={[
                    styles.statusBadge,
                    product.scanned
                      ? styles.statusBadgeSuccess
                      : styles.statusBadgePending,
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.statusText,
                      product.scanned
                        ? styles.statusTextSuccess
                        : styles.statusTextPending,
                    ]}
                  >
                    {product.scanned ? "✅ Escaneado" : "⏳ Pendiente"}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.productDetails}>
                <View style={styles.detailRow}>
                  <Ionicons
                    name="barcode-outline"
                    size={16}
                    color="#6C757D"
                    style={styles.detailIcon}
                  />
                  <ThemedText style={styles.detailText}>
                    SKU (escanear): {product.sku}
                  </ThemedText>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons
                    name="cube-outline"
                    size={16}
                    color="#6C757D"
                    style={styles.detailIcon}
                  />
                  <ThemedText style={styles.detailText}>
                    Escaneados: {product.scannedCount}/{product.quantity}
                  </ThemedText>
                </View>
                <View style={styles.scanProgress}>
                  <View style={styles.scanProgressBar}>
                    <View
                      style={[
                        styles.scanProgressFill,
                        {
                          width: `${
                            (product.scannedCount / product.quantity) * 100
                          }%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </Animated.View>
          ))}
        </ScrollView>

        {/* Padding bottom */}
        <View style={{ paddingBottom: 50 }} />

        <View
          style={[
            styles.bottomContainer,
            { paddingBottom: 60 },
            isScanning && styles.bottomContainerHidden,
          ]}
        >
          {allProductsScanned ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeOrderButton]}
              onPress={handleCompleteOrder}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={24} color="white" />
              <ThemedText style={styles.buttonText}>
                Confirmar Pedido Completado
              </ThemedText>
            </TouchableOpacity>
          ) : (
            <Animated.View style={buttonAnimStyle}>
              <TouchableOpacity
                style={[styles.actionButton, styles.scanButton]}
                onPress={openDrawer}
                activeOpacity={0.8}
              >
                <Ionicons name="scan-outline" size={24} color="white" />
                <ThemedText style={styles.buttonText}>
                  Comenzar a Escanear Productos
                </ThemedText>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>

        <RNAnimated.View
          style={[
            styles.drawer,
            {
              transform: [{ translateY: drawerAnim }],
              backgroundColor: "#FFFFFF",
            },
          ]}
        >
          <View style={styles.drawerHeader}>
            <TouchableOpacity onPress={closeDrawer} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#0066CC" />
            </TouchableOpacity>
            <ThemedText style={styles.drawerTitle}>Escanear Código</ThemedText>
          </View>

          {/* Pending Items List */}
          {isScanning && currentOrder && (
            <View
              style={[
                styles.pendingItemsContainer,
                { borderBottomColor: "#E9ECEF", backgroundColor: "#F8F9FA" },
              ]}
            >
              <View style={styles.pendingItemsHeader}>
                <Ionicons name="list-outline" size={18} color="#6C757D" />
                <ThemedText
                  type="defaultSemiBold"
                  style={styles.pendingItemsTitle}
                >
                  Productos pendientes por escanear:
                </ThemedText>
              </View>

              {currentOrder.products.filter(
                (product) => product.scannedCount < product.quantity
              ).length === 0 ? (
                <View style={styles.allScannedContainer}>
                  <Ionicons name="checkmark-circle" size={24} color="#28A745" />
                  <ThemedText
                    style={[styles.allScannedText, { color: "#28A745" }]}
                  >
                    ¡Todos los productos han sido escaneados!
                  </ThemedText>
                </View>
              ) : (
                <ScrollView
                  style={styles.pendingItemsList}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.pendingItemsScroll}
                >
                  {currentOrder.products
                    .filter(
                      (product) => product.scannedCount < product.quantity
                    )
                    .map((product) => (
                      <View
                        key={product.id}
                        style={[
                          styles.pendingItemCard,
                          {
                            backgroundColor: "#FFFFFF",
                            borderColor: "#E9ECEF",
                          },
                          product.id === lastScannedProductId && {
                            borderColor: "#0066CC",
                            backgroundColor: "#F0F7FF",
                            transform: [{ scale: 1.02 }],
                          },
                        ]}
                      >
                        <View style={styles.pendingItemTop}>
                          <ThemedText
                            style={[
                              styles.pendingItemName,
                              {
                                color: "#333333",
                                fontWeight: "600",
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {product.name}
                          </ThemedText>
                          <View
                            style={[
                              styles.pendingItemQuantity,
                              { backgroundColor: "#0066CC" },
                            ]}
                          >
                            <ThemedText style={styles.pendingItemQuantityText}>
                              {product.quantity - product.scannedCount}
                            </ThemedText>
                          </View>
                        </View>
                        <View style={styles.pendingItemBottom}>
                          <View style={styles.pendingItemSku}>
                            <Ionicons
                              name="barcode-outline"
                              size={14}
                              color="#6C757D"
                              style={styles.pendingItemSkuIcon}
                            />
                            <ThemedText
                              style={[
                                styles.pendingItemSkuText,
                                { color: "#6C757D" },
                              ]}
                            >
                              SKU: {product.sku}
                            </ThemedText>
                          </View>
                          <ThemedText
                            style={[
                              styles.pendingItemProgress,
                              { color: "#6C757D" },
                            ]}
                          >
                            {product.scannedCount}/{product.quantity}
                          </ThemedText>
                        </View>
                      </View>
                    ))}
                </ScrollView>
              )}
            </View>
          )}

          {isScanning && permission?.granted && (
            <View style={styles.cameraContainer}>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: [
                    "qr",
                    "pdf417",
                    "aztec",
                    "code128",
                    "code39",
                    "ean13",
                    "upc_e",
                  ],
                }}
                onBarcodeScanned={
                  scanned || isInCooldown ? undefined : handleBarCodeScanned
                }
              />
              <View style={styles.overlay}>
                <AnimatedScanFrame
                  isInCooldown={isInCooldown}
                  scanFrameColorAnim={scanFrameColorAnim}
                  scanLoadingAnim={scanLoadingAnim}
                />
                <ThemedText style={styles.scanText}>
                  {isInCooldown
                    ? "Procesando código escaneado..."
                    : "Posiciona el código de barras dentro del marco"}
                </ThemedText>
              </View>
              {scanned && !isInCooldown && (
                <TouchableOpacity
                  style={styles.rescanButton}
                  onPress={handleRescan}
                >
                  <ThemedText style={styles.rescanText}>
                    Tocar para escanear otro producto
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
          )}
        </RNAnimated.View>

        {/* Modal personalizado */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor:
                    modalType === "success"
                      ? colors.successBg
                      : colors.warningBg,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.modalText,
                  {
                    color:
                      modalType === "success" ? colors.success : colors.warning,
                  },
                ]}
              >
                {modalMessage}
              </ThemedText>
            </View>
          </View>
        </Modal>
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
    padding: 0,
  },
  backText: {
    fontSize: 17,
    fontWeight: "600",
    marginLeft: 8,
    color: "#0066CC",
  },
  content: {
    flex: 1,
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  orderInfo: {
    marginBottom: 24,
  },
  orderId: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    color: "#000000",
  },
  orderDetails: {
    marginTop: 12,
    gap: 4,
  },
  detailText: {
    fontSize: 15,
    color: "#000000",
  },
  progressContainer: {
    gap: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E9ECEF",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#0066CC",
  },
  progressText: {
    fontSize: 14,
    color: "#6C757D",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#000000",
  },
  productItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    backgroundColor: "#FFFFFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productItemScanned: {
    borderColor: "#28A745",
    backgroundColor: "#D4EDDA",
  },
  productHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginRight: 12,
    color: "#000000",
  },
  productDetails: {
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgePending: {
    backgroundColor: "#FFF3CD",
  },
  statusBadgeSuccess: {
    backgroundColor: "#D4EDDA",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  statusTextPending: {
    color: "#856404",
  },
  statusTextSuccess: {
    color: "#28A745",
  },
  scanProgress: {
    marginTop: 8,
  },
  scanProgressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E9ECEF",
    overflow: "hidden",
  },
  scanProgressFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: "#0066CC",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E9ECEF",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
    zIndex: 999,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  scanButton: {
    backgroundColor: "#0066CC",
  },
  completeOrderButton: {
    backgroundColor: "#28A745",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  drawer: {
    position: "absolute",
    left: 0,
    right: 0,
    height: DRAWER_HEIGHT,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    backgroundColor: "#FFFFFF",
  },
  closeButton: {
    marginRight: 16,
  },
  cameraContainer: {
    flex: 1,
    position: "relative",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    marginBottom: 100,
    borderColor: "#007AFF",
    backgroundColor: "transparent",
    position: "relative",
    overflow: "hidden",
    borderRadius: 8,
  },
  scanText: {
    color: "white",
    marginTop: 20,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  rescanButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  rescanText: {
    color: "white",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    margin: 20,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxWidth: "80%",
  },
  modalText: {
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
  },
  scanLoadingBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 4,
    backgroundColor: "#FF9500",
  },
  pendingItemsContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    maxHeight: 180,
    backgroundColor: "#F8F9FA",
  },
  pendingItemsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  pendingItemsTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  pendingItemsList: {
    maxHeight: 130,
  },
  pendingItemsScroll: {
    paddingRight: 4,
    paddingBottom: 4,
  },
  pendingItemCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  pendingItemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  pendingItemBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pendingItemName: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  pendingItemSku: {
    flexDirection: "row",
    alignItems: "center",
  },
  pendingItemSkuIcon: {
    marginRight: 4,
  },
  pendingItemSkuText: {
    fontSize: 13,
  },
  pendingItemProgress: {
    fontSize: 13,
  },
  pendingItemQuantity: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  pendingItemQuantityText: {
    color: "white",
    fontSize: 13,
    fontWeight: "bold",
  },
  allScannedContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  allScannedText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
  },
  headerButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginLeft: 10,
  },
  errorText: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    color: "#FF3B30",
  },
  errorSubtext: {
    fontSize: 16,
    textAlign: "center",
    marginVertical: 16,
    color: "#6C757D",
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0066CC",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionCount: {
    fontSize: 16,
    color: "#6C757D",
    fontWeight: "500",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailIcon: {
    marginRight: 8,
  },
  lastScannedProduct: {
    borderColor: "#0066CC",
    borderWidth: 2,
    transform: [{ scale: 1.02 }],
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000000",
    marginLeft: 10,
  },
  noOrderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  bottomContainerHidden: {
    opacity: 0,
    transform: [{ translateY: 100 }],
  },
  clientSection: {
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E9ECEF",
    padding: 16,
  },
  clientHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  clientTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginLeft: 8,
  },
  clientDetails: {
    gap: 8,
  },
});
