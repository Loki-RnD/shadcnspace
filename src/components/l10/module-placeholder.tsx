import { PageHeader } from "@/components/l10/page-header";
import { Card, CardContent } from "@/components/ui/card";

export function ModulePlaceholder({
  title,
  description,
  note,
}: {
  title: string;
  description: string;
  note: string;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="text-muted-foreground flex min-h-48 items-center justify-center text-sm">
          {note}
        </CardContent>
      </Card>
    </>
  );
}
