import { useState } from 'react';
import { computeTrendingTopics } from '../../engine';
import { PLAYER_TWEET_OPTIONS } from '../../content/socialMedia/playerTweetOptions';
import { useStatecraftStore } from '../store';

export function ChirpPanel() {
  const game = useStatecraftStore((s) => s.game);
  const lastTweetOutcome = useStatecraftStore((s) => s.lastTweetOutcome);
  const postTweetAction = useStatecraftStore((s) => s.postTweetAction);

  const [selectedOptionId, setSelectedOptionId] = useState(PLAYER_TWEET_OPTIONS[0].id);

  if (!game) return null;

  const { socialMedia } = game;
  const trendingTopics = computeTrendingTopics(game);
  const feed = [...socialMedia.posts].reverse();

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Chirp</h2>
        <span className="muted">What people are saying about your run</span>
      </div>

      <div className="indicator-grid">
        <div className="indicator">
          <div className="indicator-label">Followers</div>
          <div className="indicator-value">{socialMedia.followerCount.toLocaleString()}</div>
        </div>
        <div className="indicator">
          <div className="indicator-label">Trending</div>
          <div className="indicator-value">{trendingTopics.join(' ')}</div>
        </div>
      </div>

      <div className="custom-bill-form">
        <label>
          Post something
          <select value={selectedOptionId} onChange={(e) => setSelectedOptionId(e.target.value)}>
            {PLAYER_TWEET_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.content}
              </option>
            ))}
          </select>
        </label>
        <div className="bill-actions">
          <button onClick={() => postTweetAction(selectedOptionId)}>Post</button>
        </div>
        {lastTweetOutcome && !lastTweetOutcome.success && (
          <p className="result-fail">Couldn't post that one — try again.</p>
        )}
      </div>

      {feed.length === 0 && <p className="muted">Nothing in the feed yet — advance a turn to see reactions roll in.</p>}

      <ul className="scandal-list">
        {feed.map((post) => (
          <li className="scandal-item" key={post.id}>
            <span>
              {post.avatar} <strong>{post.authorName}</strong> <span className="muted">{post.handle}</span>
            </span>
            <p>{post.content}</p>
            <span className="muted">
              ❤ {post.likes.toLocaleString()} &middot; 🔁 {post.reposts.toLocaleString()} &middot; {post.topic}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
