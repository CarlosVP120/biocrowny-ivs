import * as SMS from "expo-sms";
import { Client } from "./clients";
import { Order } from "./orders";
import { TWILIO_CONFIG } from "../config/twilio";
import { Platform } from "react-native";
import { Buffer } from "buffer";

/**
 * Base64 encode a string (compatible with React Native)
 * @param str String to encode
 * @returns Base64 encoded string
 */
const base64Encode = (str: string): string => {
  if (Platform.OS === "web") {
    return btoa(str);
  } else {
    // React Native implementation
    return Buffer.from(str, "binary").toString("base64");
  }
};

/**
 * Send an SMS message using Twilio REST API (compatible with React Native)
 * @param to Phone number to send the message to
 * @param body Message body
 * @returns Promise<boolean> True if the message was sent successfully
 */
export const sendTwilioSms = async (
  to: string,
  body: string
): Promise<boolean> => {
  try {
    // Twilio API endpoint for sending messages
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_CONFIG.ACCOUNT_SID}/Messages.json`;

    // Create the form data
    const formData = new URLSearchParams();
    formData.append("To", to);
    formData.append("From", TWILIO_CONFIG.PHONE_NUMBER);
    formData.append("Body", body);

    // Encode credentials for Basic Auth
    const credentials = base64Encode(
      `${TWILIO_CONFIG.ACCOUNT_SID}:${TWILIO_CONFIG.AUTH_TOKEN}`
    );

    // Make the API request
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: formData.toString(),
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`SMS sent with SID: ${result.sid}`);
      return true;
    } else {
      console.error("Twilio API error:", result.message);
      return false;
    }
  } catch (error) {
    console.error("Error sending Twilio SMS:", error);
    return false;
  }
};

/**
 * Fallback SMS function that uses the device's SMS capabilities
 * @param to Phone number to send to
 * @param body Message body
 * @returns Promise<boolean> True if successful
 */
export const sendDeviceSms = async (
  to: string,
  body: string
): Promise<boolean> => {
  try {
    const isAvailable = await SMS.isAvailableAsync();

    if (!isAvailable) {
      console.error("Device SMS is not available");
      return false;
    }

    // Use the device's SMS app
    const { result } = await SMS.sendSMSAsync([to], body);
    return result === "sent" || result === "unknown";
  } catch (error) {
    console.error("Error sending device SMS:", error);
    return false;
  }
};

/**
 * Send SMS with fallback options
 * @param to Phone number to send to
 * @param body Message body
 * @returns Promise<boolean> True if either method succeeded
 */
export const sendSmsWithFallback = async (
  to: string,
  body: string
): Promise<boolean> => {
  try {
    // First try to send via Twilio API
    const twilioResult = await sendTwilioSms(to, body);

    if (twilioResult) {
      return true;
    }

    // If Twilio fails, try to use the device's SMS capabilities
    console.log("Twilio failed, trying device SMS as fallback...");
    return await sendDeviceSms(to, body);
  } catch (error) {
    console.error("Error in SMS fallback:", error);
    return false;
  }
};

/**
 * Send an order status notification to a client
 * @param client The client to send the SMS to
 * @param order The order information
 * @param status The delivery status
 * @returns Promise<boolean> True if the message was sent successfully
 */
export const sendOrderStatusNotification = async (
  client: Client,
  order: Order,
  status: "en_camino" | "en_puerta" | "entregado"
): Promise<boolean> => {
  try {
    // Create message based on status
    let messageBody = "";
    if (status === "en_camino") {
      messageBody = `Hola ${client.name}, su pedido #${order.id} está en camino y llegará pronto. ¡Gracias por su preferencia!`;
    } else if (status === "en_puerta") {
      messageBody = `Hola ${client.name}, su pedido #${order.id} ha llegado a su dirección y está listo para ser entregado. Por favor esté atento.`;
    } else if (status === "entregado") {
      messageBody = `Hola ${client.name}, su pedido #${order.id} ha sido entregado correctamente. ¡Gracias por su compra!`;
    }

    // Send SMS via Twilio
    return await sendTwilioSms(client.phone, messageBody);
  } catch (error) {
    console.error("Error sending order status notification:", error);
    return false;
  }
};

/**
 * Send an order status notification with fallback
 * @param client The client to send the notification to
 * @param order The order information
 * @param status The delivery status
 * @returns Promise<boolean> True if the notification was sent successfully
 */
export const sendOrderStatusNotificationWithFallback = async (
  client: Client,
  order: Order,
  status: "en_camino" | "en_puerta" | "entregado"
): Promise<boolean> => {
  // Create message based on status
  let messageBody = "";
  if (status === "en_camino") {
    messageBody = `Hola ${client.name}, su pedido #${order.id} está en camino y llegará pronto. ¡Gracias por su preferencia!`;
  } else if (status === "en_puerta") {
    messageBody = `Hola ${client.name}, su pedido #${order.id} ha llegado a su dirección y está listo para ser entregado. Por favor esté atento.`;
  } else if (status === "entregado") {
    messageBody = `Hola ${client.name}, su pedido #${order.id} ha sido entregado correctamente. ¡Gracias por su compra!`;
  }

  return await sendSmsWithFallback(client.phone, messageBody);
};

/**
 * Test Twilio SMS integration
 * @param phoneNumber Phone number to send the test message to
 * @returns Promise<boolean> True if the message was sent successfully
 */
export const testTwilioIntegration = async (
  phoneNumber: string
): Promise<boolean> => {
  try {
    const testMessage = "This is a test message from your BiocrownY IVS app!";
    const result = await sendTwilioSms(phoneNumber, testMessage);

    if (result) {
      console.log("Twilio test successful!");
    } else {
      console.error("Twilio test failed.");
    }

    return result;
  } catch (error) {
    console.error("Error during Twilio test:", error);
    return false;
  }
};
