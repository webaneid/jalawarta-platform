import Script from "next/script";

type GoogleAnalyticsPluginProps = {
  measurementId?: string | null;
  gaMeasurementId?: string | null;
  gscVerificationId?: string | null;
};

/**
 * Add-on Google Search & Analytics
 * Sistem akan me-render nol bytes (zero-overhead) jika tenant tidak memasukkan ID
 */
export function GoogleAnalyticsPlugin({ 
  measurementId, 
  gaMeasurementId, 
  gscVerificationId 
}: GoogleAnalyticsPluginProps) {
  const activeGAId = gaMeasurementId || measurementId;

  return (
    <>
      {/* ── Google Search Console Verification ── */}
      {gscVerificationId && (
        <meta name="google-site-verification" content={gscVerificationId} />
      )}

      {/* ── Google Analytics 4 ── */}
      {activeGAId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${activeGAId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){window.dataLayer.push(arguments);}
              gtag('js', new Date());

              gtag('config', '${activeGAId}');
            `}
          </Script>
        </>
      )}
    </>
  );
}
