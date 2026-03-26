import { redirect } from "next/navigation";
export default function AuditRedirect() {
  redirect("/einstellungen?tab=audit");
}
