// The mood words come from the campaign artwork. Families and descriptions
// guide browsing. Add verified notes, size, price, and an HTTPS checkout URL
// only after the business confirms those details.
const scents = [
  { id: "static", name: "Static", family: "bright", mood: "Cool, sharp, sleek", description: "A crisp, composed mood with the cool polish of a coastline at dusk." },
  { id: "velvet-rose", name: "Velvet Rose", family: "floral", mood: "Playful, bold, romantic", description: "A rose mood with a vivid streak of color, playful enough to wear in daylight." },
  { id: "worn-leather", name: "Worn Leather", family: "deep", mood: "Rich, grounded, timeless", description: "An inviting sense of depth, like a familiar leather jacket warmed by the late sun." },
  { id: "sunlit-skin", name: "Sunlit Skin", family: "warm", mood: "Warm, tropical, sun-kissed", description: "The feeling of warm light on bare skin, with an easy tropical glow." },
  { id: "anchor", name: "Anchor", family: "bright", mood: "Steady, sharp, cool", description: "A cool, steady mood with a sharp edge. Picture the air just as the sun slips below the water." },
  { id: "golden-hour-bloom", name: "Golden Hour Bloom", family: "floral", mood: "Radiant, feminine, unforgettable", description: "An open, radiant floral mood, like petals catching the last direct light of the afternoon." },
  { id: "midnight-spice", name: "Midnight Spice", family: "deep", mood: "Smoky, velvety, decadent", description: "A plush, smoky mood for the hour when the lights go low." },
  { id: "sugarplum", name: "Sugarplum", family: "warm", mood: "Dreamy, sweet, nostalgic", description: "A soft-focus sweet mood, with the nostalgia of opening a box of favorite childhood treats." },
  { id: "momentum", name: "Momentum", family: "bright", mood: "Bold, vibrant, electric", description: "A bright, high-energy mood with the warmth and movement of a sunlit coast." },
  { id: "iris-noir", name: "Iris Noir", family: "floral", mood: "Velvety, rich, mysterious", description: "A darker floral mood with a soft, velvety edge and a sense of intrigue." },
  { id: "wildfire", name: "Wildfire", family: "deep", mood: "Fiery, spicy, electric", description: "A vivid flash of warmth, full of the energy of sparks and peppery heat." },
  { id: "tropic-musk", name: "Tropic Musk", family: "warm", mood: "Earthy, sultry, exotic", description: "A sultry tropical mood grounded in earthiness, like stepping from sunlight into shade." },
  { id: "untamed", name: "Untamed", family: "bright", mood: "Wild, warm, free", description: "A free-spirited mood that recalls the warmth and green edges of a sunlit garden." },
  { id: "soft-pulse", name: "Soft Pulse", family: "floral", mood: "Soft, intimate, warm", description: "A quiet, intimate floral mood with a gentle warmth that feels close to the skin." },
  { id: "after-hours", name: "After Hours", family: "deep", mood: "Dark, creamy, sultry", description: "A dark, creamy mood with the slow warmth of a room lit only by lanterns." },
  { id: "self-made", name: "Self-Made", family: "warm", mood: "Steady, golden, grounded", description: "A golden warmth with a grounded character and an unhurried sense of confidence." }
];
