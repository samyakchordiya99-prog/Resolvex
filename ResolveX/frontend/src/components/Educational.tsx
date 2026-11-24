export default function Educational() {
  return (
    <section id="learn" aria-labelledby="learn-title" className="mx-auto max-w-6xl scroll-mt-20 px-4 pt-10 sm:px-6">
      <h2 id="learn-title" className="text-xl font-bold text-white">What is DNS?</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p aria-hidden="true" className="text-2xl">🌐</p>
          <h3 className="mt-2 text-sm font-semibold text-white">What is DNS?</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
            DNS (Domain Name System) converts human-readable domain names such as <code className="font-mono text-cyan-300">google.com</code> into
            IP addresses that computers use to connect to servers.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p aria-hidden="true" className="text-2xl">⚡</p>
          <h3 className="mt-2 text-sm font-semibold text-white">Why compare DNS servers?</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
            Different DNS resolvers can have different response times depending on network conditions, ISP routing, location,
            and server availability. The best choice depends on <em>your</em> network.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p aria-hidden="true" className="text-2xl">📊</p>
          <h3 className="mt-2 text-sm font-semibold text-white">What does this tool measure?</h3>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-slate-300">
            <li>DNS response time per query</li>
            <li>Average / min / max / median latency</li>
            <li>Reliability and success rate</li>
          </ul>
        </article>
      </div>
      <p className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200" role="note">
        <strong>Important:</strong> DNS performance is different from internet bandwidth or download speed. A faster DNS can make
        browsing feel snappier, but it does not increase your connection&apos;s bandwidth.
      </p>
    </section>
  );
}
