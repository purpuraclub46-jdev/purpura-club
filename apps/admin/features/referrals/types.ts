export interface ReferralUserRef {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface ReferralEntity {
  id: string;
  referrer: ReferralUserRef;
  referred: ReferralUserRef;
  rewarded: boolean;
  rewardedAt: string | null;
  createdAt: string;
}

export interface ReferralListQuery {
  page?: number;
  limit?: number;
  search?: string;
  rewarded?: boolean;
}
