-- Add UX metadata fields to party_game_templates for Jackbox-style game selection screen
ALTER TABLE party_game_templates ADD COLUMN tagline TEXT;
ALTER TABLE party_game_templates ADD COLUMN format_tag TEXT;
ALTER TABLE party_game_templates ADD COLUMN session_length TEXT;
ALTER TABLE party_game_templates ADD COLUMN content_note TEXT;
ALTER TABLE party_game_templates ADD COLUMN thumbnail_url TEXT;
ALTER TABLE party_game_templates ADD COLUMN hero_image_url TEXT;
ALTER TABLE party_game_templates ADD COLUMN how_to_play_steps TEXT; -- JSON array of {step, title, body, panelImageUrl}

-- ============================================================
-- Primary 8 games — full metadata + how_to_play_steps
-- ============================================================

UPDATE party_game_templates SET
  tagline = 'Write the funniest answer your fellowship will vote for',
  format_tag = 'Fill-in-the-Blank',
  session_length = '~20 min',
  content_note = 'Safe for all ages',
  how_to_play_steps = '[{"step":1,"title":"A prompt appears","body":"A fill-in-the-blank question appears on the big screen for everyone to see.","panelImageUrl":null},{"step":2,"title":"Write your answer","body":"Each player writes the funniest (and cleanest!) answer they can think of on their phone.","panelImageUrl":null},{"step":3,"title":"Everyone votes","body":"All answers are revealed. Vote for your favorite — you can''t vote for your own!","panelImageUrl":null},{"step":4,"title":"Points for popularity","body":"The answer with the most votes wins the round. Most points after all rounds wins!","panelImageUrl":null}]'
WHERE id = 'quiplash';

UPDATE party_game_templates SET
  tagline = 'Two answers face off — the room picks the winner',
  format_tag = 'Fill-in-the-Blank',
  session_length = '~20 min',
  content_note = 'Safe for all ages',
  how_to_play_steps = '[{"step":1,"title":"A prompt appears","body":"A fill-in-the-blank prompt appears on screen. Two players are secretly matched against each other.","panelImageUrl":null},{"step":2,"title":"Write your answer","body":"Each player writes their best answer on their phone.","panelImageUrl":null},{"step":3,"title":"Head to head","body":"The two matched answers are revealed side by side. The rest of the room votes for their favorite.","panelImageUrl":null},{"step":4,"title":"Winner takes points","body":"Points go to the player who won their matchup. Highest score after all rounds wins!","panelImageUrl":null}]'
WHERE id = 'half-and-half';

UPDATE party_game_templates SET
  tagline = 'Real stories, crafted tales — can you tell the difference?',
  format_tag = 'Bluffing',
  session_length = '~25 min',
  content_note = 'Safe for all ages',
  how_to_play_steps = '[{"step":1,"title":"Share or invent","body":"One player shares a personal story. Is it a real testimony or a crafted tale?","panelImageUrl":null},{"step":2,"title":"Everyone writes a bluff","body":"Other players write convincing fake stories to try to fool the group.","panelImageUrl":null},{"step":3,"title":"Pick the truth","body":"All stories are revealed — players vote for which one they think is real.","panelImageUrl":null},{"step":4,"title":"Score for fooling","body":"Points go to players who fooled others, and to the storyteller if no one guessed correctly.","panelImageUrl":null}]'
WHERE id = 'about-you-bluff';

UPDATE party_game_templates SET
  tagline = 'Embody love, joy, peace, patience — and make the room laugh',
  format_tag = 'Roleplay',
  session_length = '~25 min',
  content_note = 'Safe for all ages',
  how_to_play_steps = '[{"step":1,"title":"Get your scenario","body":"Each player receives a scenario and a fruit of the Spirit to embody (love, joy, peace, patience…).","panelImageUrl":null},{"step":2,"title":"Write your response","body":"How would someone acting with that virtue respond? Write it on your phone.","panelImageUrl":null},{"step":3,"title":"The room votes","body":"All responses are revealed. Vote for the one that best captures the spirit.","panelImageUrl":null},{"step":4,"title":"Points for virtue","body":"The most virtuous — and most creative — responses earn the most points!","panelImageUrl":null}]'
WHERE id = 'role-replay';

