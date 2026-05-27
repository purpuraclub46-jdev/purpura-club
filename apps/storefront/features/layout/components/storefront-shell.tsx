"use client";

import { type ReactNode } from "react";
import { CartDrawer } from "@/features/cart/components/cart-drawer";
import { WishlistDrawer } from "@/features/wishlist/components/wishlist-drawer";
import { Footer } from "./footer";
import { Navbar } from "./navbar";
import { TopBar } from "./top-bar";

export function StorefrontShell({ children }: { children: ReactNode }) {
  return (
    <>
      <TopBar />
      <Navbar />
      <main className="min-h-[60vh]">{children}</main>
      <Footer />
      <CartDrawer />
      <WishlistDrawer />
    </>
  );
}
