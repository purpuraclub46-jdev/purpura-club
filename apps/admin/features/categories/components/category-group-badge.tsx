import { Badge } from "@/shared/ui/badge";
import { CATEGORY_GROUP_LABEL } from "../types";
import type { CategoryGroup } from "@/types/api";

const VARIANT: Record<
  CategoryGroup,
  "default" | "secondary" | "warning" | "muted"
> = {
  JOYERIA: "default",
  PERFUMES: "warning",
  ACCESORIOS: "muted",
};

export function CategoryGroupBadge({ group }: { group: CategoryGroup }) {
  return <Badge variant={VARIANT[group]}>{CATEGORY_GROUP_LABEL[group]}</Badge>;
}
