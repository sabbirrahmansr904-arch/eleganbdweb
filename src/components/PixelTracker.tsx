import { useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function PixelTracker() {
  useEffect(() => {
    const initializeTracking = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'config', 'pixel_analytics'));
        if (!docSnap.exists()) return;

        const data = docSnap.data();

        // 1. Facebook Pixel
        if (data.facebookPixelId) {
          const fbId = data.facebookPixelId.trim();
          if (fbId && !window.hasOwnProperty('fbq')) {
            (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
              if (f.fbq) return;
              n = f.fbq = function() {
                n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
              };
              if (!f._fbq) f._fbq = n;
              n.push = n;
              n.loaded = !0;
              n.version = '2.0';
              n.queue = [];
              t = b.createElement(e);
              t.async = !0;
              t.src = v;
              s = b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t, s);
            })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
            
            // @ts-ignore
            window.fbq('init', fbId);
            // @ts-ignore
            window.fbq('track', 'PageView');
          }
        }

        // 2. Google Analytics 4 (gtag.js)
        if (data.googleAnalyticsId) {
          const gaId = data.googleAnalyticsId.trim();
          if (gaId) {
            const script1 = document.createElement('script');
            script1.async = true;
            script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
            document.head.appendChild(script1);

            const script2 = document.createElement('script');
            script2.innerHTML = `
              window.dataLayer = window.dataLayer || [];
              function gtag(){window.dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `;
            document.head.appendChild(script2);
          }
        }

        // 3. Google Tag Manager
        if (data.gtmId) {
          const gtmId = data.gtmId.trim();
          if (gtmId) {
            const script = document.createElement('script');
            script.innerHTML = `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${gtmId}');
            `;
            document.head.appendChild(script);
          }
        }

        // 4. Google Ads
        if (data.googleAdsId) {
          const adsId = data.googleAdsId.trim();
          if (adsId) {
            // @ts-ignore
            if (!window.gtag) {
              const script1 = document.createElement('script');
              script1.async = true;
              script1.src = `https://www.googletagmanager.com/gtag/js?id=${adsId}`;
              document.head.appendChild(script1);

              const script2 = document.createElement('script');
              script2.innerHTML = `
                window.dataLayer = window.dataLayer || [];
                function gtag(){window.dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${adsId}');
              `;
              document.head.appendChild(script2);
            } else {
              // @ts-ignore
              window.gtag('config', adsId);
            }
          }
        }

      } catch (err) {
        console.error('Error loading or executing tracking scripts:', err);
      }
    };

    initializeTracking();
  }, []);

  return null;
}
