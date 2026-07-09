import { DownloadContent, Routes, docsUrl } from "@gnovium/shared";
import PageWrapper from "@/components/PageWrapper";
import Footer from "@/components/Footer";
import ErrorBoundary from "@/components/ErrorBoundary";
import Breadcrumbs from "@/components/Breadcrumbs";

export default function DownloadPage() {
  return (
    <ErrorBoundary>
      <PageWrapper>
        <div className="max-w-5xl mx-auto space-y-6">
          <Breadcrumbs segments={[{ label: "Download", current: true }]} />
          <DownloadContent changelogHref={docsUrl(Routes.docs.changelog.build({}))} />
        </div>
        <Footer />
      </PageWrapper>
    </ErrorBoundary>
  );
}
