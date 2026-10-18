export default function Loading() {
  return (
    <main id="main-content" className="app-loading" aria-busy="true" aria-label="Loading Pamoja">
      <img src="/icons/app-192.png" width={72} height={72} alt="" />
      <p>A little each. A lot together.</p>
      <span className="loading-line" aria-hidden="true" />
      <output className="sr-only">Opening your community workspace…</output>
    </main>
  );
}
