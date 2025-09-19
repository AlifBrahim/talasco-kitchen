import "@/global.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Talasco Kitchen",
	description: "Kitchen management and menu system",
};

import Providers from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body>
				<Providers>
					{children}
				</Providers>
			</body>
		</html>
	);
}
