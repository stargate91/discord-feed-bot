export const tiers = [
  {
    tier: 0,
    title: "Free",
    description: "For small hobby projects",
    price: { mo: "0", yr: "0" },
    features: [
      { text: "2 Feed Monitors" },
      { text: "20 min Refresh Rate" },
      { text: "3 Days Analytics" },
      { text: "NovaFeeds Branding" },
      { text: "Repost Tool", disabled: true },
      { text: "Turbo Speed (2m)", disabled: true },
      { text: "Priority Support", disabled: true }
    ]
  },
  {
    tier: 1,
    title: "Starter",
    description: "Remove the noise",
    price: { mo: "4.99", yr: "49" },
    isPopular: false,
    features: [
      { text: "10 Feed Monitors" },
      { text: "10 min Refresh Rate" },
      { text: "Remove Branding", highlight: true },
      { text: "7 Days Analytics" },
      { text: "Basic Diagnostic Tools" },
      { text: "Repost Tool", disabled: true },
      { text: "Turbo Speed (2m)", disabled: true }
    ]
  },
  {
    tier: 2,
    title: "Professional",
    description: "The sweet spot for growth",
    price: { mo: "9.99", yr: "99" },
    isPopular: true,
    features: [
      { text: "30 Feed Monitors" },
      { text: "5 min Refresh Rate" },
      { text: "Unlock Repost Tool", highlight: true },
      { text: "30 Days Analytics" },
      { text: "Custom Alert Branding" },
      { text: "Remove Branding" },
      { text: "Turbo Speed (2m)", disabled: true }
    ]
  },
  {
    tier: 3,
    title: "Ultimate",
    description: "Unrivaled power & speed",
    price: { mo: "19.99", yr: "199" },
    isPopular: false,
    features: [
      { text: "100 Feed Monitors", highlight: true },
      { text: "2 min Turbo Refresh", highlight: true },
      { text: "Full Diagnostic Suite (100 Purge)" },
      { text: "Lifetime Analytics" },
      { text: "Priority Support" },
      { text: "Unlock Repost Tool" },
      { text: "Custom Branding" }
    ]
  }
];
