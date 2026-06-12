import { readFile } from "node:fs/promises";
import path from "node:path";
import { TcgError, type CardDataSource, type TcgCard, type TcgSet } from "@/lib/tcg/types";

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

  private async read<T>(file: string): Promise<T> {
    const raw = await readFile(path.join(FIXTURE_DIR, file), "utf8");
    return JSON.parse(raw) as T;
  }
}
