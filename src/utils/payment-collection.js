export function getCodCollection(paymentAudit = {}) {
  const payments = Array.isArray(paymentAudit.legacy_payments) ? paymentAudit.legacy_payments : [];
  const payment = payments.find((item) => String(item?.status || "").toLowerCase() === "paid") || null;
  const method = String(payment?.collection_method || "").toLowerCase();

  if (!payment) return { state: "Pending collection", payment: null };
  if (method === "cash") return { state: "Physical cash collected", payment };
  if (method === "upi_qr") return { state: "Delivery UPI QR paid", payment };
  return { state: "Collection recorded", payment };
}

export function getDeliveryQrAttempts(paymentAudit = {}) {
  return (Array.isArray(paymentAudit.payment_attempts) ? paymentAudit.payment_attempts : [])
    .filter((attempt) => attempt?.attempt_type === "delivery_cod_qr");
}
