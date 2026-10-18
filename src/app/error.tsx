"use client";
import { Button } from "@/components/ui";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="fatal-error">
      <h1>Let’s get you back together.</h1>
      <p>This page couldn’t load. Your saved demo workspace is still here.</p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