UPDATE party_game_templates SET
  tagline = 'Sabotage an answer. Then someone saves it with grace.',
  format_tag = 'Fill-in-the-Blank',
  session_length = '~20 min',
  content_note = 'Safe for all ages',
  how_to_play_steps = '[{"step":1,"title":"The setup","body":"A prompt appears. One player writes a good answer — then another player ruins it on purpose!","panelImageUrl":null},{"step":2,"title":"Redemption time","body":"A third player tries to redeem the ruined answer and make it something great again.","panelImageUrl":null},{"step":3,"title":"The room judges","body":"Players vote: was the redemption successful, or did the ruiner win?","panelImageUrl":null},{"step":4,"title":"Score by outcome","body":"Points go to whoever the room sides with — the ruiner or the redeemer.","panelImageUrl":null}]'
WHERE id = 'ruin-and-redeem';

UPDATE party_game_templates SET
  tagline = 'Link words together — guess the chain your friends will make',
  format_tag = 'Word Association',
  session_length = '~15 min',
  content_note = 'Safe for all ages',
  how_to_play_steps = '[{"step":1,"title":"Start the chain","body":"A word appears on screen. Players must write the first word that comes to mind.","panelImageUrl":null},{"step":2,"title":"Chains form","body":"Each player''s answer feeds into the next — forming a chain of associations.","panelImageUrl":null},{"step":3,"title":"Guess the links","body":"Can you predict what word your friends connected to? Points for matching!","panelImageUrl":null},{"step":4,"title":"Longest chain wins","body":"The player who makes the most successful chain connections wins the round.","panelImageUrl":null}]'
WHERE id = 'chain-reaction';

UPDATE party_game_templates SET
  tagline = 'Rapid-fire trivia — answer fast, answer right, earn glory',
  format_tag = 'Trivia',
  session_length = '~15 min',
  content_note = 'Safe for all ages · Biblical & general knowledge',
  how_to_play_steps = '[{"step":1,"title":"Questions fire fast","body":"Biblical trivia questions appear on the big screen one after another.","panelImageUrl":null},{"step":2,"title":"Buzz in quickly","body":"Tap your phone as fast as you can when you know the answer!","panelImageUrl":null},{"step":3,"title":"Speed matters","body":"Faster correct answers earn more points. Wrong answers may cost you.","panelImageUrl":null},{"step":4,"title":"Most points wins","body":"The player with the most points after all questions wins the Hall of Wisdom!","panelImageUrl":null}]'
WHERE id = 'quickfire-qa';

UPDATE party_game_templates SET
  tagline = 'One answer is true — the rest are convincing bluffs',
  format_tag = 'Bluffing',
  session_length = '~20 min',
  content_note = 'Safe for all ages · Discernment required',
  how_to_play_steps = '[{"step":1,"title":"An obscure fact appears","body":"A surprising Biblical or historical statement appears on screen.","panelImageUrl":null},{"step":2,"title":"Write a convincing bluff","body":"Each player writes a fake answer designed to fool the group.","panelImageUrl":null},{"step":3,"title":"Spot the truth","body":"All answers — including the real one — are revealed. Vote for which you think is true.","panelImageUrl":null},{"step":4,"title":"Discern and score","body":"Points for guessing correctly, and for every player your bluff fools.","panelImageUrl":null}]'
WHERE id = 'truth-trap';

-- ============================================================
-- Secondary 5 games — tagline/format_tag/session_length/content_note only
-- ============================================================

UPDATE party_game_templates SET
  tagline = 'Wager your points on how confident you are',
  format_tag = 'Wager',
  session_length = '~20 min',
  content_note = 'Safe for all ages'
WHERE id = 'year-jinx';

UPDATE party_game_templates SET
  tagline = 'Draw a Biblical scene — can anyone guess what you drew?',
  format_tag = 'Drawing',
  session_length = '~25 min',
  content_note = 'Safe for all ages'
WHERE id = 'drawful-animate';

UPDATE party_game_templates SET
  tagline = 'Draw it, then bluff your way past the other artists',
  format_tag = 'Drawing',
  session_length = '~25 min',
  content_note = 'Safe for all ages'
WHERE id = 'sketch-bluff';

UPDATE party_game_templates SET
  tagline = 'Rank the same things — score by matching the group',
  format_tag = 'Ranking',
  session_length = '~20 min',
  content_note = 'Safe for all ages'
WHERE id = 'consensus-mine';

UPDATE party_game_templates SET
  tagline = 'A name is on your head — your friends give the clues',
  format_tag = 'Charades',
  session_length = '~15 min',
  content_note = 'Safe for all ages'
WHERE id = 'heads-up';
