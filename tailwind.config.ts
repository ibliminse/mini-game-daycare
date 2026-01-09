import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        corporate: {
          blue: '#4A90D9',
          green: '#7BC67E',
          yellow: '#FFD93D',
          pink: '#FF9EAA',
          purple: '#B19CD9',
        }
      },
      fontFamily: {
        pixel: ['monospace'],
      }
    },
  },
  plugins: [],
};
export default config;
