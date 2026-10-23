export function playSound(type) {
  try {
    if (typeof window === "undefined") return;
    if (type === "success" && window.soundOk) window.soundOk();
    if (type === "error" && window.soundWrong) window.soundWrong();
  } catch (error) {
    console.warn("Error playing sound:", error);
  }
}
