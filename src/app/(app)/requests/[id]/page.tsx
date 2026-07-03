"use client";

import { use } from "react";
import { RequestDetailView } from "@/components/views/request-detail-view";

export default function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <RequestDetailView requestId={id} />;
}
