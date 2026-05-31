/**
 * F2.7-C — Copy-to-clipboard con fallback.
 *
 * Estrategia:
 *   1. `navigator.clipboard.writeText` (HTTPS + permiso del browser).
 *   2. Fallback `document.execCommand("copy")` para contextos legacy.
 *
 * Devuelve `true` si tuvo éxito, `false` si no. El caller decide qué toast
 * mostrar.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Cae al fallback.
  }

  // Fallback DOM-based (no requiere HTTPS pero requiere user gesture).
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
