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

const SCREEN_HEIGHT = Dimensions.get("window").height;
const DRAWER_HEIGHT = SCREEN_HEIGHT * 0.7;

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
          closeDrawer();
        } else {
          setScanned(false);
        }
      } else {
        setScanned(false);
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
    const { orders, setOrders } = useOrdersStore.getState();
    // Actualizar el estado del pedido a completado
    setOrders(
      orders.map((order) =>
        order.id === currentOrder?.id
          ? { ...order, status: "completed" }
          : order
      )
    );
    router.back();
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
    <ThemedView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
          <ThemedText style={styles.backText}>Volver</ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.orderInfo}>
        <ThemedText type="title">Pedido: {currentOrder.id}</ThemedText>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <ThemedText style={styles.progressText}>
            {scannedProducts} de {currentOrder.products.length} productos
            escaneados
          </ThemedText>
        </View>
        <View style={styles.orderDetails}>
          <ThemedText>📦 Almacén: {currentOrder.warehouse}</ThemedText>
          <ThemedText>
            📅 Fecha estimada: {currentOrder.estimatedDate}
          </ThemedText>
        </View>
      </View>

      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Productos a escanear
      </ThemedText>

      <View
        style={[
          styles.scrollContainer,
          { marginBottom: allProductsScanned ? 150 : 0 },
        ]}
      >
        <ScrollView
          style={styles.productList}
          contentContainerStyle={styles.scrollContent}
        >
          {currentOrder.products.map((product) => (
            <TouchableOpacity
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
                  type="defaultSemiBold"
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
                <ThemedText>🏷️ SKU (escanear): {product.sku}</ThemedText>
                <ThemedText>
                  📦 Escaneados: {product.scannedCount}/{product.quantity}
                </ThemedText>
                <View style={styles.scanProgress}>
                  <View style={styles.scanProgressBar}>
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
            </TouchableOpacity>
          ))}

          <View style={styles.scanButtonContainer}>
            <TouchableOpacity
              style={[styles.scanButton, { backgroundColor: colors.primary }]}
              onPress={openDrawer}
            >
              <Ionicons name="scan-outline" size={32} color="white" />
              <ThemedText style={styles.scanButtonText}>
                Comenzar a Escanear Productos
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {allProductsScanned && (
        <View style={styles.completeOrderContainer}>
          <TouchableOpacity
            style={styles.completeOrderButton}
            onPress={handleCompleteOrder}
          >
            <Ionicons name="checkmark-circle" size={24} color="white" />
            <ThemedText style={styles.completeOrderText}>
              Confirmar Pedido Completado
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    color: "#007AFF",
    marginLeft: 8,
    fontSize: 16,
  },
  orderInfo: {
    marginBottom: 24,
    gap: 16,
  },
  orderDetails: {
    gap: 4,
  },
  progressContainer: {
    gap: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E9ECEF",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#28A745",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: "#6C757D",
  },
  sectionTitle: {
    marginBottom: 16,
  },
  productList: {
    flex: 1,
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
    marginBottom: 8,
  },
  productName: {
    flex: 1,
    marginRight: 8,
  },
  productDetails: {
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPending: {
    backgroundColor: "#FFF3CD",
  },
  statusScanned: {
    backgroundColor: "#D4EDDA",
  },
  statusText: {
    fontSize: 12,
  },
  scrollContent: {
    paddingBottom: 100, // Espacio para el botón
  },
  scanButtonContainer: {
    padding: 16,
    marginTop: 16,
  },
  scanButton: {
    backgroundColor: "#007AFF",
    padding: 20,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  scanButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
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
  scanProgress: {
    marginTop: 8,
  },
  scanProgressBar: {
    height: 4,
    backgroundColor: "#E9ECEF",
    borderRadius: 2,
    overflow: "hidden",
  },
  scanProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
  scrollContainer: {
    flex: 1,
  },
  completeOrderContainer: {
    position: "absolute",
    bottom: 90,
    left: 16,
    right: 16,
    paddingBottom: 16,
  },
  completeOrderButton: {
    backgroundColor: "#28A745",
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  completeOrderText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  scanLoadingBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    height: 4,
    backgroundColor: "#FF9500",
  },
});
