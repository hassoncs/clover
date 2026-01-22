// Registry for Parallax Demo assets
// Maps themeId -> depth -> require(asset)

const PARALLAX_ASSETS: Record<string, Record<string, number>> = {
  desert: {
    sky: require('./parallax-themes/desert-layers/desert-1.png'),
    far: require('./parallax-themes/desert-layers/desert-2.png'),
    mid: require('./parallax-themes/desert-layers/desert-3.png'),
    near: require('./parallax-themes/desert-layers/desert-4.png'),
  },
  forest: {
    sky: require('./parallax-themes/forest-layers/forest-1.png'),
    far: require('./parallax-themes/forest-layers/forest-2.png'),
    mid: require('./parallax-themes/forest-layers/forest-3.png'),
    near: require('./parallax-themes/forest-layers/forest-4.png'),
  },
  'mountain-sky': {
    sky: require('./parallax-themes/mountain-sky-layers/mountain-sky-1.png'),
    far: require('./parallax-themes/mountain-sky-layers/mountain-sky-2.png'),
    mid: require('./parallax-themes/mountain-sky-layers/mountain-sky-3.png'),
  },
  ocean: {
    sky: require('./parallax-themes/ocean-layers/ocean-1.png'),
    far: require('./parallax-themes/ocean-layers/ocean-2.png'),
    mid: require('./parallax-themes/ocean-layers/ocean-3.png'),
  },
  cyberpunk: {
    sky: require('./parallax-themes/cyberpunk-layers/cyberpunk-1.png'),
    far: require('./parallax-themes/cyberpunk-layers/cyberpunk-2.png'),
    mid: require('./parallax-themes/cyberpunk-layers/cyberpunk-3.png'),
    near: require('./parallax-themes/cyberpunk-layers/cyberpunk-4.png'),
  },
  sunset: {
    sky: require('./parallax-themes/sunset-layers/sunset-1.png'),
    far: require('./parallax-themes/sunset-layers/sunset-2.png'),
    mid: require('./parallax-themes/sunset-layers/sunset-3.png'),
    near: require('./parallax-themes/sunset-layers/sunset-4.png'),
  },
};

export default PARALLAX_ASSETS;
