const { withGradleProperties, withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Pin Gradle wrapper to 8.6 and AGP to 8.3.2 for compatibility with
 * React Native 0.74 and Expo SDK 51.
 */
const withGradleVersion = (config) => {
  // Fix gradle-wrapper.properties
  config = withGradleProperties(config, (config) => {
    config.modResults = config.modResults.map((item) => {
      if (item.key === 'distributionUrl') {
        return {
          ...item,
          value: 'https\\://services.gradle.org/distributions/gradle-8.8-all.zip',
        };
      }
      return item;
    });
    return config;
  });

  // Pin AGP version in build.gradle
  config = withProjectBuildGradle(config, (config) => {
    config.modResults.contents = config.modResults.contents.replace(
      "classpath('com.android.tools.build:gradle')",
      "classpath('com.android.tools.build:gradle:8.3.2')"
    );
    return config;
  });

  return config;
};

module.exports = withGradleVersion;
