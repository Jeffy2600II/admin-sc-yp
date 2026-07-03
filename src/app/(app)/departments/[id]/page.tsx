"use client";

import { use } from "react";
import { DepartmentDetailView } from "@/components/views/department-detail-view";

export default function DepartmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <DepartmentDetailView deptId={id} />;
}
