export async function toAvatar(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) throw new Error("Choose a JPG, PNG or GIF image.");
  if (file.size > 20 * 1024 * 1024) throw new Error("Your image must be under 20 MB.");
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Couldn't read this image."));
    reader.readAsDataURL(file);
  });
  if (file.type === "image/gif") return url;
  const image = new Image(); image.src = url; await image.decode();
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 160;
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Couldn't prepare this image.");
  const size = Math.min(image.width, image.height);
  ctx.drawImage(image, (image.width - size) / 2, (image.height - size) / 2, size, size, 0, 0, 160, 160);
  return canvas.toDataURL("image/jpeg", .85);
}