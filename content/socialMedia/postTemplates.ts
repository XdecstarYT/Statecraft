/**
 * Pre-authored Chirp post templates, grouped by what triggered them.
 * Slots use {curlyBrace} placeholders filled in by
 * engine/systems/socialMedia.ts's fillTemplate — plain string substitution,
 * no runtime generation.
 */
export type PostCategory =
  | 'crisis'
  | 'scandal'
  | 'war'
  | 'court_struck'
  | 'court_upheld'
  | 'approval_high'
  | 'approval_low'
  | 'ambient';

export const POST_TEMPLATES: Record<PostCategory, string[]> = {
  crisis: [
    'BREAKING: {title}. Developing story.',
    "Can't believe this is actually happening — {title}.",
    '{title}. Thread below. 🧵',
    'This is going to dominate the news cycle: {title}',
    'My take on {title}: this was always coming.',
    'Everyone talking about {title} right now.',
  ],
  scandal: [
    'Sources confirm a scandal is brewing around {politicianName}. More as this develops.',
    "So {politicianName} thought nobody would notice? Sure.",
    'The timeline on the {politicianName} story does not add up. Someone explain this.',
    'Not defending {politicianName} on this one.',
    "Everyone's talking about {politicianName} tonight and it isn't good.",
  ],
  war: [
    'War has been declared against {counterpartName}. God help us all.',
    'Woke up to the news about {counterpartName}. Praying for everyone affected.',
    'The {counterpartName} situation just escalated. This is serious.',
    'Markets are already reacting to the news on {counterpartName}.',
    'History will remember how we handled {counterpartName}.',
  ],
  court_struck: [
    'The court just struck down "{billTitle}." Huge development.',
    'Rule of law wins again — "{billTitle}" ruled unconstitutional.',
    "Well, that's that. \"{billTitle}\" is dead on arrival after today's ruling.",
    'Never thought the bench would actually strike down "{billTitle}," but here we are.',
  ],
  court_upheld: [
    'Court upheld "{billTitle}." No surprises there.',
    '"{billTitle}" survives its legal challenge. Big win for the government.',
    'The bench sided with the legislature on "{billTitle}" today.',
  ],
  approval_high: [
    'Say what you want, {playerName} is having a moment right now.',
    "Approval numbers for {playerName} looking strong this week.",
    "Not usually a fan but {playerName} has been solid lately.",
    '{playerName} riding high in the polls. Deserved or not, discuss.',
  ],
  approval_low: [
    "Rough week for {playerName}, and it shows in the numbers.",
    '{playerName} approval cratering. How much longer can this go on?',
    "Even the base is getting restless with {playerName}.",
    'Hard to see how {playerName} turns this around at this point.',
  ],
  ambient: [
    'Genuinely exhausted by politics this week. Anyone else?',
    'Unpopular opinion: most of this news cycle is noise.',
    'Watching the markets today like 👀',
    'Rewatched the last debate. Still thinking about it.',
    'The discourse today is unhinged, as usual.',
    'Nobody is talking about the actual policy details and it shows.',
    'Local diner has better political analysis than half the pundits tbh.',
    'Coffee, news, repeat. Living the dream.',
    'Just here for the chaos honestly.',
    'Every single day it is something with this government.',
  ],
};
