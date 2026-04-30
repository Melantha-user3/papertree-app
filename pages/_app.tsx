import type { AppProps } from "next/app";

export default function PaperTreeApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
