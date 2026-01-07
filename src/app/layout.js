import "./globals.css";
import LayoutWrapper from '@/components/layouts/LayoutWrapper';


export const metadata = {
  title: "Gallo Legal Services",
  description: "Gallo Legal Services - Workflow Portal",
  icons: {
    icon: '/logo.svg',
    shortcut: '/logo.svg',
    apple: '/logo.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  );
}
