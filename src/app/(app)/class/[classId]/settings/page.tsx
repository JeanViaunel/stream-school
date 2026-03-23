"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/** Legacy route: quick actions used `/settings`; forward to the class detail page. */
export default function ClassSettingsRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.classId as string;

  useEffect(() => {
    router.replace(`/class/${classId}/details`);
  }, [classId, router]);

  return null;
}
