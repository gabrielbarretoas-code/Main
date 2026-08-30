import { prisma } from "@/lib/prisma";
import { requireOrganizationId } from "@/lib/session";
import WhatsAppLinkCard from "./WhatsAppLinkCard";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const organizationId = await requireOrganizationId();
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { name: true, whatsappPhone: true, whatsappLinkCode: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Configurações</h1>

      <WhatsAppLinkCard
        whatsappPhone={organization.whatsappPhone}
        whatsappLinkCode={organization.whatsappLinkCode}
        botNumber={process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? null}
      />
    </div>
  );
}
