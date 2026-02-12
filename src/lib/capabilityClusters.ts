/**
 * Capability cluster mapping for fuzzy matching.
 *
 * The 30 survey capabilities are grouped into theme families.
 * If no exact capability match exists, a same-cluster match provides
 * a meaningful partial score (55% for primary, 40% for secondary).
 *
 * Cluster definitions are configurable — this file can be updated
 * when capability lists change without touching the matching engine.
 */

export interface CapabilityCluster {
  name: string;
  capabilities: string[];
}

/**
 * Capability clusters grouping the 30 capabilities into theme families.
 * Each capability should appear in exactly one cluster.
 */
export const CAPABILITY_CLUSTERS: CapabilityCluster[] = [
  {
    name: 'Communication',
    capabilities: [
      'Effective Communication',
      'Strategic Communication',
      'Stakeholder Management',
      'Assertiveness',
      'Active Listening',
      'Presenting & Public Speaking',
    ],
  },
  {
    name: 'Leadership',
    capabilities: [
      'Leadership & People Management',
      'Coaching & Developing Others',
      'Delegation & Empowerment',
      'Leading Through Change',
      'Influence Without Authority',
      'Executive Presence',
    ],
  },
  {
    name: 'Strategy & Execution',
    capabilities: [
      'Strategic Thinking & Execution',
      'Decision-Making Under Uncertainty',
      'Problem Solving & Analytical Thinking',
      'Prioritisation & Focus',
      'Business Acumen',
    ],
  },
  {
    name: 'Interpersonal & Emotional Intelligence',
    capabilities: [
      'Empathy',
      'Emotional Intelligence',
      'Conflict Resolution',
      'Building Trust & Relationships',
      'Giving & Receiving Feedback',
    ],
  },
  {
    name: 'Career & Growth',
    capabilities: [
      'Career Navigation & Growth',
      'Personal Branding & Visibility',
      'Networking & Relationship Building',
      'Resilience & Adaptability',
    ],
  },
  {
    name: 'Technical & Domain',
    capabilities: [
      'Domain Expertise',
      'Technical / Product Knowledge',
      'Data-Driven Decision Making',
      'Innovation & Creativity',
    ],
  },
  {
    name: 'Cross-Functional',
    capabilities: [
      'Cross-Functional Collaboration',
      'Managing Up',
      'Work–Life Balance & Wellbeing',
    ],
  },
];

/**
 * Lookup map: capability name (lowercased) → cluster name.
 * Built once at module load for O(1) lookups.
 */
const capabilityToCluster = new Map<string, string>();
for (const cluster of CAPABILITY_CLUSTERS) {
  for (const cap of cluster.capabilities) {
    capabilityToCluster.set(cap.toLowerCase(), cluster.name);
  }
}

/**
 * Get the cluster name for a given capability.
 * Returns undefined if the capability is not in any cluster.
 */
export function getClusterForCapability(capability: string): string | undefined {
  return capabilityToCluster.get(capability.toLowerCase());
}

/**
 * Check if two capabilities are in the same cluster.
 */
export function areSameCluster(cap1: string, cap2: string): boolean {
  const cluster1 = getClusterForCapability(cap1);
  const cluster2 = getClusterForCapability(cap2);
  return !!cluster1 && !!cluster2 && cluster1 === cluster2;
}
