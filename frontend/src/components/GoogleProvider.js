'use client';

import { GoogleOAuthProvider } from '@react-oauth/google';

export default function GoogleProvider({ children }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Only wrap with GoogleOAuthProvider if a real client ID is configured
  // This prevents a crash when the env var is missing or set to the placeholder
  const isConfigured = clientId && !clientId.startsWith('your-');

  if (!isConfigured) {
    return <>{children}</>;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>
  );
}
