import { Command } from "cmdk";
import { TypeIcon } from "@/components/search/type-icon";
import type { SearchGroup } from "@/lib/search/types";

/** Renders grouped search results inside a cmdk Command.List. Empty groups are
 *  already dropped by runSearch; a blank result set shows a "no matches" line. */
export function SearchResults({
  groups,
  onSelect,
}: {
  groups: SearchGroup[];
  onSelect: (url: string) => void;
}) {
  if (groups.length === 0) {
    return <p className="px-3 py-6 text-center font-body text-base text-gb-ink/70">No matches.</p>;
  }
  return (
    <>
      {groups.map((g) => (
        <Command.Group
          key={g.type}
          heading={
            <span className="flex items-center gap-1.5 font-pixel text-[10px] uppercase text-gb-ink/70">
              <TypeIcon type={g.type} /> {g.label}
            </span>
          }
          className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1"
        >
          {g.items.map((item) => (
            <Command.Item
              key={`${g.type}:${item.url}`}
              value={`${g.type}:${item.url}`}
              onSelect={() => onSelect(item.url)}
              className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 font-body text-lg leading-tight data-[selected=true]:bg-gb-accent data-[selected=true]:text-gb-ink"
            >
              <span className="truncate">{item.label}</span>
              {item.sublabel ? (
                <span className="shrink-0 font-pixel text-[9px] text-gb-ink/60">{item.sublabel}</span>
              ) : null}
            </Command.Item>
          ))}
        </Command.Group>
      ))}
    </>
  );
}
