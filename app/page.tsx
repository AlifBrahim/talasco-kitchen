import dynamic from "next/dynamic";
const Index = dynamic(() => import("@/pages/Index"), { ssr: false });
export default function Page() {
	return <Index />;
}

