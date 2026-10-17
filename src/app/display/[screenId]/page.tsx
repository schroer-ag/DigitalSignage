import { notFound } from "next/navigation";
import { getDisplayContent } from "@/lib/display-content";
import { DisplayPlayer } from "@/components/DisplayPlayer";

export default async function DisplayScreenPage({
  params,
}: {
  params: Promise<{ screenId: string }>;
}) {
  const { screenId } = await params;
  const content = await getDisplayContent(screenId, { heartbeat: true });

  if (!content) notFound();

  return <DisplayPlayer screenId={screenId} initial={content} />;
}
