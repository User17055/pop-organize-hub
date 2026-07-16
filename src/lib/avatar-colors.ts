const avatarGradients = [
  "linear-gradient(135deg, oklch(0.62 0.13 305), oklch(0.54 0.11 285))",
  "linear-gradient(135deg, oklch(0.68 0.13 28), oklch(0.58 0.12 15))",
  "linear-gradient(135deg, oklch(0.66 0.11 165), oklch(0.55 0.1 180))",
  "linear-gradient(135deg, oklch(0.72 0.12 78), oklch(0.62 0.11 58))",
  "linear-gradient(135deg, oklch(0.62 0.09 235), oklch(0.53 0.08 250))",
  "linear-gradient(135deg, oklch(0.66 0.11 345), oklch(0.56 0.1 325))",
];

export function getAvatarGradient(seed: string) {
  const index = Array.from(seed).reduce((hash, character) => hash + character.charCodeAt(0), 0);
  return avatarGradients[index % avatarGradients.length];
}
