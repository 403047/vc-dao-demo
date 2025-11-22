import '../styles/globals.css'
import Head from 'next/head'

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>VC-DAO Fund - Quỹ Đầu Tư Phi Tập Trung</title>
        <meta name="description" content="Quỹ đầu tư mạo hiểm phi tập trung trên Songbird Coston Testnet" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🚀</text></svg>" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}

export default MyApp