const en = {
  // ── Common ────────────────────────────────────────────────────────
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    done: 'Done',
    loading: 'Loading…',
    error: 'Something went wrong',
    retry: 'Retry',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    skip: 'Skip',
    or: 'or',
    yes: 'Yes',
    no: 'No',
    close: 'Close',
    share: 'Share',
    copy: 'Copy',
    copied: 'Copied!',
  },

  // ── Auth ──────────────────────────────────────────────────────────
  auth: {
    welcome_title: 'Your life,\nyour bucket list.',
    welcome_subtitle: 'Track what you want to do, share it with friends, do it for real.',
    sign_in: 'Sign in',
    sign_up: 'Create account',
    email: 'Email',
    password: 'Password',
    magic_link: 'Send magic link',
    magic_link_sent: 'Check your inbox ✉️',
    google: 'Continue with Google',
    no_account: "Don't have an account?",
    has_account: 'Already have an account?',
    forgot_password: 'Forgot password?',
    terms: 'By continuing you accept our Terms and Privacy Policy.',
  },

  // ── Navigation ────────────────────────────────────────────────────
  nav: {
    feed: 'Feed',
    explore: 'Explore',
    my_list: 'My List',
    notifications: 'Notifications',
    profile: 'Profile',
  },

  // ── Bucket items ──────────────────────────────────────────────────
  bucket: {
    new: 'New bucket item',
    title_placeholder: 'What do you want to do?',
    description_placeholder: 'Tell us more… (optional)',
    category: 'Category',
    deadline: 'Deadline',
    visibility: 'Visibility',
    location: 'Location',
    location_placeholder: 'Where? (optional)',
    public: 'Public',
    followers: 'Followers',
    private: 'Private',
    status_pending: 'Pending',
    status_in_progress: 'In progress',
    status_completed: 'Completed ✓',
    status_expired: 'Expired',
    status_archived: 'Archived',
    complete: 'Mark as done!',
    archive: 'Archive',
    delete_confirm: 'Delete this item? This cannot be undone.',
    copy_credit: 'Inspired by {{username}}',
    copy_action: 'I want to do this too',
    subtasks: 'Steps',
    add_subtask: 'Add a step',
    no_items: 'Your bucket list is empty',
    no_items_hint: 'Tap + to add your first item',
    filter_all: 'All',
    filter_pending: 'Pending',
    filter_in_progress: 'In progress',
    filter_completed: 'Completed',
    filter_expired: 'Expired',
    filter_archived: 'Archived',
    expires_in: 'Expires in {{days}}d',
    expired_on: 'Expired',
    completed_on: 'Done {{date}}',
  },

  // ── Completion flow ───────────────────────────────────────────────
  complete: {
    title: 'You did it! 🎉',
    subtitle: 'Add up to 3 photos from the moment',
    add_photo: 'Add photo',
    camera: 'Camera',
    gallery: 'Gallery',
    compressing: 'Optimizing…',
    uploading: 'Uploading…',
    celebrate_title: 'Done!',
    celebrate_subtitle: "Shared to your followers' feed",
    max_photos: 'Max 3 photos per item',
  },

  // ── Feed ──────────────────────────────────────────────────────────
  feed: {
    empty_title: 'Nothing here yet',
    empty_hint: 'Follow friends to see their completions',
    completed_bucket: 'completed a bucket item',
    new_bucket: 'added a new item',
    followed: 'started following',
  },

  // ── Social ────────────────────────────────────────────────────────
  social: {
    follow: 'Follow',
    following: 'Following',
    requested: 'Requested',
    unfollow: 'Unfollow',
    followers: 'Followers',
    following_count: 'Following',
    react: 'React',
    comment: 'Comment',
    comments_placeholder: 'Write a comment…',
    send: 'Send',
    no_comments: 'Be the first to comment',
  },

  // ── Notifications ─────────────────────────────────────────────────
  notifications: {
    empty: 'No notifications yet',
    mark_all_read: 'Mark all as read',
    reaction: '{{actor}} reacted {{emoji}} to your "{{title}}"',
    comment: '{{actor}} commented on "{{title}}"',
    follow: '{{actor}} started following you',
    follow_request: '{{actor}} wants to follow you',
    follow_accepted: '{{actor}} accepted your follow request',
    deadline_reminder: '"{{title}}" expires in {{days}} days',
    friend_completed: '{{actor}} completed "{{title}}"',
  },

  // ── Profile ───────────────────────────────────────────────────────
  profile: {
    edit: 'Edit profile',
    username: 'Username',
    display_name: 'Name',
    bio: 'Bio',
    bio_placeholder: 'Tell something about you…',
    storage: 'Storage used',
    storage_limit: 'of {{limit}}',
    storage_warning: 'You are using {{percent}}% of your storage.',
    delete_account: 'Delete account',
    delete_account_confirm: 'This will permanently delete your account and all your data. Type DELETE to confirm.',
    completed_items: 'Completed',
    total_items: 'Total items',
  },

  // ── Settings ──────────────────────────────────────────────────────
  settings: {
    title: 'Settings',
    language: 'Language',
    theme: 'Theme',
    theme_system: 'System',
    theme_light: 'Light',
    theme_dark: 'Dark',
    notifications: 'Notifications',
    privacy: 'Privacy',
    account: 'Account',
    sign_out: 'Sign out',
    sign_out_confirm: 'Are you sure you want to sign out?',
  },

  // ── Errors ────────────────────────────────────────────────────────
  errors: {
    network: 'No internet connection',
    quota_exceeded: 'Storage quota exceeded. Please delete some photos.',
    quota_warning: 'You have used {{percent}}% of your storage quota.',
    photo_too_large: 'Photo could not be compressed below 200 KB.',
    upload_failed: 'Upload failed. Please try again.',
    auth_failed: 'Authentication failed. Please try again.',
    username_taken: 'This username is already taken.',
  },

  // ── Design system (dev only) ──────────────────────────────────────
  design_system: {
    title: 'Design System',
    colors: 'Colors',
    typography: 'Typography',
    components: 'Components',
    buttons: 'Buttons',
    inputs: 'Inputs',
    cards: 'Cards',
    avatars: 'Avatars',
    badges: 'Badges',
    feedback: 'Feedback',
    dark_mode: 'Dark Mode',
    light_mode: 'Light Mode',
    toggle_theme: 'Toggle Theme',
  },
} as const;

export default en;
export type TranslationKeys = typeof en;
