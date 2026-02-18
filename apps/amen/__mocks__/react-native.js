const React = require('react');

module.exports = {
  Platform: {
    OS: 'web',
    select: (obj) => obj.web,
  },
  View: ({ children, ...props }) => React.createElement('div', props, children),
  Text: ({ children, ...props }) => React.createElement('span', props, children),
  Pressable: ({ children, ...props }) => React.createElement('button', props, children),
  ActivityIndicator: (props) => React.createElement('div', { ...props, 'data-testid': 'activity-indicator' }),
  StyleSheet: {
    create: (styles) => styles,
    flatten: (styles) => styles,
  },
};
