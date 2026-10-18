export const themeColors = { light: "#f3f3f1", dark: "#142528" };
export type ThemePreference = "system" | "light" | "dark";
export const themeStorageKey = "pamoja-theme";

// Run in the head, before CSS or hydration, including when storage is unavailable.
export const themeBootstrap = `(()=>{let p="system";try{p=localStorage.getItem("${themeStorageKey}")||p}catch{}const t=p==="light"||p==="dark"?p:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;document.querySelectorAll('meta[name="theme-color"]').forEach(m=>{m.content=t==="dark"?"${themeColors.dark}":"${themeColors.light}";m.removeAttribute("media")})})()`;
