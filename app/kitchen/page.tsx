import dynamic from "next/dynamic";
const KitchenDisplay = dynamic(() => import("@/pages/KitchenDisplay"), { ssr: false });
export default function Page() {
	return <KitchenDisplay />;
}
