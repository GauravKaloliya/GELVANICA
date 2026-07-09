window.addEventListener("error", (event) => {
  console.error("[ErrorHandler]", event.error?.message || event.message);
  if (window.electronErrorReporter) {
    window.electronErrorReporter.reportError({
      message: event.error?.message || String(event.message),
      stack: event.error?.stack,
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  }
});

window.addEventListener("unhandledrejection", (event) => {
  const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
  console.error("[ErrorHandler] Unhandled rejection:", error.message);
  if (window.electronErrorReporter) {
    window.electronErrorReporter.reportUnhandledRejection({
      message: error.message,
      stack: error.stack,
    });
  }
});
