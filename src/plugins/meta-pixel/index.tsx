import Script from "next/script";

export type MetaPixelPluginProps = {
  pixelId?: string | null;
  enableAdvancedMatching?: boolean;
};

/**
 * Add-on Meta Pixel
 * Menyuntikkan Facebook Pixel Base Code ke dalam header untuk standarisasi tracking.
 */
export function MetaPixelPlugin({ 
  pixelId, 
  enableAdvancedMatching = false 
}: MetaPixelPluginProps) {
  if (!pixelId) return null;

  // Opsi inisialisasi dengan atau tanpa data pengguna (Advanced Matching)
  // Untuk MVP ini, advanced matching dibiarkan kosong {} tanpa data PII,
  // namun struktur disiapkan untuk pengembangan selanjutnya.
  const initArgs = enableAdvancedMatching ? `, {}` : "";

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}'${initArgs});
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        <img 
          height="1" 
          width="1" 
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
