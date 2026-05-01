'use client'

import { constants } from 'helpers'

import { Button } from 'components/inputs'
import { Href } from 'components/navigation'


const mainNav = [
  { label: 'Home', to: '#home' },
  { label: 'Sports', href: constants.links.sportsApp },
  { label: 'Predikts', href: constants.links.prediktsApp },
  { label: 'About', to: '#about' },
  { label: 'FAQ', to: '#faq' },
]

const featureCards = [
  {
    eyebrow: 'NEW ERA OF SPORTS BETTING',
    title: 'Any Sport, Any Chain',
    text: 'From major leagues to fast-moving niche markets, Predikt gives you a clean way to trade sports outcomes across EVM chains with transparent pricing and on-chain settlement.',
  },
  {
    eyebrow: 'CONTROL YOUR FUNDS',
    title: 'Bet Decentralized',
    text: 'Your positions stay tied to your wallet and settle through smart contracts, so you avoid the usual custodial deposit and withdrawal model. You stay in charge of your capital.',
  },
]

const productCards = [
  {
    title: 'Sports App',
    text: 'A sportsbook-style experience for live and prematch markets, wallet-native betting, and instant access to Azuro liquidity.',
    href: constants.links.sportsApp,
    button: 'Open bet.prediktmarkets.com',
  },
  {
    title: 'Predikts App',
    text: 'A prediction-market entrypoint for politics, macro, crypto, and event-driven markets with the same Azuro settlement rails underneath.',
    href: constants.links.prediktsApp,
    button: 'Open app.prediktmarkets.com',
  },
]

const faqs = [
  {
    question: 'Why split Sports and Predikts into two app surfaces?',
    answer: 'It keeps the public brand unified while giving each product a cleaner user experience, clearer navigation, and its own optimized market taxonomy.',
  },
  {
    question: 'Which domains map to which surfaces?',
    answer: 'Use www.prediktmarkets.com for the public marketing site, bet.prediktmarkets.com for the sportsbook experience, and app.prediktmarkets.com for prediction-market flows.',
  },
  {
    question: 'Does both product traffic still run on Azuro?',
    answer: 'Yes. The frontends can differ, but both experiences can use Azuro for wallet integration, market data, and on-chain settlement.',
  },
]

