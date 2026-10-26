# Changelog

All notable changes to **TheBucketList** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-26

### Added
- **My List & Albums**: Goal and bucket list task management, custom albums, milestones, progress tracking, and multiple view modes (compact, list, gallery).
- **Feed & Social Moments**: Friends feed, explore ideas feed, interactive likes, saved moments, and collection grouping.
- **Interactive Map**: Map view displaying the destinations and locations added to your bucket list items (manual place entry, zero background GPS tracking).
- **Offline Persistence**: Local storage persistence via AsyncStorage for reliable access and smooth navigation.
- **Multi-language Support**: Complete localization in Spanish and English with runtime language switching.
- **Push Notifications**: Expo notifications integration with background delivery and reminder scheduler.
- **Customization & Design**: Dark and Light themes with gold accents, personalized tags with custom emojis, and customizable sorting.

### Security & Privacy
- Zero-permission photo picker integration via Android Photo Picker and iOS PHPicker.
- Explicit blocking of broad media (`READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_AUDIO`, `READ_MEDIA_VISUAL_USER_SELECTED`), storage, and overlay permissions to comply with Google Play policies.
- Public legal documentation for Privacy Policy, Terms of Service, and Account Deletion.
