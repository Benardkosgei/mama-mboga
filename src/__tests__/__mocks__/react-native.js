// Minimal React Native stub for Jest (Node environment)
module.exports = {
  Platform: { OS: 'ios', select: (obj) => obj.ios ?? obj.default },
  StyleSheet: { create: (s) => s },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
};
