import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const organization = session?.user.organizationId
    ? await prisma.organization.findUnique({
        where: { id: session.user.organizationId },
        select: { name: true },
      })
    : null;

  return (
    <div className="md:flex min-h-screen">
      <Suspense fallback={null}>
        <Sidebar
          organizationName={organization?.name ?? ""}
          userName={session?.user.name ?? ""}
        />
      </Suspense>
      <main className="flex-1 min-w-0 px-4 py-6 md:px-8 md:py-8">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
