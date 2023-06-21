export function setItem(label: string, value: string) {
  localStorage.setItem(`aiome_${label}`, value);
}

export function getItem(label: string): string {
  return localStorage.getItem(`aiome_${label}`) || "";
}
