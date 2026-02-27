UPDATE party_game_templates SET is_active = 0
WHERE id NOT IN (
  'quiplash', 'truth-trap', 'drawful-animate',
  's-quiplash', 's-truth-trap', 's-drawful-animate'
);
