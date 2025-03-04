import React, { useState, useEffect } from "react";
import { StyleSheet, View, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useOrdersStore } from "../store/orderStore";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";

export default function DeliveryScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanCount, setScanCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const { orders, setOrders } = useOrdersStore();

  useEffect(() => {
    (async () => {
      const cameraPermission = await requestPermission();
      if (!cameraPermission.granted) {
        Alert.alert("Permiso requerido", "Se necesita permiso para acceder a la cámara");
      }
    })();
  }, []);

  const handleBarCodeScanned = async (scanningResult: BarcodeScanningResult) => {
    if (scanned) return;
    
    setScanned(true);
    try {
      const { data } = scanningResult;
      
      // Verificar si el código escaneado tiene el formato correcto (order:ID)
      if (!data.startsWith("order:")) {
        Alert.alert("Error", "Código QR inválido");
        setScanned(false);
        return;
      }
      
      const orderId = data.split(":")[1];
      const order = orders.find(o => o.id === orderId);
      
      if (!order) {
        Alert.alert("Error", "Pedido no encontrado");
        setScanned(false);
        return;
      }
      
      // Actualizar el contador de escaneos para este pedido
      const currentCount = scanCount[orderId] || 0;
      const newCount = currentCount + 1;
      setScanCount({ ...scanCount, [orderId]: newCount });
      
      setLoading(true);
      
      if (newCount === 1) {
        // Primera lectura: Notificar al cliente que su pedido está en camino
        await sendDeliveryNotification(order, "en_camino");
        Alert.alert(
          "Éxito", 
          `Se ha notificado al cliente que su pedido ${orderId} está en camino`,
          [{ text: "OK", onPress: () => setScanned(false) }]
        );
      } else if (newCount === 2) {
        // Segunda lectura: Notificar al cliente que su pedido está en la puerta
        await sendDeliveryNotification(order, "en_puerta");
        router.push(`/delivery-status/${orderId}`);
      } else {
        Alert.alert(
          "Error", 
          "Este QR ya ha sido escaneado dos veces",
          [{ text: "OK", onPress: () => setScanned(false) }]
        );
      }
    } catch (error) {
      console.error("Error al escanear:", error);
      Alert.alert("Error", "Hubo un problema al procesar el código QR");
    } finally {
      setLoading(false);
      setScanned(false);
    }
  };

  // Función para enviar notificación al cliente
  const sendDeliveryNotification = async (order: any, status: 'en_camino' | 'en_puerta') => {
    // Aquí implementaríamos la lógica real para enviar notificaciones
    // Por ahora solo simulamos una espera
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Notificación enviada al cliente: Pedido ${order.id} está ${status}`);
        resolve(true);
      }, 1500);
    });
  };

  if (!permission?.granted) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.text}>Se requiere acceso a la cámara</ThemedText>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <ThemedText style={styles.buttonText}>Solicitar permiso</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
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
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          >
            <View style={styles.scanFrameContainer}>
              <View style={styles.scanFrame} />
              <ThemedText style={styles.scanInstructions}>
                Coloca el código QR dentro del marco
              </ThemedText>
            </View>
          </CameraView>
        </View>
      )}
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