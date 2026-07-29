import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import GoogleProvider from '../components/GoogleProvider';

export const metadata = {
  title: 'SentinelAI — AI-Powered Security Operations Center',
  description: 'Advanced SOC platform combining AI-driven threat detection, log analysis, and incident investigation for security analysts.',
  keywords: 'SOC, security, AI, threat detection, log analysis, SIEM',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0a0e1a" />
      </head>
      <body>
        <GoogleProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </GoogleProvider>
      </body>
    </html>
  );
}
