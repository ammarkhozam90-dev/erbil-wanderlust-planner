import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryHeader } from "@/components/category/CategoryHeader";
import { CategoryFiltersBar } from "@/components/category/CategoryFilters";
import { BusinessCard } from "@/components/category/BusinessCard";
import { EmptyState } from "@/components/category/EmptyState";
import { getCategoryBySlug, CATEGORIES } from "@/lib/categories";
import { Header } from "@/components/Header";
import {
  categoryBusinessesQuery,
  PAGE_SIZE,
  type CategoryFilters,
  type SortKey,
} from "@/lib/business-queries";
import { computeOpenState } from "@/lib/opening-status";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  tags: fallback(z.array(z.string()), []).default([]),
  price: fallback(z.array(z.string()), []).default([]),
  open: fallback(z.boolean(), false).default(false),
  sort: fallback(z.enum(["recommended", "popular", "newest", "alpha"]), "recommended").default(
    "recommended",
  ),
  page: fallback(z.number().int().min(0), 0).default(0),
});

export const Route = createFileRoute("/category/$slug")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => search,
  beforeLoad: ({ params }) => {
    if (!getCategoryBySlug(params.slug)) throw notFound();
  },
  loader: async ({ params, deps, context }) => {
    const cat = getCategoryBySlug(params.slug)!;
    const filters: CategoryFilters = {
      q: deps.q,
      tags: deps.tags,
      price: deps.price,
      openNow: deps.open,
      sort: deps.sort as SortKey,
      page: deps.page,
    };
    await context.queryClient.ensureQueryData(categoryBusinessesQuery(cat, filters));
  },
  head: ({ params }) => {
    const cat = getCategoryBySlug(params.slug);
    const title = cat ? `${cat.title} in Erbil — ErbilGo` : "Explore Erbil";
    const description = cat?.description ?? "Discover Erbil's best places.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: CategoryPage,
  pendingComponent: () => (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto w-full max-w-[1600px] container space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto w-full max-w-[1600px] container p-6">
        <EmptyState message={error.message} />
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto w-full max-w-[1600px] container p-6">
        <EmptyState message="Category not found." />
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <a key={c.slug} href={`/category/${c.slug}`} className="text-sm underline">
              {c.title}
            </a>
          ))}
        </div>
      </div>
    </div>
  ),
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const cat = getCategoryBySlug(slug)!;

  const filters: CategoryFilters = {
    q: search.q,
    tags: search.tags,
    price: search.price,
    openNow: search.open,
    sort: search.sort as SortKey,
    page: search.page,
  };

  const { data } = useSuspenseQuery(categoryBusinessesQuery(cat, filters));

  const visible = useMemo(() => {
    if (!filters.openNow) return data.items;
    return data.items.filter((b) => computeOpenState(b.merchant_hours) === "open");
  }, [data.items, filters.openNow]);

  const update = (patch: Partial<CategoryFilters>) => {
    navigate({
      search: (prev) => ({
        ...prev,
        q: patch.q ?? prev.q,
        tags: patch.tags ?? prev.tags,
        price: patch.price ?? prev.price,
        open: patch.openNow ?? prev.openNow,
        sort: patch.sort ?? prev.sort,
        page: patch.page ?? prev.page,
      }),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* ظهور الهيدر هنا ليبقى ثابتاً في أعلى الصفحة */}
      <Header />
      
      <div className="mx-auto w-full max-w-[1600px] container space-y-6 p-4 md:p-6">
        <CategoryHeader title={cat.title} description={cat.description} count={data.total} />
        <CategoryFiltersBar value={filters} onChange={update} />

        {visible.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((b) => (
                <BusinessCard key={b.id} business={b} />
              ))}
            </div>

            {data.hasMore && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => update({ page: filters.page + 1 })}
                >
                  Load more
                </Button>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground">
              Showing {visible.length} of {data.total} · page size {PAGE_SIZE}
            </p>
          </>
        )}
      </div>
      
      <footer className="border-t border-border mt-12 py-8 text-center text-xs text-muted-foreground">
        <p><span className="font-display text-base text-primary">Erbil</span><span className="font-display text-base text-gold">Go</span> · Your day, your way. © 2026</p>
      </footer>
    </div>
  );
}
