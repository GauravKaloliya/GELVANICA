'use client';

import { ErrorContent } from '@gnovium/shared';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorContent error={error} reset={reset} />;
}
