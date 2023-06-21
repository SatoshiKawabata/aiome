export function setItem(label: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(`aiome_${label}`, value);
}

export function getItem(label: string): string {
  if (typeof window === "undefined") {
    return "";
  }
  return localStorage.getItem(`aiome_${label}`) || "";
}
