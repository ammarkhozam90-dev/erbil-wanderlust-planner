import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import type { CategoryFilters, SortKey } from "@/lib/business-queries";

const COMMON_TAGS = ["WiFi", "Parking", "Family-friendly", "Outdoor seating", "Delivery", "Pet-friendly"];
const PRICE_LEVELS = ["$", "$$", "$$$", "$$$$"];

interface Props {
  value: CategoryFilters;
  onChange: (next: Partial<CategoryFilters>) => void;
}

export function CategoryFiltersBar({ value, onChange }: Props) {
  const toggleTag = (tag: string) => {
    const has = value.tags.includes(tag);
    onChange({
      tags: has ? value.tags.filter((t) => t !== tag) : [...value.tags, tag],
      page: 0,
    });
  };
  const togglePrice = (p: string) => {
    const has = value.price.includes(p);
    onChange({
      price: has ? value.price.filter((x) => x !== p) : [...value.price, p],
      page: 0,
    });
  };

  const active =
    value.q || value.tags.length || value.price.length || value.openNow || value.sort !== "recommended";

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value.q}
            onChange={(e) => onChange({ q: e.target.value, page: 0 })}
            placeholder="Search by business name..."
            className="pl-8"
          />
        </div>

        <Select
          value={value.sort}
          onValueChange={(v) => onChange({ sort: v as SortKey, page: 0 })}
        >
          <SelectTrigger className="md:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recommended">Recommended</SelectItem>
            <SelectItem value="popular">Most popular</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="alpha">Alphabetical</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={value.openNow ? "default" : "outline"}
          size="sm"
          onClick={() => onChange({ openNow: !value.openNow, page: 0 })}
        >
          Open now
        </Button>

        {active ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({ q: "", tags: [], price: [], openNow: false, sort: "recommended", page: 0 })
            }
          >
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Price:</span>
        {PRICE_LEVELS.map((p) => (
          <Badge
            key={p}
            variant={value.price.includes(p) ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => togglePrice(p)}
          >
            {p}
          </Badge>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Tags:</span>
        {COMMON_TAGS.map((t) => (
          <Badge
            key={t}
            variant={value.tags.includes(t) ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => toggleTag(t)}
          >
            {t}
          </Badge>
        ))}
      </div>
    </div>
  );
}
