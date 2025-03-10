import { StyleSheet, Text, View, TouchableOpacity, Image, Platform } from "react-native";
import { useRouter, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

export default function Page() {
  const router = useRouter();

  // Funciones de navegación simplificadas
  const goToMainApp = () => {
    router.push("/(tabs)");
  };

  const goToDeliveryScan = () => {
    router.push("/delivery-scan");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Animated.View 
          style={styles.main}
          entering={FadeIn.delay(200).duration(800)}
        >
          <Animated.Image
            entering={FadeIn.delay(300).duration(1000)}
            source={require('../assets/images/biocrowny-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          
          <Animated.View
            entering={FadeInDown.delay(500).duration(800)}
            style={styles.textContainer}
          >
            <Text style={styles.title}>Bienvenido</Text>
            <Text style={styles.subtitle}>Sistema de Gestión de Entregas</Text>
          </Animated.View>

          <View style={styles.buttonContainer}>
            <Animated.View
              entering={FadeInDown.delay(700).duration(800)}
            >
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton]}
                onPress={goToMainApp}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Ir a la app principal</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(900).duration(800)}
            >
              <TouchableOpacity 
                style={[styles.button, styles.secondaryButton]}
                onPress={goToDeliveryScan}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>Ir a Escaneo de Entregas</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>
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
    backgroundColor: "#FFFFFF",
  },
  main: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  logo: {
    width: 240,
    height: 120,
    marginBottom: 40,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 36,
    fontWeight: "700",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "#666666",
    textAlign: "center",
    maxWidth: '80%',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 320,
    gap: 16,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: "#0066CC",
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#0066CC",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  secondaryButtonText: {
    color: "#0066CC",
  },
});
