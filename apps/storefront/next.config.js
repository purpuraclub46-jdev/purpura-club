/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Catch-all https. Las imágenes vienen de URLs que cargan los admins
    // desde el SUPERADMIN, así que el origen es controlado upstream. El
    // runtime igual cae a un fallback elegante si una URL falla (ver
    // onError en ProductCard), por lo que la sidebar de hosts no es la
    // capa de seguridad: la edición del SUPERADMIN lo es.
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
};

export default nextConfig;
