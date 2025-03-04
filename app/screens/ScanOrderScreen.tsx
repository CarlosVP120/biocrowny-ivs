import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  useColorScheme,
  Modal,
  Easing,
  SafeAreaView,
  StatusBar,
  Platform,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_HEIGHT = Dimensions.get("window").height;
const DRAWER_HEIGHT = SCREEN_HEIGHT * 0.90;

export default function ScanOrderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [currentOrder, setCurrentOrder] = useState<Order | undefined>(
    dummyOrders.find((order) => order.id === id)
  );
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

  // Animación del drawer
  const drawerAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Animaciones para el cooldown del escáner
  const scanFrameColorAnim = useRef(new Animated.Value(0)).current;
  const scanLoadingAnim = useRef(new Animated.Value(0)).current;

  // Efecto para la animación de carga durante el cooldown
  useEffect(() => {
    if (isInCooldown) {
      // Animar el color del marco a naranja
      Animated.timing(scanFrameColorAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();

      // Animar la barra de carga
      Animated.timing(scanLoadingAnim, {
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

  const insets = useSafeAreaInsets();

  const openDrawer = async () => {
    if (!permission?.granted) {
      const permissionResult = await requestPermission();
      if (!permissionResult.granted) {
        alert("Se necesita permiso para acceder a la cámara");
        return;
      }
    }
    setScanned(false);
    setIsScanning(true);
    Animated.spring(drawerAnim, {
      toValue: SCREEN_HEIGHT - DRAWER_HEIGHT,
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = () => {
    Animated.spring(drawerAnim, {
      toValue: SCREEN_HEIGHT,
      useNativeDriver: true,
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
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);

    // Auto cerrar el modal después de 2 segundos
    setTimeout(() => {
      setModalVisible(false);
      if (type === "success") {
        // Verificar si todos los productos han sido escaneados
        const allScanned = currentOrder?.products.every((p) => p.scanned);
        if (allScanned) {
          setAllProductsScanned(true);
          // Redirigir a la pantalla del código QR después de un breve retraso
          setTimeout(() => {
            if (currentOrder) {
              router.push(`/order-completed/${currentOrder.id}`);
            }
          }, 500);
        }
      }
    }, 2000);
  };

  const handleBarCodeScanned = (scanningResult: BarcodeScanningResult) => {
    if (scanned || isInCooldown || !currentOrder) return;

    const { data } = scanningResult;
    console.log("Código escaneado:", data);

    const productToUpdate = currentOrder.products.find((product) => {
      console.log("Comparando SKU:", product.sku, "con código:", data);
      return product.sku === data && product.scannedCount < product.quantity;
    });

    if (productToUpdate) {
      // Set the last scanned product ID for highlighting
      setLastScannedProductId(productToUpdate.id);

      // Clear the highlight after the cooldown period
      setTimeout(() => {
        setLastScannedProductId(null);
      }, 2000);

      const updatedOrder = {
        ...currentOrder,
        products: currentOrder.products.map((product) =>
          product.id === productToUpdate.id
            ? {
                ...product,
                scannedCount: product.scannedCount + 1,
                scanned: product.scannedCount + 1 === product.quantity,
              }
            : product
        ),
      };

      setCurrentOrder(updatedOrder);
      const { orders, setOrders } = useOrdersStore.getState();
      setOrders(
        orders.map((order) =>
          order.id === currentOrder.id ? updatedOrder : order
        )
      );

      setScanned(true);
      setIsInCooldown(true);

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

      // Verificar si todos los productos han sido escaneados completamente
      const allProductsComplete = updatedOrder.products.every(
        (p) => p.scannedCount === p.quantity
      );

      if (allProductsComplete) {
        setTimeout(() => {
          showModal("¡Todos los productos han sido escaneados!");
          setAllProductsScanned(true);
          setTimeout(() => {
            closeDrawer();
          }, 1500);
        }, 500);
      }
    } else {
      const isProductComplete = currentOrder.products.find(
        (product) =>
          product.sku === data && product.scannedCount >= product.quantity
      );

      if (isProductComplete) {
        setScanned(true);
        setIsInCooldown(true);
        showModal(
          `El producto "${isProductComplete.name}" ya fue escaneado completamente`,
          "error"
        );
      } else {
        setScanned(true);
        setIsInCooldown(true);
        showModal(
          `Código "${data}" no corresponde a ningún producto del pedido`,
          "error"
        );
      }
    }
  };

  // Función para reiniciar el escaneo
  const handleRescan = () => {
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

  console.log("Order ID:", id); // Para debugging
  console.log("Current Order:", currentOrder); // Para debugging

  if (!currentOrder) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Pedido no encontrado</ThemedText>
      </ThemedView>
    );
  }

  const scannedProducts = currentOrder.products.filter((p) => p.scanned).length;
  const progress = (scannedProducts / currentOrder.products.length) * 100;

  const isDark = colorScheme === "dark";
  const colors = {
    background: isDark ? "#1A1A1A" : "white",
    card: isDark ? "#2D2D2D" : "white",
    text: isDark ? "#FFFFFF" : "#000000",
    border: isDark ? "#404040" : "#DEE2E6",
    primary: "#007AFF",
    success: isDark ? "#2EA043" : "#28A745",
    warning: isDark ? "#9E6A03" : "#856404",
    warningBg: isDark ? "#3D2E08" : "#FFF3CD",
    successBg: isDark ? "#132E1A" : "#D4EDDA",
    orange: "#FF9500",
  };

  // Interpolación de colores para el marco de escaneo
  const scanFrameBorderColor = scanFrameColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.primary, colors.orange],
  });

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.background} />
      <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
            <ThemedText style={[styles.backText, { color: colors.primary }]}>Volver</ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 140 }}
        >
          <View style={styles.orderInfo}>
            <ThemedText style={styles.orderId}>Pedido: {currentOrder.id}</ThemedText>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors.primary }]} />
              </View>
              <ThemedText style={[styles.progressText, { color: colors.text }]}>
                {scannedProducts} de {currentOrder.products.length} productos escaneados
              </ThemedText>
            </View>
            <View style={styles.orderDetails}>
              <ThemedText style={{ color: colors.text }}>📦 Almacén: {currentOrder.warehouse}</ThemedText>
              <ThemedText style={{ color: colors.text }}>
                📅 Fecha estimada: {currentOrder.estimatedDate}
              </ThemedText>
            </View>
          </View>

          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
            Productos a escanear
          </ThemedText>

          {currentOrder.products.map((product) => (
            <View
              key={product.id}
              style={[
                styles.productItem,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
                product.scanned && {
                  borderColor: colors.success,
                  backgroundColor: colors.successBg,
                },
              ]}
            >
              <View style={styles.productHeader}>
                <ThemedText
                  style={[styles.productName, { color: colors.text }]}
                >
                  {product.name}
                </ThemedText>
                <View
                  style={[
                    styles.statusBadge,
                    product.scanned
                      ? { backgroundColor: colors.successBg }
                      : { backgroundColor: colors.warningBg },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.statusText,
                      {
                        color: product.scanned
                          ? colors.success
                          : colors.warning,
                      },
                    ]}
                  >
                    {product.scanned ? "✅ Escaneado" : "⏳ Pendiente"}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.productDetails}>
                <ThemedText style={{ color: colors.text }}>🏷️ SKU (escanear): {product.sku}</ThemedText>
                <ThemedText style={{ color: colors.text }}>
                  📦 Escaneados: {product.scannedCount}/{product.quantity}
                </ThemedText>
                <View style={styles.scanProgress}>
                  <View style={[styles.scanProgressBar, { backgroundColor: isDark ? '#333' : '#E9ECEF' }]}>
                    <View
                      style={[
                        styles.scanProgressFill,
                        {
                          width: `${
                            (product.scannedCount / product.quantity) * 100
                          }%`,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={[
          styles.bottomContainer, 
          { 
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 30
          }
        ]}>
          {allProductsScanned ? (
            <TouchableOpacity
              style={[styles.completeOrderButton, { backgroundColor: colors.success }]}
              onPress={handleCompleteOrder}
            >
              <Ionicons name="checkmark-circle" size={24} color="white" />
              <ThemedText style={styles.buttonText}>
                Confirmar Pedido Completado
              </ThemedText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.scanButton, { backgroundColor: colors.primary }]}
              onPress={openDrawer}
            >
              <Ionicons name="scan-outline" size={24} color="white" />
              <ThemedText style={styles.buttonText}>
                Comenzar a Escanear Productos
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>

        <Animated.View
          style={[
            styles.drawer,
            {
              transform: [{ translateY: drawerAnim }],
              backgroundColor: colors.background,
            },
          ]}
        >
          <View
            style={[styles.drawerHeader, { borderBottomColor: colors.border }]}
          >
            <TouchableOpacity onPress={closeDrawer} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.primary} />
            </TouchableOpacity>
            <ThemedText type="subtitle">Escanear Código</ThemedText>
          </View>

          {/* Pending Items List */}
          {isScanning && currentOrder && (
            <View
              style={[
                styles.pendingItemsContainer,
                { borderBottomColor: colors.border },
              ]}
            >
              <View style={styles.pendingItemsHeader}>
                <Ionicons
                  name="list-outline"
                  size={18}
                  color={isDark ? colors.text : "#6C757D"}
                />
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
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={colors.success}
                  />
                  <ThemedText
                    style={[styles.allScannedText, { color: colors.success }]}
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
                    .filter((product) => product.scannedCount < product.quantity)
                    .map((product) => (
                      <View
                        key={product.id}
                        style={[
                          styles.pendingItemCard,
                          {
                            backgroundColor: isDark
                              ? colors.card
                              : colors.background,
                            borderColor: colors.border,
                          },
                          product.id === lastScannedProductId && {
                            borderColor: colors.primary,
                            backgroundColor: isDark
                              ? `${colors.primary}20`
                              : `${colors.primary}10`,
                            transform: [{ scale: 1.02 }],
                          },
                        ]}
                      >
                        <View style={styles.pendingItemTop}>
                          <ThemedText
                            style={[
                              styles.pendingItemName,
                              {
                                color: isDark ? colors.text : "#333333",
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
                              { backgroundColor: colors.primary },
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
                              color={isDark ? colors.text : "#6C757D"}
                              style={styles.pendingItemSkuIcon}
                            />
                            <ThemedText
                              style={[
                                styles.pendingItemSkuText,
                                { color: isDark ? "#BBBBBB" : "#6C757D" },
                              ]}
                            >
                              SKU: {product.sku}
                            </ThemedText>
                          </View>
                          <ThemedText
                            style={[
                              styles.pendingItemProgress,
                              { color: isDark ? "#BBBBBB" : "#6C757D" },
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
                <Animated.View
                  style={[
                    styles.scanFrame,
                    { borderColor: scanFrameBorderColor },
                  ]}
                >
                  {isInCooldown && (
                    <Animated.View
                      style={[
                        styles.scanLoadingBar,
                        {
                          width: scanLoadingAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0%", "100%"],
                          }),
                          backgroundColor: colors.orange,
                        },
                      ]}
                    />
                  )}
                </Animated.View>
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
        </Animated.View>

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
                    modalType === "success" ? colors.successBg : colors.warningBg,
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
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backText: {
    fontSize: 17,
    fontWeight: '600',
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  orderInfo: {
    marginBottom: 24,
  },
  orderId: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    marginTop: 10,
  },
  orderDetails: {
    marginTop: 12,
    gap: 4,
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
  },
  progressText: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  productItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  },
  productDetails: {
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  scanProgress: {
    marginTop: 8,
  },
  scanProgressBar: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  scanProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  completeOrderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 12,
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
    backgroundColor: "white",
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
    borderColor: "#007AFF",
    backgroundColor: "transparent",
    position: "relative",
    overflow: "hidden",
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
    maxHeight: 180, // Reduced height to ensure camera is more visible
  },
  pendingItemsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  pendingItemsTitle: {
    marginLeft: 8,
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
});
