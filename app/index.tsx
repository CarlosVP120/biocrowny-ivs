import { StyleSheet, Text, View, TouchableOpacity, Image, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function Page() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        style={styles.gradient}
      >
        <View style={styles.main}>
          <Animated.Image
            entering={FadeIn.delay(200).duration(1000)}
            source={require('../assets/images/biocrowny-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          
          <Animated.View
            entering={FadeInDown.delay(500).duration(1000)}
            style={styles.textContainer}
          >
            <Text style={styles.title}>Bienvenido</Text>
            <Text style={styles.subtitle}>Sistema de Gestión de Entregas</Text>
          </Animated.View>

          <View style={styles.buttonContainer}>
            <Animated.View
              entering={FadeInUp.delay(800).duration(1000)}
            >
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton]}
                onPress={() => router.push('/(tabs)')}
              >
                <Text style={styles.buttonText}>Ir a la app principal</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              entering={FadeInUp.delay(1000).duration(1000)}
            >
              <TouchableOpacity 
                style={[styles.button, styles.secondaryButton]}
                onPress={() => router.push('/delivery-scan')}
              >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>Ir a Escaneo de Entregas</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  main: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  logo: {
    width: width * 0.6,
    height: width * 0.3,
    marginBottom: 40,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
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
