import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AppProvider } from "@/components/context";
import { Shell } from "@/components/shell";
import { Screens } from "@/components/screens";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });
  if (!user) redirect("/login");
  if (!user.profile?.onboardingDone && slug[0] !== "onboarding")
    redirect("/onboarding");
  if (slug[0] === "admin" && user.role === "STUDENT") redirect("/dashboard");
  return (
    <AppProvider>
      <Shell>
        <Screens slug={slug} />
      </Shell>
    </AppProvider>
  );
}