const MarketingHome: React.FC = () => {
  return (
    <div id="home" className="min-h-screen bg-bg-l0 text-grey-90">
      <div className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top,rgba(235,180,55,0.18),transparent_52%)] pointer-events-none" />
        <div className="mx-auto max-w-[82rem] px-4 ds:px-8">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-bg-l0/85 py-5 backdrop-blur">
            <Href to="/" className="flex items-baseline gap-2">
              <span className="text-lg font-semibold uppercase tracking-[0.14em] text-brand-50">Predikt</span>
              <span className="text-[0.65rem] font-medium uppercase tracking-[0.22em] text-grey-60">Markets</span>
            </Href>
            <nav className="hidden items-center gap-6 ds:flex">
              {
                mainNav.map((item) => (
                  item.href ? (
                    <Href key={item.label} href={item.href} className="text-caption-13 font-medium uppercase tracking-[0.18em] text-grey-60 transition hover:text-grey-90">
                      {item.label}
                    </Href>
                  ) : (
                    <Href key={item.label} href={item.to} className="text-caption-13 font-medium uppercase tracking-[0.18em] text-grey-60 transition hover:text-grey-90">
                      {item.label}
                    </Href>
                  )
                ))
              }
            </nav>
            <div className="flex items-center gap-3">
              <Button
                className="hidden ds:flex"
                href={constants.links.sportsApp}
                size={40}
                title="Launch App"
              />
              <Button
                className="ds:hidden"
                href={constants.links.sportsApp}
                size={32}
                title="Launch"
              />
            </div>
          </header>

          <section className="grid gap-12 py-16 ds:grid-cols-[minmax(0,1fr)_24rem] ds:py-24">
            <div className="max-w-4xl">
              <div className="inline-flex items-center rounded-full border border-brand-50/30 bg-brand-50/10 px-4 py-2 text-caption-13 font-medium uppercase tracking-[0.18em] text-brand-50">
                Predikt
              </div>
              <h1 className="mt-6 max-w-4xl text-[3rem] font-semibold leading-[0.95] tracking-[-0.06em] text-grey-90 ds:text-[6rem]">
                Trade What Happens Next
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-grey-70">
                Real-time prediction markets powered by crowd intelligence, tokenized outcomes, and verified oracle settlement.
              </p>
              <div className="mt-8 flex flex-col gap-3 ds:flex-row">
                <Button href={constants.links.sportsApp} size={40} title="Open Sports App" />
                <Button href={constants.links.prediktsApp} size={40} style="secondary" title="Open Predikt App" />
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
              <div className="text-caption-12 font-medium uppercase tracking-[0.2em] text-grey-60">Platform split</div>
              <div className="mt-6 space-y-4">
                <div className="rounded-md border border-brand-50/20 bg-brand-50/10 p-4">
                  <div className="text-caption-12 uppercase tracking-[0.18em] text-brand-50">Public site</div>
                  <div className="mt-2 text-heading-h4 font-semibold">www.prediktmarkets.com</div>
                  <div className="mt-2 text-caption-14 text-grey-70">Brand, education, product positioning, and launch paths into both Azuro-powered apps.</div>
                </div>
                <div className="rounded-md border border-white/10 bg-bg-l2 p-4">
                  <div className="text-caption-12 uppercase tracking-[0.18em] text-grey-60">Sportsbook app</div>
                  <div className="mt-2 text-heading-h4 font-semibold">bet.prediktmarkets.com</div>
                </div>
                <div className="rounded-md border border-white/10 bg-bg-l2 p-4">
                  <div className="text-caption-12 uppercase tracking-[0.18em] text-grey-60">Prediction app</div>
                  <div className="mt-2 text-heading-h4 font-semibold">app.prediktmarkets.com</div>
                </div>
              </div>
            </div>
          </section>

          <section className="border-t border-white/10 py-8">
            <div className="flex flex-col items-start justify-between gap-4 ds:flex-row ds:items-center">
              <div>
                <div className="text-caption-12 uppercase tracking-[0.18em] text-grey-60">Start with the app surface that fits the market type</div>
                <div className="mt-2 text-heading-h3 font-semibold">Sports and Predikts can share rails without sharing the same first impression.</div>
              </div>
              <Button href={constants.links.sportsApp} size={40} title="Launch App" />
            </div>
          </section>

          <section id="about" className="grid gap-6 py-14 ds:grid-cols-2">
            {
              featureCards.map((card) => (
                <div key={card.title} className="rounded-lg border border-white/10 bg-bg-l2 p-8">
                  <div className="text-caption-12 font-medium uppercase tracking-[0.2em] text-brand-50">{card.eyebrow}</div>
                  <h2 className="mt-4 text-[2rem] font-semibold leading-tight tracking-[-0.04em]">{card.title}</h2>
                  <p className="mt-4 text-base leading-7 text-grey-70">{card.text}</p>
                </div>
              ))
            }
          </section>

          <section className="grid gap-6 py-4 ds:grid-cols-2">
            {
              productCards.map((card) => (
                <div key={card.title} className="rounded-lg border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-8">
                  <div className="text-caption-12 uppercase tracking-[0.18em] text-grey-60">Launch surface</div>
                  <h3 className="mt-3 text-heading-h2 font-semibold">{card.title}</h3>
                  <p className="mt-4 text-base leading-7 text-grey-70">{card.text}</p>
                  <Button className="mt-6" href={card.href} size={40} style="secondary" title={card.button} />
                </div>
              ))
            }
          </section>

          <section id="faq" className="py-16">
            <div className="max-w-3xl">
              <div className="text-caption-12 uppercase tracking-[0.18em] text-brand-50">FAQ</div>
              <h2 className="mt-4 text-[2.5rem] font-semibold leading-tight tracking-[-0.05em]">A cleaner split between brand site and trading apps</h2>
            </div>
            <div className="mt-10 grid gap-4">
              {
                faqs.map((faq) => (
                  <div key={faq.question} className="rounded-lg border border-white/10 bg-bg-l2 p-6">
                    <h3 className="text-heading-h5 font-semibold">{faq.question}</h3>
                    <p className="mt-3 text-caption-14 leading-7 text-grey-70">{faq.answer}</p>
                  </div>
                ))
              }
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default MarketingHome
