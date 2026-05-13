'use client'

import { Button } from 'components/inputs'


const sections = [
  {
    title: 'Pick your surface',
    text: 'Use Sports for live and prematch betting. Use Predikt for event-driven markets and live order books.',
  },
  {
    title: 'Connect once',
    text: 'Sign in with wallet-native flows or Privy so you can move between Sports and Predikt on the same app host.',
  },
  {
    title: 'Trade with guardrails',
    text: 'The app now warns on network, balance, allowance, and stale pricing before a trade goes through.',
  },
  {
    title: 'Track the account',
    text: 'Profile, My Bets, payouts, and referrals live under one account area so users can manage activity from one place.',
  },
]

export default function QuickTourPage() {
  return (
    <div className="mx-auto max-w-[72rem] px-4 py-10 ds:px-8">
      <div className="rounded-xl border border-white/10 bg-bg-l2 p-8">
        <div className="text-caption-12 uppercase tracking-[0.18em] text-brand-50">Predikt Quick Tour</div>
        <h1 className="mt-3 text-[2.5rem] font-semibold leading-tight tracking-[-0.05em] text-grey-90">
          Learn the flow before you place a trade
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-grey-70">
          This guide gives new users a fast overview of how Sports and Predikt work together. Video walkthroughs can be added here next.
        </p>
        <div className="mt-8 grid gap-4 ds:grid-cols-2">
          {
            sections.map((section) => (
              <div key={section.title} className="rounded-lg border border-white/10 bg-bg-l1 p-5">
                <h2 className="text-heading-h5 font-semibold text-grey-90">{section.title}</h2>
                <p className="mt-3 text-caption-14 leading-7 text-grey-70">{section.text}</p>
              </div>
            ))
          }
        </div>
        <div className="mt-8 flex flex-col gap-3 ds:flex-row">
          <Button className="flex-1" size={40} title="Open Predikt" to="/predikts" />
          <Button className="flex-1" size={40} style="secondary" title="Open Sports" to="/bet" />
        </div>
      </div>
    </div>
  )
}
