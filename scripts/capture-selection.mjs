export function selectedNumbers(value = "") {
  return new Set(value.split(",").map((item) => item.trim()).filter(Boolean).map(Number).filter(Number.isInteger));
}
