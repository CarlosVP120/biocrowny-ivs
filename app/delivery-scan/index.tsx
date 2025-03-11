import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Animated,
  AppState,
} from "react-native";
import { useRouter } from "expo-router";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useOrdersStore } from "../store/orderStore";
import { useClientsStore } from "../store/clientStore";
import {
  CameraView,
  useCameraPermissions,
  BarcodeScanningResult,
} from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { sendOrderStatusNotificationWithFallback } from "../lib/twilioService";

export default function DeliveryScanScreen() {
  const qrLock = useRef(false);
  const appState = useRef(AppState.currentState);
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanCount, setScanCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const cooldownTimer = useRef<NodeJS.Timeout | null>(null);
  const scanAnimation = useRef(new Animated.Value(0)).current;
  const { orders, setOrders } = useOrdersStore();
  const { getClientById } = useClientsStore();

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
      if (cooldownTimer.current) {
        clearTimeout(cooldownTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    (async () => {
      const cameraPermission = await requestPermission();
      if (!cameraPermission.granted) {
        Alert.alert(
          "Permiso requerido",
          "Se necesita permiso para acceder a la cámara"
        );
      }
    })();
  }, []);

  // Animation for the cooldown
  useEffect(() => {
    if (cooldown) {
      // Reset and start animation
      scanAnimation.setValue(0);
      Animated.timing(scanAnimation, {
        toValue: 1,
        duration: 3000, // Match this with the cooldown time
        useNativeDriver: false,
      }).start();
    }
  }, [cooldown, scanAnimation]);

  const activateCooldown = () => {
    setCooldown(true);
    qrLock.current = true;

    if (cooldownTimer.current) {
      clearTimeout(cooldownTimer.current);
    }

    cooldownTimer.current = setTimeout(() => {
      setCooldown(false);
      setScanned(false);
      qrLock.current = false;
    }, 3000); // 3 seconds cooldown
  };

  const handleBarCodeScanned = async (
    scanningResult: BarcodeScanningResult
  ) => {
    // Prevent scanning if already locked or processing
    if (qrLock.current || loading) {
      console.log("Scan blocked:", {
        qrLocked: qrLock.current,
        loading,
        cooldown,
      });
      return;
    }

    // Immediately lock scanning
    qrLock.current = true;
    setScanned(true);
    setLoading(true);

    try {
      const { data } = scanningResult;

      // Verificar si el código escaneado tiene el formato correcto (order:ID)
      if (!data.startsWith("order:")) {
        await new Promise<void>((resolve) => {
          Alert.alert("Error", "Código QR inválido", [
            { text: "OK", onPress: () => resolve() },
          ]);
        });
        activateCooldown();
        return;
      }

      const orderId = data.split(":")[1];
      const order = orders.find((o) => o.id === orderId);

      if (!order) {
        await new Promise<void>((resolve) => {
          Alert.alert("Error", "Pedido no encontrado", [
            { text: "OK", onPress: () => resolve() },
          ]);
        });
        activateCooldown();
        return;
      }

      // Actualizar el contador de escaneos para este pedido
      const currentCount = scanCount[orderId] || 0;
      const newCount = currentCount + 1;
      setScanCount({ ...scanCount, [orderId]: newCount });

      if (newCount === 1) {
        // Primera lectura: Notificar al cliente que su pedido está en camino
        await sendDeliveryNotification(order, "en_camino");
        await new Promise<void>((resolve) => {
          Alert.alert(
            "Éxito",
            `Se ha notificado al cliente que su pedido ${orderId} está en camino`,
            [{ text: "OK", onPress: () => resolve() }]
          );
        });
        activateCooldown();
      } else if (newCount === 2) {
        // Segunda lectura: Notificar al cliente que su pedido está en la puerta
        await sendDeliveryNotification(order, "en_puerta");
        router.push(`/delivery-status/${orderId}`);
      } else {
        await new Promise<void>((resolve) => {
          Alert.alert("Error", "Este QR ya ha sido escaneado dos veces", [
            { text: "OK", onPress: () => resolve() },
          ]);
        });
        activateCooldown();
      }
    } catch (error) {
      console.error("Error al escanear:", error);
      await new Promise<void>((resolve) => {
        Alert.alert("Error", "Hubo un problema al procesar el código QR", [
          { text: "OK", onPress: () => resolve() },
        ]);
      });
      activateCooldown();
    } finally {
      setLoading(false);
    }
  };

  // Función para enviar notificación al cliente
  const sendDeliveryNotification = async (
    order: any,
    status: "en_camino" | "en_puerta" | "entregado"
  ) => {
    try {
      // Obtener la información del cliente
      const client = getClientById(order.clientId);

      if (!client) {
        console.error(`Cliente no encontrado para el pedido ${order.id}`);
        return false;
      }

      console.log(
        `Intentando enviar SMS a ${client.name} (${client.phone}) para pedido ${order.id}`
      );

      // Enviar SMS usando Twilio con fallback a SMS del dispositivo si falla
      const smsSent = await sendOrderStatusNotificationWithFallback(
        client,
        order,
        status
      );

      if (smsSent) {
        console.log(
          `✅ SMS enviado exitosamente al cliente ${client.name} (${client.phone})`
        );
        // También podríamos registrar esto en analytics o en un log en la base de datos
      } else {
        console.warn(
          `❌ No se pudo enviar SMS al cliente ${client.name} (${client.phone})`
        );
        // Aquí podríamos implementar un sistema de reintentos o notificar al personal
      }

      return smsSent;
    } catch (error) {
      console.error("Error al enviar notificación:", error);
      // En un entorno de producción, aquí deberíamos registrar el error en un servicio como Sentry
      return false;
    }
  };

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <ThemedText style={styles.text}>
            Se requiere acceso a la cámara
          </ThemedText>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <ThemedText style={styles.buttonText}>Solicitar permiso</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <ThemedText style={styles.title}>Escanear para entrega</ThemedText>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
            <ThemedText style={styles.loadingText}>Procesando...</ThemedText>
          </View>
        ) : (
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              onBarcodeScanned={
                qrLock.current ? undefined : handleBarCodeScanned
              }
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
            >
              <View style={styles.scanFrameContainer}>
                <View
                  style={[
                    styles.scanFrame,
                    cooldown && styles.scanFrameCooldown,
                  ]}
                />

                {cooldown && (
                  <Animated.View
                    style={[
                      styles.cooldownOverlay,
                      {
                        opacity: scanAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.7, 0],
                        }),
                      },
                    ]}
                  >
                    <ThemedText style={styles.cooldownText}>
                      Enfriamiento...
                    </ThemedText>
                  </Animated.View>
                )}

                <ThemedText style={styles.scanInstructions}>
                  {cooldown
                    ? "Espere unos segundos antes de escanear otro código"
                    : "Coloca el código QR dentro del marco"}
                </ThemedText>
              </View>
            </CameraView>
          </View>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#ffffff",
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 12,
    color: "#000000",
  },
  text: {
    fontSize: 18,
    textAlign: "center",
    margin: 20,
  },
  cameraContainer: {
    flex: 1,
    overflow: "hidden",
  },
  camera: {
    flex: 1,
  },
  scanFrameContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: "#0066CC",
    backgroundColor: "transparent",
  },
  scanFrameCooldown: {
    borderColor: "#FFA500",
  },
  cooldownOverlay: {
    position: "absolute",
    width: 250,
    height: 250,
    backgroundColor: "#FFA500",
    justifyContent: "center",
    alignItems: "center",
  },
  cooldownText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  scanInstructions: {
    position: "absolute",
    bottom: 100,
    textAlign: "center",
    fontSize: 16,
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 10,
    borderRadius: 5,
  },
  button: {
    backgroundColor: "#0066CC",
    padding: 15,
    borderRadius: 8,
    alignSelf: "center",
    margin: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
});
