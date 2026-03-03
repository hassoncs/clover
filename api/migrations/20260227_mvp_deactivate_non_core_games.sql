-- MVP launch: Keep only core game types active (Quiplash, Fibbage, Trivia, Drawful).
-- Deactivate all others until they have complete how-to-play steps and verified content.
UPDATE party_game_templates SET is_active = 0
WHERE id NOT IN (
  'quiplash', 'truth-trap', 'quickfire-qa', 'drawful-animate',
  's-quiplash', 's-truth-trap', 's-quickfire-qa', 's-drawful-animate'
);
