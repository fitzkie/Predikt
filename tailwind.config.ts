import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'


const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/compositions/**/*.{ts,tsx}',
    './src/views/**/*.{ts,tsx}',
  ],
  theme: {
    screens: {
      // see context/device/index
      mb: { max: '801.9px' }, // isMobileView
      ds: '802px', // isDesktopView
      nr: { min: '802px', max: '1279.9px' }, // isNarrowVie
      '-wd': { max: '1280px' },
      'wd': { min: '1280px' },
      '2wd': '1366px', // for more control (view where both sidebars are fixed in viewport)
    },
    extend: {
      colors: {
        'brand-70': '#8F6A12',
        'brand-60': '#C79623',
        'brand-50': '#EBB437',
        'brand-15': '#3F3420',
        'brand-10': '#2B2417',
        'brand-5': '#17130C',

        'grey-90': '#F5F5F5',
        'grey-70': '#C4C7CB',
        'grey-60': '#9EA4AB',
        'grey-40': '#707780',
        'grey-20': '#2A2F36',
        'grey-15': '#23282F',
        'grey-10': '#1B1F24',

        'bg-l0': '#0A0A0A',
        'bg-l1': '#111315',
        'bg-l2': '#161A1E',
        'bg-l3': '#1B1F24',

        'accent-pink': '#F768A0',
        'accent-pink-5': '#442E37',

        'accent-green': '#00C076',
        'accent-green-5': '#10251C',
        'accent-green-10': '#113A29',

        'accent-yellow': '#EFB72A',
        'accent-yellow-10': '#E5B02B1A',

        'accent-red': '#FF4D5A',
        'accent-red-5': '#341B1F',
        'accent-red-10': '#5C2328',

        'accent-blue': '#7B58ED',

        'accent-purple': '#CA5AFF',
      },
      borderRadius: {
        'ssm': '0.375rem', // 6
        'min': '0.5rem', // 8
        'sm': '0.75rem', // 12
        'md': '1rem', // 16
        'lg': '1.25rem', // 20
      },
      backgroundImage: ({ theme }) => ({
        'card-border-top': 'linear-gradient(180deg, rgba(239, 239, 243, 0.15) 0%, rgba(239, 239, 243, 0) 100%)',
        'card-border-bottom': 'linear-gradient(180deg, rgba(239, 239, 243, 0) 0%, rgba(239, 239, 243, 0.15) 100%)',
        'live-switcher-bg': 'linear-gradient(90deg, rgba(61, 32, 31, 0.5) 0%, rgba(61, 32, 31, 0) 100%)',
        'betslip-item-bg': `linear-gradient(90.08deg, ${theme('colors.bg-l2')} 0.06%, ${theme('colors.brand-10')} 300%)`,
        'betslip-item-bg-inc': `linear-gradient(90.08deg, ${theme('colors.bg-l2')} 0.06%, ${theme('colors.accent-green')} 300%)`,
        'betslip-item-bg-dec': `linear-gradient(90.08deg, ${theme('colors.bg-l2')} 0.06%, ${theme('colors.accent-red')} 300%)`,
        'live-game-shadow': `linear-gradient(90deg, ${theme('colors.accent-red')} -1000%, ${theme('colors.bg-l2')} 100%)`,
        'live-bet-shadow': `linear-gradient(90deg, ${theme('colors.bg-l3')} 0%, ${theme('colors.accent-red')} 800%)`,
        'result-button-won': `linear-gradient(180deg, ${theme('colors.grey-15')} 0%, ${theme('colors.accent-green')} 1500%)`,
        'result-button-lost': `linear-gradient(90deg, ${theme('colors.grey-15')} 0%, ${theme('colors.accent-red')} 1500%)`,
        'bet-game-won': `linear-gradient(180deg, ${theme('colors.bg-l3')} 0%, ${theme('colors.accent-green')} 1000%)`,
        'bet-game-lost': `linear-gradient(180deg, ${theme('colors.bg-l3')} 0%, ${theme('colors.accent-red')} 1000%)`,
        'live-event-gradient': `linear-gradient(90deg, transparent 0%, ${theme('colors.accent-red')} 50%, transparent 100%)`,
      }),
      boxShadow: ({ theme }) => ({
        'betslip': `0px -10px 30px ${theme('colors.bg-l1')}`,
      }),
      fill: {
        'gradient-azuro-waves-grey': '#c4cfe4',
        'gradient-azuro-waves-mist': '#a5d0e6',
        // ATTN: check /local_modules/svg-provider/SvgSprite.tsx
        'gradient-azuro-waves-sky': 'url(#gradient-azuro-waves-sky)',
        'gradient-azuro-waves-blue': 'url(#gradient-azuro-waves-blue)',
        'gradient-azuro-waves-ultramarine': 'url(#gradient-azuro-waves-ultramarine)',
        'gradient-azuro-waves-bright': 'url(#gradient-azuro-waves-bright)',
        'gradient-azuro-waves-brilliant': 'url(#gradient-azuro-waves-brilliant)',
        'gradient-azuro-waves-royal': 'url(#gradient-azuro-waves-royal)',
      },
    },
  },
  plugins: [
    require('@headlessui/tailwindcss'),
    plugin(({ addComponents, matchUtilities, theme }) => {
      // addBase({
      //   'body': { backgroundColor: theme('colors.test') },
      // })
      addComponents({
        '.text-heading-h1': {
          fontSize: '1.75rem', // 28
          lineHeight: '2.25rem', // 36
        },
        '.text-heading-h2': {
          fontSize: '1.5rem', // 24
          lineHeight: '2rem', // 32
        },
        '.text-heading-h3': {
          fontSize: '1.25rem', // 20
          lineHeight: '1.625rem', // 26
        },
        '.text-heading-h4': {
          fontSize: '1.125rem', // 18
          lineHeight: '1.5rem', // 24
        },
        '.text-heading-h5': {
          fontSize: '1rem', // 16
          lineHeight: '1.25rem', // 20
        },
        '.text-caption-14': {
          fontSize: '0.875rem', // 14
          lineHeight: '1.125rem', // 18
        },
        '.text-caption-13': {
          fontSize: '0.813rem', // 13
          lineHeight: '1rem', // 16
        },
        '.text-caption-12': {
          fontSize: '0.75rem', // 12
          lineHeight: '0.875rem', // 14
        },
        '.text-label-12': {
          fontSize: '0.688rem', // 11
          lineHeight: '0.813rem', // 13
        },
      })
    }),
  ],
}

export default config
