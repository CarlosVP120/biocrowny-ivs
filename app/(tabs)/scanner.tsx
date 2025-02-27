import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, Button, Alert } from "react-native";
import {
  CameraView,
  useCameraPermissions,
  BarcodeScanningResult,
} from "expo-camera";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

// Import Firebase from our lib folder
import { db, auth } from '../../lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();

  const handleBarCodeScanned = async (scanningResult: BarcodeScanningResult) => {
    if (scanned) return;

    setScanned(true);
    const { type, data } = scanningResult;

    try {
      // Use the Firebase JS SDK syntax
      const docRef = doc(db, 'barcodes', data);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        // Document exists, safe to use data
        console.log('Document data:', docSnap.data());
        Alert.alert(
          "Barcode Found", 
          `Found barcode: ${data}\nData: ${JSON.stringify(docSnap.data())}`, 
          [
            {
              text: "Scan Again",
              onPress: () => setScanned(false),
            },
            {
              text: "OK",
              onPress: () => console.log("OK Pressed"),
            },
          ]
        );
      } else {
        // Handle the case where document doesn't exist
        console.log('No such document!');
        Alert.alert(
          "Barcode Not Found", 
          `Barcode ${data} not found in database`, 
          [
            {
              text: "Scan Again",
              onPress: () => setScanned(false),
            },
            {
              text: "OK",
              onPress: () => console.log("OK Pressed"),
            },
          ]
        );
      }
    } catch (error: unknown) {
      console.log('Error getting document:', error);
      const errorMessage = error instanceof FirebaseError 
        ? error.message 
        : 'Unknown error occurred';
      Alert.alert(
        "Error", 
        `Error scanning barcode: ${errorMessage}`, 
        [
          {
            text: "Scan Again",
            onPress: () => setScanned(false),
          },
          {
            text: "OK",
            onPress: () => console.log("OK Pressed"),
          },
        ]
      );
    }
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
              color="#4CAF50"
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
  statusContainer: {
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    zIndex: 10,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
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
