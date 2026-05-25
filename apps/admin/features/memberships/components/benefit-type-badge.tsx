import { Gift, Tag, Users } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import type { MembershipBenefitType } from "@/types/api";
import { BENEFIT_TYPE_LABEL } from "../types";

const ICON: Record<MembershipBenefitType, typeof Tag> = {
  DISCOUNT: Tag,
  RAFFLE_ENTRY: Gift,
  REFERRAL_BONUS: Users,
};

const VARIANT: Record<
  MembershipBenefitType,
  "default" | "muted" | "warning" | "success"
> = {
  DISCOUNT: "default",
  RAFFLE_ENTRY: "success",
  REFERRAL_BONUS: "warning",
};

export function BenefitTypeBadge({ type }: { type: MembershipBenefitType }) {
  const Icon = ICON[type];
  return (
    <Badge variant={VARIANT[type]}>
      <Icon className="size-3" />
      {BENEFIT_TYPE_LABEL[type]}
    </Badge>
  );
}
