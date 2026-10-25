import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// This file is web-only and used to configure the root HTML for every web page during static rendering.
// The contents of this function only run in Node.js environments and do not have access to the DOM or browser APIs.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="description" content="TheBucketList: Your life, your bucket list." />
        <meta name="theme-color" content="#E8652A" />

        {/* 
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native. 
          However, body scrolling is often nice to have for web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Ocultar barra de scroll en modo web manteniendo el desplazamiento funcional */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              *::-webkit-scrollbar {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
              }
              * {
                -ms-overflow-style: none !important;
                scrollbar-width: none !important;
              }
              html, body {
                scrollbar-width: none !important;
                -ms-overflow-style: none !important;
                overflow-x: hidden;
                overscroll-behavior-y: none !important;
                overscroll-behavior: none !important;
              }
              #root, #__next, [data-reactroot] {
                overscroll-behavior-y: none !important;
                overscroll-behavior: none !important;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
