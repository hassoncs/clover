-- Slopcade game templates: 13 games with Jackbox-style party game theming
-- Uses s- prefixed IDs to avoid collision with Amen templates

INSERT OR REPLACE INTO party_game_templates (id, brand_id, title, emoji, description, mechanic, content_pack, min_players, max_players, is_active, sort_order)
VALUES
  ('s-quiplash', 'slopcade', 'Slop Drop', '🧪', 'Answer cursed prompts and vote for the funniest reply', 'Players get fill-in-the-blank prompts and vote on the best answers.', 'quip', 3, 8, 1, 1),
  ('s-half-and-half', 'slopcade', 'Face Off', '🥊', 'Two players clash with competing answers', 'Two answers go head-to-head while everyone votes for the winner.', 'quip', 3, 8, 1, 2),
  ('s-about-you-bluff', 'slopcade', 'Cap or Fact?', '🧢', 'Tell stories and spot the bluff', 'One story is real, the rest are fake. Fool friends or find the truth.', 'quip', 3, 8, 1, 3),
  ('s-role-replay', 'slopcade', 'Main Character Energy', '🎬', 'Roleplay absurd internet-coded scenarios', 'Players respond in-character to chaotic prompts and the room votes.', 'quip', 3, 8, 1, 4),
  ('s-ruin-and-redeem', 'slopcade', 'Wreck & Rescue', '🛠️', 'Break an answer, then save it', 'One player sabotages, another rescues. The crowd judges the outcome.', 'quip', 3, 8, 1, 5),
  ('s-chain-reaction', 'slopcade', 'Brain Worm', '🧠', 'Build wild word-association chains', 'Players chain words and predict each other for points.', 'quip', 2, 8, 1, 6),
  ('s-quickfire-qa', 'slopcade', 'Speed Round', '⚡', 'Rapid-fire trivia for fast fingers', 'Answer quickly and accurately to stack points.', 'trivia', 2, 12, 1, 7),
  ('s-truth-trap', 'slopcade', 'Trust Issues', '🕵️', 'Find the real answer among fakes', 'One truth, many bluffs. Pick wisely and bluff harder.', 'fibbage', 3, 8, 1, 8),
  ('s-year-jinx', 'slopcade', 'All In', '🎰', 'Estimate numbers and wager confidence', 'Guess numeric facts and bet on how sure you are.', 'wager', 1, 8, 1, 9),
  ('s-drawful-animate', 'slopcade', 'Doodle Chaos', '🖍️', 'Draw weird prompts and guess them', 'Draw fast, guess faster, laugh hardest.', 'drawing', 3, 8, 1, 10),
  ('s-sketch-bluff', 'slopcade', 'Fake Art', '🖼️', 'Draw then bluff fake titles', 'Players draw prompts and write fake labels for others.', 'drawing', 3, 8, 1, 11),
  ('s-consensus-mine', 'slopcade', 'Hivemind', '🐝', 'Rank topics and match group vibes', 'Score by predicting how the group ranks each list.', 'ranking', 2, 10, 1, 12),
  ('s-heads-up', 'slopcade', 'On My Head', '🎯', 'Guess the word while friends clue you in', 'A word is on your head; friends give clues while you guess.', 'headsup', 2, 12, 1, 13);

-- ============================================================
-- Primary 8 games — full UX metadata + how_to_play_steps
-- ============================================================

UPDATE party_game_templates SET
  tagline = 'Write the most cursed answer and win the vote',
  format_tag = 'Fill-in-the-Blank',
  session_length = '~20 min',
  content_note = 'Meme-chaos, streamer-safe',
  how_to_play_steps = '[{"step":1,"title":"Prompt drops","body":"A fill-in-the-blank prompt hits the big screen for everyone.","panelImageUrl":null},{"step":2,"title":"Type your answer","body":"Write the funniest or most unhinged response on your phone.","panelImageUrl":null},{"step":3,"title":"Vote war","body":"All answers revealed. Vote for your favorite — can''t vote for yourself!","panelImageUrl":null},{"step":4,"title":"Clout points","body":"Most votes wins the round. Highest total score wins the game!","panelImageUrl":null}]'
WHERE id = 's-quiplash';

UPDATE party_game_templates SET
  tagline = 'Two players clash — the room picks who wins',
  format_tag = 'Fill-in-the-Blank',
  session_length = '~20 min',
  content_note = 'Head-to-head chaos',
  how_to_play_steps = '[{"step":1,"title":"Prompt drops","body":"A fill-in-the-blank prompt appears. Two players are secretly matched.","panelImageUrl":null},{"step":2,"title":"Write your best","body":"Each matched player writes their best response.","panelImageUrl":null},{"step":3,"title":"Face Off","body":"Both answers appear side by side. The room votes for the winner.","panelImageUrl":null},{"step":4,"title":"Winner takes all","body":"Win your matchup to earn points. Highest score wins!","panelImageUrl":null}]'
WHERE id = 's-half-and-half';

UPDATE party_game_templates SET
  tagline = 'Tell wild stories — guess who is capping',
  format_tag = 'Bluffing',
  session_length = '~25 min',
  content_note = 'Lying is an art form',
  how_to_play_steps = '[{"step":1,"title":"Story time","body":"One player tells a story. Is it real or pure cap?","panelImageUrl":null},{"step":2,"title":"Write your bluff","body":"Everyone else writes a convincing fake story.","panelImageUrl":null},{"step":3,"title":"Spot the truth","body":"All stories revealed — vote for which one is real.","panelImageUrl":null},{"step":4,"title":"Points for deception","body":"Score for fooling others or correctly spotting the truth.","panelImageUrl":null}]'
