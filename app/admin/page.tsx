// app/admin/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin?callbackUrl=/admin");
  }

  if (session.user?.role !== "admin") {
    redirect("/");
  }

  return <AdminClient signedInAs={session.user?.email ?? "Admin"} />;
}
