# Architectural Decisions

## 1. Albums vs Shared Lists
The original schema included `shared_lists` and `shared_list_members`. The new design requires `albums`, `album_items` and `album_members`.
To avoid conceptual duplication, we decided to drop `shared_lists` and `shared_list_members` and replace them entirely with `albums`.
Albums serve dual purposes:
1. Personal organization (folders for a user's own buckets)
2. Social sharing (if `is_shared` is true, members can be invited to view/collaborate)

## 2. Playfair Display Loading
We are using `expo-google-fonts/playfair-display` loaded directly in `_layout.tsx` alongside Inter. We only load weights 600 and 700 to keep the bundle size small.

## 3. TabBar Customization
Instead of building a completely custom component for the TabBar, we opted to use Expo Router's native `tabBarStyle` and `tabBarItemStyle` to achieve the design requirements. We added the absolute positioned 28x3px gold active indicator bar directly in the `tabBarIcon` render function. This approach gives us the design we want without sacrificing the performance and accessibility of the native Bottom Navigation.
