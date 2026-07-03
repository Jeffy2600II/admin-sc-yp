"use client";

import { use } from "react";
import { UserDetailView } from "@/components/views/user-detail-view";

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <UserDetailView userId={id} />;
}
