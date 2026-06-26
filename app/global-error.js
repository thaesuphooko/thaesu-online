'use client';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({ error }) {
  Sentry.captureException(error);
  return <html><body><p>An error occurred</p></body></html>;
}
