"use client";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
export default function Redirect() {
  const router = useRouter();
  const { id } = useParams();
  useEffect(() => { router.replace(`/mitarbeiter/${id}`); }, [router, id]);
  return null;
}
