import type { StaticImageData } from "next/image";

declare module "*.png" {
	const content: StaticImageData;
	export default content;
}

declare module "*.jpg" {
	const content: StaticImageData;
	export default content;
}

declare module "*.jpeg" {
	const content: StaticImageData;
	export default content;
}

declare module "*.webp" {
	const content: StaticImageData;
	export default content;
}

declare module "*.avif" {
	const content: StaticImageData;
	export default content;
}

declare module "*.svg" {
	const content: StaticImageData;
	export default content;
}
