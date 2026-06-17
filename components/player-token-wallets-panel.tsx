"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { NormieDexscreenerEmbed } from "@/components/normie-dexscreener-embed";
import { buildNormieWalletHolderExplorerUrl } from "@/lib/solana-wallet-links";
import type { NormieWalletBalanceRow } from "@/lib/normie-wallet-balances";
import {
  MAX_PLAYER_CRYPTO_WALLETS,
  type PlayerCryptoWallets
} from "@/lib/player-crypto-wallets";
import type { PlayerCryptoWalletBalancesResponse } from "@/lib/player-crypto-wallet-balances-api";
import { sumWalletBalancesUsd } from "@/lib/normie-token-price";
import { formatNormieTokenAmount } from "@/lib/normie-wallet-balances";
import {
  NORMIE_HOLDERS_BACK_ROOM_TITLE,
  NORMIE_HOLDERS_BACK_ROOM_WELCOME,
  NORMIE_HOLDERS_HANGOUT_INTRO,
  NORMIE_HOLDERS_HANGOUT_TITLE,
  NORMIE_TOKEN_SYMBOL
} from "@/lib/normie-token";
import normieHangoutLogo from "@/images/logo_normie_3_square.png";

type PlayerTokenWalletsPanelProps = {
  initialWallets: PlayerCryptoWallets;
};