WHERE id = 's-about-you-bluff';

UPDATE party_game_templates SET
  tagline = 'Channel unhinged energy into absurd scenarios',
  format_tag = 'Roleplay',
  session_length = '~25 min',
  content_note = 'Internet brain required',
  how_to_play_steps = '[{"step":1,"title":"Get your scenario","body":"You receive a ridiculous situation and a character archetype.","panelImageUrl":null},{"step":2,"title":"Write in character","body":"Respond as that character would — go full method.","panelImageUrl":null},{"step":3,"title":"The room judges","body":"All responses revealed. Vote for peak main character energy.","panelImageUrl":null},{"step":4,"title":"Clout earned","body":"Most creative and committed responses win the most points.","panelImageUrl":null}]'
WHERE id = 's-role-replay';

UPDATE party_game_templates SET
  tagline = 'Break it. Then fix it. The crowd decides.',
  format_tag = 'Fill-in-the-Blank',
  session_length = '~20 min',
  content_note = 'Controlled chaos',
  how_to_play_steps = '[{"step":1,"title":"The setup","body":"A prompt appears. One player writes a solid answer.","panelImageUrl":null},{"step":2,"title":"Wreck it","body":"A second player ruins the answer on purpose. Maximum sabotage.","panelImageUrl":null},{"step":3,"title":"Rescue attempt","body":"A third player tries to rescue the mess into something brilliant.","panelImageUrl":null},{"step":4,"title":"The verdict","body":"The crowd votes: did the wrecker or rescuer win?","panelImageUrl":null}]'
WHERE id = 's-ruin-and-redeem';

UPDATE party_game_templates SET
  tagline = 'Link words — guess what chain your friends will make',
  format_tag = 'Word Association',
  session_length = '~15 min',
  content_note = 'Telepathy test',
  how_to_play_steps = '[{"step":1,"title":"Starting word","body":"A word appears on screen. Write the first thing it makes you think of.","panelImageUrl":null},{"step":2,"title":"Chain builds","body":"Each answer feeds the next — building an evolving chain.","panelImageUrl":null},{"step":3,"title":"Predict the link","body":"Guess what connections your friends made for match points.","panelImageUrl":null},{"step":4,"title":"Longest chain wins","body":"Most successful chain connections wins the round.","panelImageUrl":null}]'
WHERE id = 's-chain-reaction';

UPDATE party_game_templates SET
  tagline = 'Rapid-fire trivia — fast fingers, big points',
  format_tag = 'Trivia',
  session_length = '~15 min',
  content_note = 'Pop culture + random knowledge',
  how_to_play_steps = '[{"step":1,"title":"Questions fly","body":"Trivia questions appear on the big screen rapid-fire.","panelImageUrl":null},{"step":2,"title":"Buzz in","body":"Tap your phone fast when you know the answer.","panelImageUrl":null},{"step":3,"title":"Speed matters","body":"Faster correct answers earn more points. Wrong answers cost you.","panelImageUrl":null},{"step":4,"title":"Top scorer wins","body":"Most points after all questions wins Speed Round!","panelImageUrl":null}]'
WHERE id = 's-quickfire-qa';

UPDATE party_game_templates SET
  tagline = 'One answer is real — the rest are convincing fakes',
  format_tag = 'Bluffing',
  session_length = '~20 min',
  content_note = 'Trust no one',
  how_to_play_steps = '[{"step":1,"title":"A wild fact appears","body":"An obscure or bizarre statement appears on screen.","panelImageUrl":null},{"step":2,"title":"Write your bluff","body":"Write a fake answer designed to fool everyone.","panelImageUrl":null},{"step":3,"title":"Find the truth","body":"All answers revealed — including the real one. Vote wisely.","panelImageUrl":null},{"step":4,"title":"Score for deception","body":"Points for guessing correctly AND for every player your bluff fools.","panelImageUrl":null}]'
WHERE id = 's-truth-trap';

-- ============================================================
-- Secondary 5 games — tagline/format_tag/session_length/content_note only
-- ============================================================

UPDATE party_game_templates SET
  tagline = 'Bet big on your guesses',
  format_tag = 'Wager',
  session_length = '~20 min',
  content_note = 'Numbers + nerves'
WHERE id = 's-year-jinx';

UPDATE party_game_templates SET
  tagline = 'Draw first, explain never',
  format_tag = 'Drawing',
  session_length = '~25 min',
  content_note = 'Chaotic sketches'
WHERE id = 's-drawful-animate';

UPDATE party_game_templates SET
  tagline = 'Art is fake, confidence is real',
  format_tag = 'Drawing',
  session_length = '~25 min',
  content_note = 'Bluff the gallery'
WHERE id = 's-sketch-bluff';

UPDATE party_game_templates SET
  tagline = 'Think like the group or lose',
  format_tag = 'Ranking',
  session_length = '~20 min',
  content_note = 'Consensus meta-game'
WHERE id = 's-consensus-mine';

UPDATE party_game_templates SET
  tagline = 'Guess it before time runs out',
  format_tag = 'Charades',
  session_length = '~15 min',
  content_note = 'Fast party classic'
WHERE id = 's-heads-up';
