import type { Metadata } from "next";
import Link from "next/link";
import { GbScreen } from "@/components/gb/gb-screen";

export const metadata: Metadata = {
  title: "Accessibility",
  description:
    "How we try to make Nomekop work for everyone — the built-in settings that help, what already works well, what we're still fixing, and how to tell us if something's hard to use.",
  alternates: { canonical: "/accessibility" },
  robots: { index: true, follow: true },
};

/** Plain-language, informal accessibility statement. Static — no external data.
 *  Honest about where the app is against WCAG 2.2 (close to AA, a couple of known
 *  gaps), and points people at the in-app settings that help. */
export default function AccessibilityPage() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <h1 className="font-pixel text-lg uppercase leading-relaxed sm:text-xl">Accessibility</h1>
      <p className="font-body text-xl leading-tight">
        We want Nomekop to be usable by everyone — however you browse, whatever you use. Here&apos;s
        where we&apos;re at, in plain English. No jargon, promise.
      </p>

      <GbScreen title="What we aim for">
        <p className="font-body text-xl leading-relaxed">
          We&apos;re aiming to meet <strong>WCAG 2.2 level AA</strong> — the accessibility standard
          most of the web works towards. We&apos;re most of the way there, and we keep chipping away
          at the bits that aren&apos;t quite right yet.
        </p>
      </GbScreen>

      <GbScreen title="Settings that help">
        <p className="font-body text-xl leading-relaxed">
          Nomekop has a retro Game Boy look, but you don&apos;t have to keep it that way. Tap the
          settings button (the cog, top-right) and you can:
        </p>
        <ul className="mt-4 flex list-none flex-col gap-3 p-0 font-body text-xl leading-relaxed">
          <li>
            <strong>Switch to the High Contrast palette</strong> — the easiest-to-read colours, if
            the themed ones are hard on your eyes.
          </li>
          <li>
            <strong>Swap the pixel font</strong> for a plain mono or sans-serif one that&apos;s
            easier to read.
          </li>
          <li>
            <strong>Make the text bigger</strong> — several sizes, and the whole site also zooms
            normally in your browser.
          </li>
          <li>
            <strong>Turn on reduced motion</strong> to calm the animations (we also follow your
            device&apos;s &ldquo;reduce motion&rdquo; setting automatically).
          </li>
          <li>
            <strong>Mute the sound</strong> — nothing plays until you ask it to anyway.
          </li>
        </ul>
      </GbScreen>

      <GbScreen title="What already works well">
        <p className="font-body text-xl leading-relaxed">
          A few things we&apos;ve put real care into:
        </p>
        <ul className="mt-4 flex list-none flex-col gap-3 p-0 font-body text-xl leading-relaxed">
          <li>
            <strong>Keyboard friendly</strong> — you can reach and use everything with the Tab key,
            and there&apos;s a clear outline showing where you are. A &ldquo;skip to content&rdquo;
            link is the first thing you hit.
          </li>
          <li>
            <strong>Screen-reader friendly</strong> — buttons, toggles and menus announce what they
            are and their state, card pictures have descriptions, and every page has a clear
            heading structure.
          </li>
          <li>
            <strong>Respects your preferences</strong> — reduced motion, text zoom and your light or
            dark setting all carry through.
          </li>
        </ul>
      </GbScreen>

      <GbScreen title="What we're still working on">
        <p className="font-body text-xl leading-relaxed">
          We&apos;d rather be honest than oversell it. A few things aren&apos;t perfect yet:
        </p>
        <ul className="mt-4 flex list-none flex-col gap-3 p-0 font-body text-xl leading-relaxed">
          <li>
            Some of the retro colour themes have <strong>lower text contrast</strong> than we&apos;d
            like. If anything&apos;s hard to read, the <strong>High Contrast</strong> palette (or a
            plainer font and bigger text) in settings fixes it.
          </li>
          <li>
            A few labels use a small pixel font. Switching the font in settings makes those much
            clearer.
          </li>
          <li>
            We&apos;re polishing how forms (like the report form) announce errors to screen readers.
          </li>
        </ul>
        <p className="mt-4 font-body text-xl leading-relaxed">
          We test with automated accessibility checks and keyboard run-throughs as part of our
          normal work, so this list keeps getting shorter.
        </p>
      </GbScreen>

      <GbScreen title="Found something hard to use?">
        <p className="font-body text-xl leading-relaxed">
          Please tell us — it genuinely helps, and we read every message. You can{" "}
          <Link href="/report" className="underline">
            report a problem with the form
          </Link>{" "}
          or email{" "}
          <a href="mailto:hello@nomekop.app" className="underline">
            hello@nomekop.app
          </a>
          . Let us know what you were trying to do and what got in the way, and we&apos;ll sort it.
        </p>
      </GbScreen>

      <p className="font-body text-lg leading-relaxed text-gb-muted">
        Last reviewed: June 2026.
      </p>
    </main>
  );
}
