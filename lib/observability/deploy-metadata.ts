export function getDeployMetadata() {
  return {
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    deploymentUrl: process.env.VERCEL_URL ?? null
  };
}
