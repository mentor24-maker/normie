import Image from "next/image";
import Link from "next/link";
import { getPublicSocialLinkEntries, type PublicPlayerProfile } from "@/lib/public-player-profile";
import { PLAYER_SOCIAL_ICON_PATHS, type PlayerSocialFieldKey } from "@/lib/player-social-handles";

type PublicPlayerProfileViewProps = {
  profile: PublicPlayerProfile;
};

export function PublicPlayerProfileView({ profile }: PublicPlayerProfileViewProps) {
  const socialEntries = getPublicSocialLinkEntries(profile.socialLinks);
  const avatarUrl = profile.avatarUrl.trim();
  const initials = (profile.fullName || profile.handle || "?").slice(0, 1).toUpperCase();

  return (
    <div className="player-public-profile">
      {profile.isOwnerView && !profile.shareProfile ? (
        <div className="notice player-public-profile-notice">
          Your profile is private. Turn on Share Profile Info in the Player Portal to show this page to
          everyone.
        </div>
      ) : null}

      <section className="player-public-profile-hero panel player-panel">
        <div className="player-public-profile-hero-top">
          <div className="player-public-profile-identity">
            <p className="panel-label">Normie Player</p>
            <div className="player-public-profile-identity-body">
              <div className="player-public-profile-avatar" aria-hidden={!avatarUrl}>
                {avatarUrl ? (
                  <img alt="" className="player-public-profile-avatar-image" src={avatarUrl} />
                ) : (
                  <span className="player-public-profile-avatar-placeholder">{initials}</span>
                )}
              </div>
              <div className="player-public-profile-copy">
                <h1 className="player-public-profile-name">{profile.fullName}</h1>
                <p className="player-public-profile-handle">@{profile.handle}</p>
                {profile.bio ? <p className="player-public-profile-bio">{profile.bio}</p> : null}
              </div>
            </div>
          </div>

          <div className="player-public-profile-stats" aria-label="Player stats">
            <article className="scalar-metric-pod player-public-profile-stat player-public-profile-stat-sky">
              <span className="scalar-metric-pod-label player-public-profile-stat-label">Polls Taken</span>
              <strong className="scalar-metric-pod-value player-public-profile-stat-value">{profile.pollsTaken}</strong>
            </article>
            <article className="scalar-metric-pod player-public-profile-stat player-public-profile-stat-gold">
              <span className="scalar-metric-pod-label player-public-profile-stat-label">Points Earned</span>
              <strong className="scalar-metric-pod-value player-public-profile-stat-value">{profile.pointsEarned}</strong>
            </article>
            <article className="scalar-metric-pod player-public-profile-stat player-public-profile-stat-mint">
              <span className="scalar-metric-pod-label player-public-profile-stat-label">Leaderboard Position</span>
              <strong className="scalar-metric-pod-value player-public-profile-stat-value">
                {profile.leaderboardRank ? `#${profile.leaderboardRank}` : "New"}
              </strong>
            </article>
          </div>
        </div>
      </section>

      {socialEntries.length ? (
        <section className="panel player-panel player-public-profile-section">
          <div className="panel-label">Social Profiles</div>
          <h2>Connect</h2>
          <ul className="player-public-profile-social-icons" aria-label="Social profile links">
            {socialEntries.map((entry) => {
              const iconPath = PLAYER_SOCIAL_ICON_PATHS[entry.key as PlayerSocialFieldKey] ?? "";
              const linkBody = (
                <span className="player-public-profile-social-icon-shell">
                  {iconPath ? (
                    <Image alt="" aria-hidden height={34} src={iconPath} unoptimized width={34} />
                  ) : (
                    <span aria-hidden className="player-public-profile-social-icon-fallback">
                      {entry.label.slice(0, 1)}
                    </span>
                  )}
                </span>
              );

              return (
                <li key={entry.key}>
                  {entry.href ? (
                    <a
                      aria-label={entry.label}
                      className="player-public-profile-social-icon-link"
                      href={entry.href}
                      rel="noopener noreferrer"
                      target="_blank"
                      title={entry.label}
                    >
                      {linkBody}
                    </a>
                  ) : (
                    <span aria-label={entry.label} className="player-public-profile-social-icon-link" title={entry.label}>
                      {linkBody}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {profile.showPollResponses ? (
        <section className="panel player-panel player-public-profile-section">
          <div className="panel-label">Poll Responses</div>
          <h2>Recent Poll Choices</h2>
          {profile.recentAnswers.length ? (
            <div className="player-answer-list">
              {profile.recentAnswers.map((answer) => (
                <div className="player-answer-row" key={answer.id}>
                  <div>
                    <strong>{answer.question}</strong>
                    <span>{answer.category}</span>
                  </div>
                  <div className="player-answer-choice">{answer.answer}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="panel-copy">No registered poll answers yet.</p>
          )}
          {profile.isOwnerView && !profile.sharePollResponses ? (
            <p className="panel-copy player-public-profile-footnote">
              Poll responses are only visible to you until you enable Share Poll Responses in the Player Portal.
            </p>
          ) : null}
        </section>
      ) : null}

      {profile.isOwnerView ? (
        <div className="player-public-profile-actions">
          <Link className="secondary-button" href="/portal/profile">
            Edit Profile
          </Link>
          <Link className="submit-button" href="/portal/dashboard">
            Back to Portal
          </Link>
        </div>
      ) : (
        <div className="player-public-profile-actions">
          <Link className="submit-button" href="/portal">
            Join Normie
          </Link>
        </div>
      )}
    </div>
  );
}

export function PublicPlayerProfilePrivateView() {
  return (
    <section className="panel player-panel player-public-profile-private">
      <div className="panel-label">Player Profile</div>
      <h1>Profile Not Available</h1>
      <p className="panel-copy">
        This player has not shared their profile publicly. If you are the account owner, sign in and enable Share
        Profile Info on your profile settings.
      </p>
      <div className="player-public-profile-actions">
        <Link className="submit-button" href="/portal">
          Player Portal
        </Link>
      </div>
    </section>
  );
}

export function getPublicProfileTitle(profile: PublicPlayerProfile) {
  return `${profile.fullName} (@${profile.handle})`;
}
