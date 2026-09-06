export function getApiErrorMessage(error, fallbackMessage) {
  const payload = error?.response?.data;
  if (!payload?.message) return fallbackMessage;

  const details = payload.errors && typeof payload.errors === "object"
    ? Object.values(payload.errors).filter(
        (value) => typeof value === "string"
      )
    : [];

  return details.length
    ? `${payload.message}: ${details.join(" ")}`
    : payload.message;
}
