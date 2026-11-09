import { connection } from "next/server";
import Nav from "@/components/nav";
import Return from "./return";

export const instant = false; // reads the PayPal return parameters per request

// PayPal sends the payer back here after approving a hold on its own page (in-app browsers, agent links).
export default async function ReturnPage({ searchParams }: PageProps<"/r">) {
  await connection();
  const { token, cancel, to } = await searchParams;
  return (
    <>
      <Nav cta={false} title="PayPal" />
      <main className="app-main page-in gutter mx-auto w-full max-w-[720px] pt-3 md:pt-40">
        <Return orderId={typeof token === "string" ? token : ""} cancelled={cancel === "1"} to={typeof to === "string" ? to : ""} />
      </main>
    </>
  );
}
