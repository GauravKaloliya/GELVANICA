import { DownloadContent, docsUrl, Routes } from "@gnovium/shared";

export default function DownloadPage() {
  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <DownloadContent changelogHref={docsUrl(Routes.docs.changelog.build({}))} />
    </div>
  );
}
