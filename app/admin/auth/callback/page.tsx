import { AdminOauthCallback } from "@/components/admin-oauth-callback";
import { getSiteUrl } from "@/lib/site-url";

const canonicalOrigin = getSiteUrl();

export default function AdminAuthCallbackPage() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var canonical=${JSON.stringify(canonicalOrigin)};var hash=window.location.hash;if(hash.length>1&&window.location.origin!==canonical){window.location.replace(canonical+window.location.pathname+window.location.search+hash);}})();`
        }}
      />
      <AdminOauthCallback />
    </>
  );
}
