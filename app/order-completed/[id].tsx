import React, { useEffect } from "react";
import { StyleSheet, View, TouchableOpacity, Alert, SafeAreaView, StatusBar, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useOrdersStore } from "../store/orderStore";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

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
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>Cargando...</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

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
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <Animated.View 
            style={styles.titleContainer}
            entering={FadeInDown.delay(300).duration(800)}
          >
            <Ionicons name="checkmark-circle" size={48} color="#28A745" style={styles.successIcon} />
            <ThemedText style={styles.title}>Pedido Completado</ThemedText>
            <ThemedText style={styles.orderLabel}>Pedido: {order.id}</ThemedText>
          </Animated.View>

          <Animated.View 
            style={styles.qrContainer}
            entering={FadeInDown.delay(500).duration(800)}
          >
            <ThemedText style={styles.instructions}>
              Escanea este código QR en el momento de entregar el pedido
            </ThemedText>
            
            <View style={styles.qrWrapper}>
              <QRCode
                value={`order:${order.id}`}
                size={200}
                color="#000"
                backgroundColor="#fff"
              />
            </View>
            
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.stepBadge}>
                  <ThemedText style={styles.stepNumber}>1</ThemedText>
                </View>
                <ThemedText style={styles.scanInfo}>
                  Primera lectura: Notificar al cliente que su pedido está en camino
                </ThemedText>
              </View>
              
              <View style={styles.infoRow}>
                <View style={styles.stepBadge}>
                  <ThemedText style={styles.stepNumber}>2</ThemedText>
                </View>
                <ThemedText style={styles.scanInfo}>
                  Segunda lectura: Notificar al cliente que su pedido está en la puerta
                </ThemedText>
              </View>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(700).duration(800)}
            style={styles.buttonContainer}
          >
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push('/(tabs)')}
              activeOpacity={0.8}
            >
              <Ionicons name="home-outline" size={20} color="#fff" style={styles.buttonIcon} />
              <ThemedText style={styles.buttonText}>Volver al inicio</ThemedText>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    fontSize: 18,
    color: "#666666",
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
  scrollView: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  titleContainer: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 24,
  },
  successIcon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000000",
    textAlign: "center",
    marginBottom: 8,
  },
  orderLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666666",
  },
  qrContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  instructions: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    color: "#000000",
  },
  qrWrapper: {
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  infoCard: {
    width: '100%',
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0066CC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  stepNumber: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
  scanInfo: {
    fontSize: 14,
    color: "#000000",
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 32,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#0066CC",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
}); 