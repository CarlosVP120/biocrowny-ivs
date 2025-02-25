import React, { useState } from "react";
import { StyleSheet, Text, View, Button, Alert } from "react-native";
import {
  CameraView,
  useCameraPermissions,
  BarcodeScanningResult,
} from "expo-camera";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();

  const handleBarCodeScanned = (scanningResult: BarcodeScanningResult) => {
    if (scanned) return;

    setScanned(true);
    const { type, data } = scanningResult;

    Alert.alert("Barcode Scanned", `Barcode type: ${type}\nData: ${data}`, [
      {
        text: "Scan Again",
        onPress: () => setScanned(false),
      },
      {
        text: "OK",
        onPress: () => console.log("OK Pressed"),
      },
    ]);
  };

  if (!permission) {
    // Camera permissions are still loading
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
        <Button title="Request Permission" onPress={requestPermission} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.scannerContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
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
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
        {scanned && (
          <View style={styles.buttonContainer}>
            <Button
              title="Tap to Scan Again"
              onPress={() => setScanned(false)}
            />
          </View>
        )}
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Position the barcode within the frame to scan
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scannerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 50,
    width: "100%",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 10,
  },
  infoContainer: {
    padding: 20,
    alignItems: "center",
  },
  infoText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
  },
  text: {
    color: "white",
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },
});
