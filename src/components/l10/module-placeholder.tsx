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
    <div className="grid grid-cols-12 gap-6">
      <Card className="col-span-12">
        <CardContent className="flex flex-col gap-1">
          <p className="text-card-foreground text-lg font-medium">{title}</p>
          <p className="text-muted-foreground text-xs font-normal">
            {description}
          </p>
        </CardContent>
      </Card>
      <Card className="col-span-12">
        <CardContent className="text-muted-foreground flex min-h-48 items-center justify-center text-sm">
          {note}
        </CardContent>
      </Card>
    </div>
  );
}
