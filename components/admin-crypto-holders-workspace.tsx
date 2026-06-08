"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { readAdminJson } from "@/lib/admin-fetch";
import type { AdminCryptoHolderRow, AdminCryptoHoldersSnapshot } from "@/lib/admin-crypto-holders";
import { NORMIE_TOKEN_SYMBOL } from "@/lib/normie-token";
import { sumWalletBalancesUsd } from "@/lib/normie-token-price";
import { formatNormieTokenAmount } from "@/lib/normie-wallet-balances";
import { buildNormieWalletSendUrl } from "@/lib/solana-wallet-links";

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function AdminCryptoHoldersWorkspace() {
  const [snapshot, setSnapshot] = useState<AdminCryptoHoldersSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHolders = useCallback(async (refresh = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = refresh ? "/api/admin/crypto/holders?refresh=1" : "/api/admin/crypto/holders";
      const response = await fetch(url, { cache: "no-store" });
      const data = await readAdminJson<{ data?: AdminCryptoHoldersSnapshot }>(
        response,
        "Crypto holders could not be loaded."
      );

      setSnapshot(data.data ?? null);
    } catch (loadError) {
      setSnapshot(null);
      setError(loadError instanceof Error ? loadError.message : "Crypto holders could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHolders(false);
  }, [loadHolders]);

  const summary = snapshot
    ? `${snapshot.playerCount} player${snapshot.playerCount === 1 ? "" : "s"}, ${snapshot.walletCount} registered wallet${snapshot.walletCount === 1 ? "" : "s"}`
    : isLoading
      ? "Loading holders..."
      : "No holder data loaded";

  const totals = useMemo(() => {
    if (!snapshot?.rows.length) {
      return { normieTotal: "0", usdTotal: null as string | null };
    }

    const totalRaw = snapshot.rows.reduce((sum, row) => {
      if (row.error) {
        return sum;
      }

      return sum + BigInt(row.amountRaw.replace(/\D/g, "") || "0");
    }, BigInt(0));

    const normieTotal = formatNormieTokenAmount(totalRaw.toString(), snapshot.decimals);
    const walletRows = snapshot.rows.map((row) => ({
      address: row.walletAddress,
      amountRaw: row.amountRaw,
      amountFormatted: row.amountFormatted,
      amountUsdFormatted: row.amountUsdFormatted,
      error: row.error
    }));
    const usdTotal = sumWalletBalancesUsd(walletRows, snapshot.tokenPriceUsd, snapshot.decimals);

    return { normieTotal, usdTotal };
  }, [snapshot]);

  return (
    <section className="admin-stack">
      <section className="admin-section">
        <div className="admin-toolbar">
          <div>
            <div className="panel-label">Crypto</div>
            <h2>$NORMIE Holders Directory</h2>
            <p className="page-copy admin-copy">
              Registered players with linked Solana wallets, live {NORMIE_TOKEN_SYMBOL} balances, and USD
              estimates. Click a wallet address to send {NORMIE_TOKEN_SYMBOL} from your Solana wallet.
            </p>
            <p className="page-copy admin-copy">{summary}</p>
          </div>
          <div className="admin-actions">
            <button
              className="secondary-button"
              disabled={isLoading}
              onClick={() => void loadHolders(true)}
              type="button"
            >
              {isLoading ? "Refreshing..." : "Refresh Balances"}
            </button>
          </div>
        </div>

        {snapshot?.fetchedAt ? (
          <p className="page-copy admin-copy admin-crypto-holders-meta">
            Balances as of {formatTimestamp(snapshot.fetchedAt)}
            {snapshot.tokenPriceUsd
              ? ` — ${NORMIE_TOKEN_SYMBOL} price ${snapshot.tokenPriceUsd.toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 8
                })} via ${snapshot.tokenPriceSource === "jupiter" ? "Jupiter" : "Dexscreener"}`
              : null}
            {snapshot.priceDiagnostics.hint ? ` — ${snapshot.priceDiagnostics.hint}` : null}
            {!snapshot.configured ? ` — ${snapshot.rpcDiagnostics.hint ?? "Solana RPC is not configured."}` : null}
          </p>
        ) : null}

        {error ? <div className="notice error admin-notice">{error}</div> : null}
      </section>

      <section className="admin-section">
        <div className="table-shell">
          <table className="polls-table admin-crypto-holders-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Email</th>
                <th>Handle</th>
                <th>Wallets Address</th>
                <th>{NORMIE_TOKEN_SYMBOL} Held</th>
                <th>USD Value</th>
              </tr>
            </thead>
            <tbody>
              {(snapshot?.rows ?? []).map((row) => (
                <AdminCryptoHolderTableRow key={`${row.userId}-${row.walletAddress || "none"}`} row={row} />
              ))}
              {!isLoading && (snapshot?.rows.length ?? 0) === 0 ? (
                <tr>
                  <td className="empty-cell" colSpan={6}>
                    No players with registered wallets found.
                  </td>
                </tr>
              ) : null}
            </tbody>
            {(snapshot?.rows.length ?? 0) > 0 ? (
              <tfoot>
                <tr className="admin-crypto-holders-table-foot">
                  <td colSpan={4}>
                    <strong>Total Registered Wallets</strong>
                  </td>
                  <td>
                    <strong>{totals.normieTotal}</strong>
                  </td>
                  <td>
                    <strong>{totals.usdTotal ?? "—"}</strong>
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>
    </section>
  );
}

function AdminCryptoHolderTableRow({ row }: { row: AdminCryptoHolderRow }) {
  const balanceLabel = row.error ? "Unavailable" : row.amountFormatted;
  const usdLabel = row.error ? "Unavailable" : row.amountUsdFormatted ?? "—";
  const profileHref = `/admin/users?user=${encodeURIComponent(row.userId)}`;
  const sendHref = buildNormieWalletSendUrl(row.walletAddress);

  return (
    <tr>
      <td>
        <Link className="admin-crypto-holder-name-link" href={profileHref}>
          <strong>{row.fullName}</strong>
        </Link>
      </td>
      <td>{row.email}</td>
      <td>{row.handle && row.handle !== "—" ? `@${row.handle}` : "—"}</td>
      <td>
        <a
          className="admin-crypto-wallet-send-link"
          href={sendHref}
          rel="noopener noreferrer"
          title={`Send ${NORMIE_TOKEN_SYMBOL} in Phantom, Solflare, or another Solana wallet`}
        >
          <code className="admin-crypto-wallet-address">{row.walletAddress}</code>
        </a>
      </td>
      <td title={row.error}>{balanceLabel}</td>
      <td title={row.error}>{usdLabel}</td>
    </tr>
  );
}
