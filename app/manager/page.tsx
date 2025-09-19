import dynamic from "next/dynamic";
const KitchenManager = dynamic(() => import("@/pages/KitchenManager"), { ssr: false });
export default function Page() {
	return <KitchenManager />;
}
