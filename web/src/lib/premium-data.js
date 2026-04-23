export const tiers = [
  {
    tier: 0,
    title: "Free",
    description: "For small communities",
    price: { mo: "0", yr: "0" },
    features: [
      { text: "5 Feed Monitors" },
      { text: "20 min Refresh Rate" },
      { text: "1 Target Channel" },
      { text: "1 Ping Role" },
      { text: "Bulk Actions (All)", disabled: true },
      { text: "Language & Genre Filters", disabled: true },
      { text: "Crypto & Repost Mon.", disabled: true },
      { text: "Custom Alert Templates", disabled: true }
    ]
  },
  {
    tier: 1,
    title: "Scout",
    description: "Getting serious",
    price: { mo: "3.99", yr: "39" },
    isPopular: false,
    features: [
      { text: "25 Feed Monitors" },
      { text: "2 min Refresh Rate" },
      { text: "5 Target Channels" },
      { text: "5 Ping Roles" },
      { text: "Bulk Actions (All)" },
      { text: "Language & Genre Filters" },
      { text: "Crypto & Repost Mon." },
      { text: "Custom Alert Templates" }
    ]
  },
  {
    tier: 2,
    title: "Operator",
    description: "Power user favorite",
    price: { mo: "7.99", yr: "79" },
    isPopular: true,
    features: [
      { text: "50 Feed Monitors" },
      { text: "2 min Refresh Rate" },
      { text: "10 Target Channels" },
      { text: "10 Ping Roles" },
      { text: "Bulk Actions (All)" },
      { text: "Language & Genre Filters" },
      { text: "Crypto & Repost Mon." },
      { text: "Custom Alert Templates" }
    ]
  },
  {
    tier: 3,
    title: "Architect",
    description: "The ultimate control",
    price: { mo: "14.99", yr: "149" },
    isPopular: false,
    features: [
      { text: "100 Feed Monitors" },
      { text: "2 min Refresh Rate" },
      { text: "15 Target Channels" },
      { text: "15 Ping Roles" },
      { text: "Bulk Actions (All)" },
      { text: "Language & Genre Filters" },
      { text: "Crypto & Repost Mon." },
      { text: "Custom Alert Templates" }
    ]
  }
];
