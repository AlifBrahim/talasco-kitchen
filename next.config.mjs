import 'dotenv/config';
import dotenv from 'dotenv';

// Load additional overrides from malice.env if present
dotenv.config({ path: './malice.env', override: true });

/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		optimizePackageImports: ["lucide-react"],
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "api.builder.io",
				pathname: "/api/v1/image/assets/**",
			},
		],
	},
	typescript: {
		ignoreBuildErrors: false,
	},
	eslint: {
		ignoreDuringBuilds: true,
	},
};

export default nextConfig;
