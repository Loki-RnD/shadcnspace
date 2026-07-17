/** @type {import('next').NextConfig} */
const nextConfig = {
  // Let devices on the LAN (phone/tablet) load dev-server assets
  allowedDevOrigins: ["192.168.0.110"],

  images: {
    unoptimized: true,
    remotePatterns: [
      
    ],
  },
  
};

export default nextConfig;
