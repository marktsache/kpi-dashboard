import { redirect } from "next/navigation";
export default function MitarbeiterRedirect() {
  redirect("/einstellungen?tab=mitarbeiter");
}
