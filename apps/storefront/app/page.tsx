import type { Metadata } from "next";
import { BenefitsBand } from "@/features/home/components/benefits-band";
import { CategoriesCarousel } from "@/features/home/components/categories-carousel";
import { FeaturedRow } from "@/features/home/components/featured-row";
import { HeroBanners } from "@/features/home/components/hero-banners";
import { HomeStoresRow } from "@/features/home/components/home-stores-row";
import { RandomPicksRow } from "@/features/home/components/random-picks-row";

export const metadata: Metadata = {
  title: "Purpura Club — Joyas, perfumes y sorteos premium",
};

export default function HomePage() {
  return (
    <>
      <HeroBanners />
      <CategoriesCarousel />
      <RandomPicksRow />
      <HomeStoresRow />
      <FeaturedRow />
      <BenefitsBand />
    </>
  );
}
