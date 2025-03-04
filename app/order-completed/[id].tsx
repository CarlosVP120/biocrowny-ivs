import React, { useEffect } from "react";
import { StyleSheet, View, TouchableOpacity, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useOrdersStore } from "../store/orderStore";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";

export default function OrderCompletedScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { orders } = useOrdersStore();
  const order = orders.find((o) => o.id === id);

  useEffect(() => {
    // Verificar que exista el pedido
    if (!order) {
      Alert.alert("Error", "Pedido no encontrado");
      router.back();
    }
  }, [order, router]);

  if (!order) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Cargando...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <ThemedText style={styles.title}>Pedido Completado</ThemedText>
      </View>

      <View style={styles.qrContainer}>
        <ThemedText style={styles.orderLabel}>Pedido: {order.id}</ThemedText>
        <ThemedText style={styles.instructions}>
          Escanea este código QR en el momento de entregar el pedido.
        </ThemedText>
        
        <View style={styles.qrWrapper}>
          <QRCode
            value={`order:${order.id}`}
            size={250}
            color="#000"
            backgroundColor="#fff"
          />
        </View>
        
        <ThemedText style={styles.scanInfo}>
          Primera lectura: Notificar al cliente que su pedido está en camino.
        </ThemedText>
        <ThemedText style={styles.scanInfo}>
          Segunda lectura: Notificar al cliente que su pedido está en la puerta.
        </ThemedText>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/(tabs)')}
      >
        <ThemedText style={styles.buttonText}>Volver al inicio</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  backButton: {
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginLeft: 10,
  },
  qrContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  orderLabel: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  instructions: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
  },
  qrWrapper: {
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 30,
  },
  scanInfo: {
    fontSize: 14,
    marginVertical: 5,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#0066CC",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
}); 