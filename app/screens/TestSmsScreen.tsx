import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Ionicons } from "@expo/vector-icons";
import {
  testTwilioIntegration,
  sendOrderStatusNotificationWithFallback,
} from "../lib/twilioService";
import { useClientsStore } from "../store/clientStore";
import { useOrdersStore } from "../store/orderStore";

export default function TestSmsScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("+523319766821");
  const [loading, setLoading] = useState(false);
  const { clients } = useClientsStore();
  const { orders } = useOrdersStore();

  const handleTestSms = async () => {
    setLoading(true);
    try {
      const success = await testTwilioIntegration(phoneNumber);
      if (success) {
        Alert.alert("Success", "Test SMS sent successfully!");
      } else {
        Alert.alert(
          "Error",
          "Failed to send test SMS. Check logs for details."
        );
      }
    } catch (error) {
      console.error("Error testing SMS:", error);
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleTestOrderNotification = async () => {
    setLoading(true);
    try {
      // Use the first client and order as test
      const client = clients[0];
      const order = orders[0];

      if (!client || !order) {
        Alert.alert("Error", "No clients or orders available for testing");
        return;
      }

      const success = await sendOrderStatusNotificationWithFallback(
        client,
        order,
        "en_camino"
      );

      if (success) {
        Alert.alert("Success", `Order notification sent to ${client.name}!`);
      } else {
        Alert.alert(
          "Error",
          "Failed to send order notification. Check logs for details."
        );
      }
    } catch (error) {
      console.error("Error testing order notification:", error);
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <ThemedText style={styles.title}>Test SMS Functionality</ThemedText>
        </View>

        <View style={styles.content}>
          <ThemedText style={styles.sectionTitle}>
            Test Twilio Integration
          </ThemedText>

          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Phone Number:</ThemedText>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Enter phone number with country code"
              keyboardType="phone-pad"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.disabledButton]}
            onPress={handleTestSms}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={20} color="#fff" />
                <ThemedText style={styles.buttonText}>Send Test SMS</ThemedText>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          <ThemedText style={styles.sectionTitle}>
            Test Order Notification
          </ThemedText>
          <ThemedText style={styles.description}>
            This will send a test order status notification to the first client
            in your database.
          </ThemedText>

          <TouchableOpacity
            style={[
              styles.button,
              styles.secondaryButton,
              loading && styles.disabledButton,
            ]}
            onPress={handleTestOrderNotification}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="notifications" size={20} color="#fff" />
                <ThemedText style={styles.buttonText}>
                  Send Order Notification
                </ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 8,
    marginBottom: 20,
  },
  secondaryButton: {
    backgroundColor: "#34C759",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: "#999999",
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 20,
  },
});
