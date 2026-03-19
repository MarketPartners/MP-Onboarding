import type { AppProps } from 'next/app'
import Head from 'next/head'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Client Intake — Market Partners</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Market Partners Financial Services — Secure Client Intake" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,400&display=swap" rel="stylesheet" />
        <style>{`
          *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
          html{font-size:16px}
          body{font-family:'DM Sans',sans-serif;background:#f4f3ef;color:#333;min-height:100vh}
          input,select,textarea,button{font-family:'DM Sans',sans-serif}
          input:focus,select:focus,textarea:focus{border-color:#1FBCA1!important;box-shadow:0 0 0 3px rgba(31,188,161,0.12);outline:none}
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
          .fade-in{animation:fadeIn 0.3s ease both}
        `}</style>
      </Head>
      <Component {...pageProps} />
    </>
  )
}
