import * as SMS from "expo-sms";
import { Client } from "./clients";
import { Order } from "./orders";

/**
 * Check if SMS is available on the device
 * @returns {Promise<boolean>} True if SMS is available
 */
export const isSmsAvailable = async (): Promise<boolean> => {
  const isAvailable = await SMS.isAvailableAsync();
  return isAvailable;
};

/**
 * Send an SMS notification about order status
 * @param client The client to send the SMS to
 * @param order The order information
 * @param status The status of the delivery
 * @returns {Promise<boolean>} True if SMS was sent successfully
 */
export const sendOrderStatusSms = async (
  client: Client,
  order: Order,
  status: "en_camino" | "en_puerta"
): Promise<boolean> => {
  try {
    // Check if SMS is available
    const isAvailable = await isSmsAvailable();
    if (!isAvailable) {
      console.error("SMS is not available on this device");
      return false;
    }

    // Create message based on status
    let message = "";
    if (status === "en_camino") {
      message = `Hola ${client.name}, su pedido #${order.id} está en camino y llegará pronto. ¡Gracias por su preferencia!`;
    } else if (status === "en_puerta") {
      message = `Hola ${client.name}, su pedido #${order.id} ha llegado a su dirección y está listo para ser entregado. Por favor esté atento.`;
    }

    // Send SMS
    const { result } = await SMS.sendSMSAsync([client.phone], message);

    return result === "sent" || result === "unknown";
  } catch (error) {
    console.error("Error sending SMS:", error);
    return false;
  }
};
