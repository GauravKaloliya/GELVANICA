"use client";

import { useParams } from "next/navigation";
import { MembersTable } from "@/components/settings/MembersTable";

export default function MembersPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <MembersTable workspaceId={workspaceId} />
    </div>
  );
}
