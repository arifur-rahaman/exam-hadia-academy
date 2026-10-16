import Image from "next/image";

// Temporary raster logos cropped from Arif's JPGs; swap files in public/brand/ when SVG/PNG arrives.
export function LogoMark({ size = 64 }: { size?: number }) {
  return (
    <Image
      src="/brand/logo-mark.png"
      alt="Hadia Academy logo"
      width={size}
      height={Math.round((size * 245) / 256)}
      priority
    />
  );
}
