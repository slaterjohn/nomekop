import { readFile } from "node:fs/promises";
import path from "node:path";
import { TcgError, type CardDataSource, type CardWithSet, type TcgCard, type TcgSet } from "@/lib/tcg/types";

const FIXTURE_DIR = path.join(process.cwd(), "test", "fixtures");

/**
 * Serves the committed API snapshots (test/fixtures/*.json) — deterministic,
 * offline data for tests, e2e and demo mode. Card data exists for base1 and
 * sv1; other set ids raise a helpful unknown-set error.
 */
export class FixtureSource implements CardDataSource {
  async getSets(): Promise<TcgSet[]> {
    return this.read<TcgSet[]>("sets.json");
  }

  async getCards(setId: string): Promise<TcgCard[]> {
    if (!/^[a-z0-9.]+$/i.test(setId)) {
      throw new TcgError("unknown-set", `invalid set id: ${setId}`);
    }
    try {
      return await this.read<TcgCard[]>(`cards-${setId}.json`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        throw new TcgError(
          "unknown-set",
          `no fixture for set '${setId}' — fixture mode only includes base1, sv1 and sv8pt5`,
        );
      }
      throw err;
    }
  }

  async searchCardsByName(name: string): Promise<CardWithSet[]> {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const needle = normalize(name);
    return (await this.allCardsWithSet()).filter((c) => normalize(c.name).includes(needle));
  }

  async searchCardsByArtist(artist: string): Promise<CardWithSet[]> {
    const needle = artist.trim().toLowerCase();
    return (await this.allCardsWithSet()).filter((c) =>
      (c.artist ?? "").toLowerCase().includes(needle),
    );
  }

  async getCardsByDexRange(min: number, max: number): Promise<CardWithSet[]> {
    return (await this.allCardsWithSet()).filter((c) =>
      (c.dex ?? []).some((d) => d >= min && d <= max),
    );
  }

  /** Fixture mode covers the three captured sets. */
  private async allCardsWithSet(): Promise<CardWithSet[]> {
    const sets = await this.getSets();
    const result: CardWithSet[] = [];
    for (const setId of ["base1", "sv1", "sv8pt5"]) {
      const set = sets.find((s) => s.id === setId);
      if (!set) continue;
      const cards = await this.getCards(setId);
      for (const card of cards) {
        const m = /^([A-Za-z]*)(\d+)([a-z]*)$/.exec(card.number);
        const secret =
          m === null || m[1] !== "" || Number.parseInt(m[2]!, 10) > set.printedTotal;
        result.push({
          ...card,
          setId: set.id,
          setName: set.name,
          setReleaseDate: set.releaseDate,
          setPrintedTotal: set.printedTotal,
          secret,
        });
      }
    }
    return result;
  }

  private async read<T>(file: string): Promise<T> {
    const raw = await readFile(path.join(FIXTURE_DIR, file), "utf8");
    return JSON.parse(raw) as T;
  }
}
