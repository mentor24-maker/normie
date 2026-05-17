export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { logInfo } = await import("@/lib/observability/logger");
  const { getDeployMetadata } = await import("@/lib/observability/deploy-metadata");

  logInfo("server.start", getDeployMetadata());
}
