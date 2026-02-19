CREATE TABLE IF NOT EXISTS party_game_templates (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL DEFAULT 'amen',
  title TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '',
  description TEXT,
  mechanic TEXT,
  content_pack TEXT NOT NULL,
  min_players INTEGER NOT NULL DEFAULT 2,
  max_players INTEGER NOT NULL DEFAULT 8,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_party_game_templates_brand ON party_game_templates(brand_id);
CREATE INDEX IF NOT EXISTS idx_party_game_templates_active ON party_game_templates(is_active);

INSERT OR REPLACE INTO party_game_templates (id, brand_id, title, emoji, description, mechanic, content_pack, min_players, max_players, is_active, sort_order) VALUES
  ('quiplash', 'amen', 'The Fellowship Table', '🍞', 'Answer funny prompts and vote for the best response', 'Players receive prompts and write funny answers. Everyone votes on favorites.', 'quip', 3, 8, 1, 1),
  ('half-and-half', 'amen', 'The Mediator', '⚖️', 'Fill in the blank with competing answers', 'Complete partial prompts. Two answers face off and the audience picks the winner.', 'quip', 3, 8, 1, 2),
  ('about-you-bluff', 'amen', 'Testimony or Tale?', '🎭', 'Guess which personal stories are real or fake', 'One player shares a story. Others guess if it is a real testimony or a crafted tale.', 'quip', 3, 8, 1, 3),
  ('role-replay', 'amen', 'Fruits of the Spirit', '🍇', 'Roleplay scenarios embodying virtues', 'Players act out scenarios demonstrating love, joy, peace, patience, and other fruits of the Spirit.', 'quip', 3, 8, 1, 4),
  ('ruin-and-redeem', 'amen', 'Grace & Mischief', '😈', 'Sabotage and save answers in turns', 'One player ruins an answer, another redeems it. The audience judges the transformation.', 'quip', 3, 8, 1, 5),
  ('chain-reaction', 'amen', 'The Word Chain', '🔗', 'Build chain-linked word associations', 'Players link words together in a chain. Guess the connections your friends will make.', 'quip', 2, 8, 1, 6),
  ('quickfire-qa', 'amen', 'The Great Hall of Wisdom', '📜', 'Fast-paced trivia with Biblical and general knowledge', 'Rapid-fire trivia questions. Answer quickly for bonus points.', 'trivia', 2, 12, 1, 7),
  ('truth-trap', 'amen', 'Scrolls of Truth', '📖', 'Spot the real answer among convincing fakes', 'One answer is true, the rest are bluffs. Can you discern truth from fiction?', 'fibbage', 3, 8, 1, 8),
  ('year-jinx', 'amen', 'Solomon''s Bet', '🎲', 'Wager on numerical estimates', 'Guess numbers and dates. Wager your points on how confident you are.', 'wager', 1, 8, 1, 9),
  ('drawful-animate', 'amen', 'Illustrated Scripture', '🎨', 'Draw prompts and guess what others drew', 'Draw a Biblical scene or concept. Others guess what you illustrated.', 'drawing', 3, 8, 1, 10),
  ('sketch-bluff', 'amen', 'Draw & Discern', '✏️', 'Draw and bluff your way to victory', 'Draw the prompt, then write fake titles for others'' drawings. Spot the real one.', 'drawing', 3, 8, 1, 11),
  ('consensus-mine', 'amen', 'The Council', '🏛️', 'Rank items and find consensus', 'Everyone ranks the same items. Score points by matching the group consensus.', 'ranking', 2, 10, 1, 12),
  ('headsUp', 'amen', 'Who Am I?', '👤', 'Guess the person or thing on your head', 'A word is on your forehead. Your friends give clues while you guess.', 'headsup', 2, 12, 1, 13);