function formatBalancesTimestamp(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function PlayerTokenWalletsPanel({ initialWallets }: PlayerTokenWalletsPanelProps) {
  const router = useRouter();
  const [wallets, setWallets] = useState(initialWallets.wallets);
  const [walletAddress, setWalletAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingAddress, setRemovingAddress] = useState<string | null>(null);
  const [balances, setBalances] = useState<PlayerCryptoWalletBalancesResponse | null>(null);
  const [balancesError, setBalancesError] = useState<string | null>(null);
  const [balancesNotice, setBalancesNotice] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const [balancesGeneration, setBalancesGeneration] = useState(0);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [isRefreshingBalances, setIsRefreshingBalances] = useState(false);
  const balancesRequestIdRef = useRef(0);
  const balancesAbortRef = useRef<AbortController | null>(null);
  const skipAutoFetchRef = useRef(false);
  const walletsRef = useRef(wallets);
  const hasHolderAccess = wallets.length > 0;
  const walletListKey = wallets.join("|");

  walletsRef.current = wallets;

  const fetchBalances = useCallback(async (refresh = false) => {
    const currentWallets = walletsRef.current;

    if (currentWallets.length === 0) {
      setBalances(null);
      setBalancesError(null);
      setBalancesNotice(null);
      setIsLoadingBalances(false);
      setIsRefreshingBalances(false);
      return;
    }

    balancesAbortRef.current?.abort();
    const controller = new AbortController();
    balancesAbortRef.current = controller;
    const requestId = ++balancesRequestIdRef.current;

    setIsLoadingBalances(true);
    if (refresh) {
      setIsRefreshingBalances(true);
      setBalancesNotice(null);
    }
    setBalancesError(null);

    try {
      const requests: [
        Promise<Response>,
        Promise<Response | null>
      ] = [
        refresh
          ? fetch("/api/player/crypto-wallets/balances", {
              method: "POST",
              credentials: "same-origin",
              cache: "no-store",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal
            })
          : fetch("/api/player/crypto-wallets/balances", {
              credentials: "same-origin",
              cache: "no-store",
              signal: controller.signal
            }),
        refresh
          ? fetch("/api/player/crypto-wallets", {
              credentials: "same-origin",
              cache: "no-store",
              signal: controller.signal
            })
          : Promise.resolve(null)
      ];

      const [balancesResponse, walletsResponse] = await Promise.all(requests);
      const payload = (await balancesResponse.json()) as {
        error?: string;
        data?: PlayerCryptoWalletBalancesResponse;
      };

      if (requestId !== balancesRequestIdRef.current) {
        return;
      }

      if (!balancesResponse.ok) {
        throw new Error(payload.error ?? "Wallets balances could not be loaded.");
      }

      if (walletsResponse?.ok) {
        const walletsPayload = (await walletsResponse.json()) as {
          data?: PlayerCryptoWallets;
        };

        if (walletsPayload.data?.wallets) {
          setWallets(walletsPayload.data.wallets);
        }
      }

      const nextBalances = payload.data
        ? {
            ...payload.data,
            wallets: payload.data.wallets.map((wallet) => ({ ...wallet }))
          }
        : null;

      setBalances(nextBalances);
      setBalancesGeneration((generation) => generation + 1);

      if (refresh) {
        skipAutoFetchRef.current = true;
        setLastRefreshedAt(new Date().toISOString());
        setBalancesNotice("Balances refreshed.");
      }
    } catch (loadError) {
      if (controller.signal.aborted || requestId !== balancesRequestIdRef.current) {
        return;
      }

      setBalances(null);
      setBalancesError(
        loadError instanceof Error ? loadError.message : "Wallets balances could not be loaded."
      );
    } finally {
      if (requestId === balancesRequestIdRef.current) {
        setIsLoadingBalances(false);
        setIsRefreshingBalances(false);
      }
    }
  }, []);

  useEffect(() => {
    if (skipAutoFetchRef.current) {
      skipAutoFetchRef.current = false;
      return;
    }

    void fetchBalances(false);
  }, [walletListKey, fetchBalances]);

  const walletRowsForDisplay = useMemo((): NormieWalletBalanceRow[] => {
    if (balances?.wallets?.length) {
      return balances.wallets;
    }

    return wallets.map((address) => ({
      address,
      amountRaw: "0",
      amountFormatted: "0",
      amountUsdFormatted: null
    }));
  }, [balances, balancesGeneration, wallets]);

  const totalFormatted = useMemo(() => {
    if (!walletRowsForDisplay.length) {
      return "0";
    }

    const totalRaw = walletRowsForDisplay.reduce((sum, row) => {
      if (row.error) {
        return sum;
      }

      return sum + BigInt(row.amountRaw.replace(/\D/g, "") || "0");
    }, BigInt(0));

    return formatNormieTokenAmount(totalRaw.toString(), balances?.decimals ?? 6);
  }, [balances?.decimals, walletRowsForDisplay]);

  const totalUsdFormatted = useMemo(() => {
    if (!walletRowsForDisplay.length) {
      return null;
    }

    return sumWalletBalancesUsd(walletRowsForDisplay, balances?.tokenPriceUsd ?? null);
  }, [balances?.tokenPriceUsd, walletRowsForDisplay]);

  async function handleRegisterWallet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/player/crypto-wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ address: walletAddress })
      });
      const data = (await response.json()) as {
        error?: string;
        data?: PlayerCryptoWallets;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Wallets could not be registered.");
      }

      if (data.data) {
        skipAutoFetchRef.current = true;
        setWallets(data.data.wallets);
      }

      setWalletAddress("");
      setNotice("Wallets registered. Welcome to the Back Room.");
      router.refresh();
      await fetchBalances(true);
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "Wallets could not be registered.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveWallet(address: string) {
    setError(null);
    setNotice(null);
    setRemovingAddress(address);

    try {
      const response = await fetch("/api/player/crypto-wallets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ address })
      });
      const data = (await response.json()) as {
        error?: string;
        data?: PlayerCryptoWallets;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Wallets could not be removed.");
      }

      if (data.data) {
        skipAutoFetchRef.current = true;
        setWallets(data.data.wallets);
      }

      setNotice("Wallets removed.");
      router.refresh();
      await fetchBalances(true);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Wallets could not be removed.");
    } finally {
      setRemovingAddress(null);
    }
  }

  return (
    <section className="player-token-page">
      <div className="player-token-hangout-grid">
        <article className="panel player-panel player-token-hangout-intro">
          <div className="player-token-hangout-brand">
            <Image
              alt="Normie mascot"
              className="player-token-hangout-logo"
              height={110}
              priority
              src={normieHangoutLogo}
              width={110}
            />
          </div>
          <div className="panel-label">Token</div>
          <h2>{NORMIE_HOLDERS_HANGOUT_TITLE}</h2>
          <p className="panel-copy">{NORMIE_HOLDERS_HANGOUT_INTRO}</p>
          <p className="panel-copy player-token-disclaimer">
            Register Solana wallets that hold {NORMIE_TOKEN_SYMBOL} to unlock the Back Room. This area is for
            community utility only, not financial advice.
          </p>
        </article>

        <div className="player-token-register-column">
          <article className="panel player-panel player-token-register-pod">
            <div className="panel-label">Wallets</div>
            <h2 className="player-token-register-heading">Register Your Wallets</h2>
            <p className="panel-copy">
              Add the Solana wallet addresses that hold your {NORMIE_TOKEN_SYMBOL}. Register up to{" "}
              {MAX_PLAYER_CRYPTO_WALLETS} wallets.
            </p>

            <form className="player-token-wallet-form" onSubmit={(event) => void handleRegisterWallet(event)}>
              {error ? <div className="notice error admin-notice">{error}</div> : null}
              {notice ? <div className="notice success admin-notice">{notice}</div> : null}

              <input
                aria-label="Solana wallet address"
                className="player-form-control player-token-register-input"
                onChange={(event) => setWalletAddress(event.target.value)}
                placeholder="Solana wallet address"
                spellCheck={false}
                value={walletAddress}
              />

              <div className="player-token-wallet-actions">
                <button
                  className="submit-button admin-blog-add-button"
                  disabled={isSubmitting || wallets.length >= MAX_PLAYER_CRYPTO_WALLETS}
                  type="submit"
                >
                  Register Wallet
                </button>
              </div>
            </form>
          </article>

          <div className="player-token-tokenomics-row">
            <Link className="player-token-tokenomics-link" href="/tokenomics">
              Read Tokenomics
            </Link>
          </div>
        </div>
      </div>

      <article className="panel player-panel player-token-registered-wallets">
        <div className="player-token-wallet-list-header">
              <div>
                <div className="panel-label">Registered Wallets</div>
                <h2>Your Registered Wallets</h2>
              </div>
              {wallets.length > 0 ? (
                <button
                  className="secondary-button"
                  disabled={isLoadingBalances || isRefreshingBalances}
                  onClick={() => void fetchBalances(true)}
                  type="button"
                >
                  {isRefreshingBalances ? "Refreshing..." : "Refresh Balances"}
                </button>
              ) : null}
            </div>

            {wallets.length === 0 ? (
              <p className="panel-copy">No wallets registered yet. Add your first wallets to open the Back Room.</p>
            ) : (
              <>
                {balancesError ? <div className="notice error admin-notice">{balancesError}</div> : null}
                {balancesNotice ? <div className="notice success admin-notice">{balancesNotice}</div> : null}
                {balances?.fetchedAt ? (
                  <p className="player-token-balances-meta">
                    Balances as of {formatBalancesTimestamp(balances.fetchedAt)}
                    {balances.chainSlot ? ` — Solana slot ${balances.chainSlot.toLocaleString("en-US")}` : null}
                    {lastRefreshedAt
                      ? ` — refreshed ${formatBalancesTimestamp(lastRefreshedAt)}`
                      : null}
                    {!balances.configured
                      ? ` — ${balances.rpcDiagnostics.hint ?? "Solana RPC is not configured on the server."}`
                      : null}
                    {balances.tokenPriceUsd
                      ? ` — ${NORMIE_TOKEN_SYMBOL} price ${balances.tokenPriceUsd.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 8
                        })} via ${balances.tokenPriceSource === "jupiter" ? "Jupiter" : "Dexscreener"}`
                      : balances.priceDiagnostics?.hint
                        ? ` — ${balances.priceDiagnostics.hint}`
                        : " — USD price unavailable"}
                  </p>
                ) : null}

                <div className="player-token-wallet-table" role="table" aria-label="Registered wallets balances">
                  <div className="player-token-wallet-table-head" role="row">
                    <span role="columnheader">Wallets Address</span>
                    <span role="columnheader">{NORMIE_TOKEN_SYMBOL} Held</span>
                    <span role="columnheader">USD Value</span>
                    <span className="player-token-wallet-table-actions-head" role="columnheader">
                      <span className="sr-only">Actions</span>
                    </span>
                  </div>

                  {walletRowsForDisplay.map((row) => {
                    const address = row.address;
                    const balanceUnavailable = Boolean(row.error);
                    const showLoading = isRefreshingBalances || (isLoadingBalances && !balances);
                    const balanceLabel = showLoading
                      ? "Loading..."
                      : balanceUnavailable
                        ? "Unavailable"
                        : row.amountFormatted;
                    const usdLabel = showLoading
                      ? "Loading..."
                      : balanceUnavailable
                        ? "Unavailable"
                        : row.amountUsdFormatted ??
                          (balances?.tokenPriceUsd ? "—" : balances?.priceDiagnostics?.hint ?? "Unavailable");
                    const errorDetail = row.error ?? "";
                    const rowKey = `${balancesGeneration}-${address}-${row.amountRaw}`;

                    return (
                      <div className="player-token-wallet-table-row" key={rowKey} role="row">
                        <PlayerTokenWalletAddressCell address={address} />
                        <div
                          className="player-token-wallet-balance"
                          role="cell"
                          title={balanceUnavailable ? errorDetail : undefined}
                        >
                          {showLoading || balanceUnavailable ? (
                            balanceLabel
                          ) : (
                            <a
                              className="player-token-wallet-balance-link"
                              href={buildNormieWalletHolderExplorerUrl(address)}
                              rel="noopener noreferrer"
                              target="_blank"
                              title={`View ${NORMIE_TOKEN_SYMBOL} holdings on Solscan`}
                            >
                              {balanceLabel}
                            </a>
                          )}
                        </div>
                        <div
                          className="player-token-wallet-usd"
                          role="cell"
                          title={balanceUnavailable ? errorDetail : undefined}
                        >
                          {usdLabel}
                        </div>
                        <div className="player-token-wallet-table-actions crud-actions-cell" role="cell">
                          <button
                            className="polls-icon-button polls-icon-button-danger polls-icon-button-delete"
                            disabled={removingAddress === address}
                            onClick={() => void handleRemoveWallet(address)}
                            type="button"
                            aria-label="Delete"
                            title="Delete"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <div className="player-token-wallet-table-foot" role="row">
                    <span role="cell">Total Across Wallets</span>
                    <strong className="player-token-wallet-balance-total" role="cell">
                      {isRefreshingBalances || (isLoadingBalances && !balances) ? "Loading..." : totalFormatted}
                    </strong>
                    <strong className="player-token-wallet-usd-total" role="cell">
                      {isRefreshingBalances || (isLoadingBalances && !balances)
                        ? "Loading..."
                        : totalUsdFormatted ?? "—"}
                    </strong>
                    <span role="cell" />
                  </div>
                </div>
              </>
            )}
      </article>

      {hasHolderAccess ? (
        <article className="panel player-panel player-token-back-room">
          <div className="panel-label">Back Room</div>
          <h2>{NORMIE_HOLDERS_BACK_ROOM_TITLE}</h2>
          <p className="panel-copy">{NORMIE_HOLDERS_BACK_ROOM_WELCOME}</p>
          <NormieDexscreenerEmbed />
        </article>
      ) : null}
    </section>
  );
}

function PlayerTokenWalletAddressCell({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="player-token-wallet-address-cell" role="cell">
      <button
        className="polls-icon-button polls-icon-button-view player-token-wallet-copy-button"
        onClick={() => void handleCopy()}
        type="button"
        aria-label={copied ? "Wallet address copied" : "Copy wallet address"}
        title={copied ? "Copied" : "Copy"}
      >
        {copied ? "✓" : "⧉"}
      </button>
      <code className="player-token-wallet-address">{address}</code>
    </div>
  );
}
