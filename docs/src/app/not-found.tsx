'use client';

import { NotFoundContent } from '@gnovium/shared';

export default function NotFound() {
  return (
    <NotFoundContent
      message="This page doesn't exist. The API documentation is all on one page — start from the home page."
      linkHref="/"
      linkLabel="Go to Docs"
    />
  );
}
